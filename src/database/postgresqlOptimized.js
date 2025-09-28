/**
 * Optimized PostgreSQL Manager for RaikuRevolt
 * Uses PostgreSQL as high-performance cache with advanced optimizations
 * No external caching services required
 */

import pkg from 'pg';
const { Pool } = pkg;

export class OptimizedPostgreSQLManager {
    constructor(logger, metricsCollector) {
        this.logger = logger;
        this.metrics = metricsCollector;
        this.pool = null;
        this.isConnected = false;
        
        // Prepared statement cache
        this.preparedStatements = new Map();
        
        // Query result cache (in-memory for frequently accessed data)
        this.queryCache = new Map();
        this.cacheConfig = {
            maxSize: 1000,
            ttl: 5 * 60 * 1000, // 5 minutes
            cleanupInterval: 60 * 1000 // 1 minute
        };
        
        // Optimized connection configuration
        this.config = {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            
            // Optimized pool settings for 1000+ users
            max: 30,                    // Increased from 10 to 30
            min: 5,                     // Minimum connections
            idleTimeoutMillis: 30000,   // 30 seconds
            connectionTimeoutMillis: 5000, // 5 seconds
            maxUses: 7500,              // Max uses per connection
            
            // PostgreSQL-specific optimizations
            application_name: 'raikurevolt_bot',
            statement_timeout: 30000,   // 30 seconds
            query_timeout: 30000,       // 30 seconds
            idle_in_transaction_session_timeout: 60000, // 1 minute
            
            // Connection optimization
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        };
        
        this.startCacheCleanup();
    }

    async connect() {
        try {
            this.logger.info('🔌 Connecting to optimized PostgreSQL...');
            
            this.pool = new Pool(this.config);
            
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            // Setup connection event handlers
            this.setupEventHandlers();
            
            // Create optimized indexes and views
            await this.createOptimizedStructures();
            
            this.isConnected = true;
            this.logger.info('✅ Connected to optimized PostgreSQL');
            
            return true;
        } catch (error) {
            this.logger.error('❌ PostgreSQL connection failed:', error.message);
            return false;
        }
    }

    setupEventHandlers() {
        this.pool.on('connect', (client) => {
            this.logger.debug('🔗 New PostgreSQL client connected');
            
            // Optimize client settings
            client.query(`
                SET work_mem = '16MB';
                SET maintenance_work_mem = '64MB';
                SET effective_cache_size = '1GB';
                SET random_page_cost = 1.1;
                SET seq_page_cost = 1.0;
            `).catch(err => this.logger.warn('Failed to optimize client settings:', err));
        });

        this.pool.on('error', (err) => {
            this.logger.error('❌ PostgreSQL pool error:', err);
            this.metrics.recordError('postgresql_pool_error', 'high', 'database');
        });

        this.pool.on('remove', () => {
            this.logger.debug('🔌 PostgreSQL client removed from pool');
        });
    }

    // Create optimized database structures
    async createOptimizedStructures() {
        try {
            // Create materialized views for expensive queries
            await this.query(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_cache AS
                SELECT 
                    user_id,
                    username,
                    level,
                    total_damage,
                    loyalty_score,
                    ROW_NUMBER() OVER (ORDER BY total_damage DESC) as rank
                FROM rebels 
                WHERE last_active > NOW() - INTERVAL '30 days'
                ORDER BY total_damage DESC
                LIMIT 100;
            `);

            // Create index on materialized view
            await this.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_cache_user_id 
                ON leaderboard_cache (user_id);
            `);

            // Create session cache table
            await this.query(`
                CREATE TABLE IF NOT EXISTS session_cache (
                    user_id VARCHAR(20) PRIMARY KEY,
                    session_data JSONB NOT NULL,
                    last_activity TIMESTAMP DEFAULT NOW(),
                    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour')
                );
            `);

            // Create indexes for session cache
            await this.query(`
                CREATE INDEX IF NOT EXISTS idx_session_cache_expires 
                ON session_cache (expires_at);
                
                CREATE INDEX IF NOT EXISTS idx_session_cache_activity 
                ON session_cache (last_activity);
            `);

            // Create query result cache table
            await this.query(`
                CREATE TABLE IF NOT EXISTS query_cache (
                    cache_key VARCHAR(255) PRIMARY KEY,
                    result_data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    expires_at TIMESTAMP NOT NULL
                );
            `);

            // Create index for query cache
            await this.query(`
                CREATE INDEX IF NOT EXISTS idx_query_cache_expires 
                ON query_cache (expires_at);
            `);

            this.logger.info('✅ Optimized database structures created');
        } catch (error) {
            this.logger.error('❌ Failed to create optimized structures:', error);
        }
    }

    // Optimized query method with caching
    async query(text, params = []) {
        const startTime = Date.now();
        
        try {
            // Check in-memory cache first for SELECT queries
            if (text.trim().toUpperCase().startsWith('SELECT')) {
                const cacheKey = this.generateCacheKey(text, params);
                const cached = this.queryCache.get(cacheKey);
                
                if (cached && cached.expires > Date.now()) {
                    this.metrics.recordEvent('query_cache_hit', 'success', 'postgresql');
                    return cached.result;
                }
            }
            
            const result = await this.pool.query(text, params);
            const duration = Date.now() - startTime;
            
            // Cache SELECT query results
            if (text.trim().toUpperCase().startsWith('SELECT') && result.rows.length > 0) {
                this.cacheQueryResult(text, params, result);
            }
            
            this.metrics.recordEvent('database_query', 'success', 'postgresql', { duration });
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Database query error:', error);
            this.metrics.recordError('database_query_error', 'medium', 'postgresql', { duration });
            throw error;
        }
    }

    // Prepared statement execution
    async executePrepared(name, text, params = []) {
        const startTime = Date.now();
        
        try {
            const client = await this.pool.connect();
            
            // Prepare statement if not already prepared
            if (!this.preparedStatements.has(name)) {
                await client.query(`PREPARE ${name} AS ${text}`);
                this.preparedStatements.set(name, true);
            }
            
            const result = await client.query(`EXECUTE ${name}`, params);
            client.release();
            
            const duration = Date.now() - startTime;
            this.metrics.recordEvent('prepared_statement', 'success', 'postgresql', { duration });
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Prepared statement error:', error);
            this.metrics.recordError('prepared_statement_error', 'medium', 'postgresql', { duration });
            throw error;
        }
    }

    // Batch operations for better performance
    async batchInsert(table, columns, rows) {
        if (rows.length === 0) return;
        
        const startTime = Date.now();
        
        try {
            const placeholders = rows.map((_, i) => 
                `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
            ).join(', ');
            
            const values = rows.flat();
            const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
            
            const result = await this.query(query, values);
            const duration = Date.now() - startTime;
            
            this.logger.info(`📊 Batch insert: ${rows.length} rows in ${duration}ms`);
            return result;
        } catch (error) {
            this.logger.error('Batch insert error:', error);
            throw error;
        }
    }

    // Session management
    async setSession(userId, sessionData, ttlMinutes = 60) {
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
        
        await this.query(`
            INSERT INTO session_cache (user_id, session_data, expires_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                session_data = $2,
                last_activity = NOW(),
                expires_at = $3
        `, [userId, JSON.stringify(sessionData), expiresAt]);
    }

    async getSession(userId) {
        const result = await this.query(`
            SELECT session_data 
            FROM session_cache 
            WHERE user_id = $1 AND expires_at > NOW()
        `, [userId]);
        
        if (result.rows.length > 0) {
            // Update last activity
            await this.query(`
                UPDATE session_cache 
                SET last_activity = NOW() 
                WHERE user_id = $1
            `, [userId]);
            
            return JSON.parse(result.rows[0].session_data);
        }
        
        return null;
    }

    // Leaderboard caching
    async refreshLeaderboardCache() {
        try {
            await this.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache');
            this.logger.info('✅ Leaderboard cache refreshed');
        } catch (error) {
            this.logger.error('❌ Failed to refresh leaderboard cache:', error);
        }
    }

    async getCachedLeaderboard() {
        const result = await this.query(`
            SELECT user_id, username, level, total_damage, loyalty_score, rank
            FROM leaderboard_cache
            ORDER BY rank
        `);
        
        return result.rows;
    }

    // Cache management
    generateCacheKey(query, params) {
        return `${query}:${JSON.stringify(params)}`.replace(/\s+/g, ' ').trim();
    }

    cacheQueryResult(query, params, result) {
        if (this.queryCache.size >= this.cacheConfig.maxSize) {
            // Remove oldest entries
            const entries = Array.from(this.queryCache.entries());
            entries.sort((a, b) => a[1].created - b[1].created);
            
            for (let i = 0; i < Math.floor(this.cacheConfig.maxSize * 0.1); i++) {
                this.queryCache.delete(entries[i][0]);
            }
        }
        
        const cacheKey = this.generateCacheKey(query, params);
        this.queryCache.set(cacheKey, {
            result,
            created: Date.now(),
            expires: Date.now() + this.cacheConfig.ttl
        });
    }

    startCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache();
            this.cleanupExpiredSessions();
        }, this.cacheConfig.cleanupInterval);
    }

    cleanupExpiredCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.queryCache) {
            if (entry.expires < now) {
                this.queryCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.logger.debug(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
    }

    async cleanupExpiredSessions() {
        try {
            const result = await this.query(`
                DELETE FROM session_cache 
                WHERE expires_at < NOW()
            `);
            
            if (result.rowCount > 0) {
                this.logger.debug(`🧹 Cleaned ${result.rowCount} expired sessions`);
            }
        } catch (error) {
            this.logger.error('Failed to cleanup expired sessions:', error);
        }
    }

    // Health check
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as timestamp, version() as version');
            const poolStats = {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            };
            
            return {
                status: 'healthy',
                timestamp: result.rows[0].timestamp,
                version: result.rows[0].version,
                pool: poolStats,
                cache: {
                    size: this.queryCache.size,
                    maxSize: this.cacheConfig.maxSize
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            this.logger.info('🔌 Disconnected from PostgreSQL');
        }
    }
}

export default OptimizedPostgreSQLManager;
