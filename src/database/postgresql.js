/**
 * PostgreSQL Database Manager
 * Handles Render PostgreSQL connection, schema management, and data operations
 * Replaces MongoDB with PostgreSQL for full Render hosting solution
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';

// Load environment variables
config();

export class PostgreSQLManager {
    constructor(logger, metricsCollector, errorTracker) {
        this.logger = logger;
        this.metrics = metricsCollector;
        this.errorTracker = errorTracker;

        this.pool = null;
        this.isConnected = false;

        // 🚀 ULTIMATE OPTIMIZATION: Supercharged database configuration
        this.config = {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

            // 🔥 SUPERCHARGED POOL SETTINGS for 10,000+ users
            max: 50,                    // Increased from 10 to 50 connections
            min: 10,                    // Minimum connections always ready
            idleTimeoutMillis: 30000,   // 30 seconds
            connectionTimeoutMillis: 5000, // 5 seconds
            maxUses: 7500,              // Max uses per connection before refresh

            // 🎯 POSTGRESQL PERFORMANCE OPTIMIZATIONS
            application_name: 'raikurevolt_supercharged',
            statement_timeout: 30000,   // 30 seconds
            query_timeout: 30000,       // 30 seconds
            idle_in_transaction_session_timeout: 60000, // 1 minute

            // ⚡ CONNECTION OPTIMIZATION
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        };

        // 🧠 PREPARED STATEMENTS CACHE for ultra-fast queries
        this.preparedStatements = new Map();

        // 💾 INTELLIGENT QUERY RESULT CACHE
        this.queryCache = new Map();
        this.cacheConfig = {
            maxSize: 2000,              // Cache up to 2000 query results
            ttl: 5 * 60 * 1000,        // 5 minutes TTL
            cleanupInterval: 60 * 1000  // Cleanup every minute
        };

        // 📦 BATCH OPERATION QUEUES for maximum efficiency
        this.batchQueues = {
            userUpdates: [],
            inventoryUpdates: [],
            achievementUpdates: [],
            analyticsEvents: []
        };
        this.batchConfig = {
            maxBatchSize: 100,
            flushInterval: 5000 // Flush every 5 seconds
        };

        // Table names
        this.tables = {
            rebels: 'rebels',
            guilds: 'guilds',
            raids: 'raids',
            items: 'items',
            achievements: 'achievements',
            leaderboards: 'leaderboards',
            trades: 'trades',
            backups: 'backups',
            analytics: 'analytics'
        };

        this.setupConnectionHandlers();
        // Note: Optimization systems will start after connection is established
    }

    // Setup connection event handlers
    setupConnectionHandlers() {
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
    }

    // 🚀 START ULTIMATE OPTIMIZATION SYSTEMS
    startOptimizationSystems() {
        // Start query cache cleanup
        this.startQueryCacheCleanup();

        // Start batch processing
        this.startBatchProcessing();

        // Start connection optimization
        this.optimizeConnections();

        this.logger.info('🚀 Ultimate optimization systems activated');
    }

    // Connect to PostgreSQL
    async connect() {
        try {
            if (!this.config.connectionString) {
                throw new Error('Database URL not configured. Please set DATABASE_URL environment variable.');
            }

            this.logger.info('🔌 Connecting to Render PostgreSQL...');

            this.pool = new Pool(this.config);

            // Test the connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;

            this.logger.info('✅ Connected to Render PostgreSQL database');

            // Initialize tables and indexes
            await this.initializeTables();

            // 🚀 START ULTIMATE OPTIMIZATION SYSTEMS after successful connection
            this.startOptimizationSystems();

            // Record connection metrics
            this.metrics.recordEvent('database_connection', 'success', 'postgresql');

            return true;
        } catch (error) {
            this.logger.error('❌ PostgreSQL connection failed:', error.message);
            this.errorTracker.trackError(error, { component: 'postgresql', operation: 'connect' });
            this.metrics.recordError('database_connection', 'high', 'postgresql');
            throw error;
        }
    }

    // Initialize tables and create indexes
    async initializeTables() {
        try {
            this.logger.info('🏗️ Initializing PostgreSQL tables and indexes...');

            // Create tables
            await this.createTables();

            // Create indexes for optimal performance
            await this.createIndexes();

            this.logger.info('📊 Database tables initialized successfully');

            return true;
        } catch (error) {
            this.logger.error('❌ Failed to initialize tables:', error.message);
            throw error;
        }
    }

    // Create database tables
    async createTables() {
        const tableCreationQueries = [
            // Rebels table
            `CREATE TABLE IF NOT EXISTS ${this.tables.rebels} (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(20) UNIQUE NOT NULL,
                username VARCHAR(100) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                class VARCHAR(50) NOT NULL DEFAULT 'hacker',
                level INTEGER DEFAULT 1,
                experience INTEGER DEFAULT 0,
                energy INTEGER DEFAULT 100,
                max_energy INTEGER DEFAULT 100,
                loyalty_score INTEGER DEFAULT 0,
                total_damage INTEGER DEFAULT 0,
                credits INTEGER DEFAULT 100,
                last_daily_mission DATE,
                last_energy_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Items table
            `CREATE TABLE IF NOT EXISTS ${this.tables.items} (
                id SERIAL PRIMARY KEY,
                item_id VARCHAR(100) UNIQUE NOT NULL,
                owner_id VARCHAR(20) NOT NULL,
                name VARCHAR(200) NOT NULL,
                type VARCHAR(50) NOT NULL,
                rarity VARCHAR(20) NOT NULL,
                quantity INTEGER DEFAULT 1,
                value INTEGER DEFAULT 0,
                acquired_from VARCHAR(100),
                acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                activated_at TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES ${this.tables.rebels}(user_id) ON DELETE CASCADE
            )`,

            // Guilds table
            `CREATE TABLE IF NOT EXISTS ${this.tables.guilds} (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(200) NOT NULL,
                total_members INTEGER DEFAULT 0,
                total_damage INTEGER DEFAULT 0,
                total_raids INTEGER DEFAULT 0,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Achievements table
            `CREATE TABLE IF NOT EXISTS ${this.tables.achievements} (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                achievement_id VARCHAR(100) NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES ${this.tables.rebels}(user_id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_id)
            )`,

            // Trades table
            `CREATE TABLE IF NOT EXISTS ${this.tables.trades} (
                id SERIAL PRIMARY KEY,
                trade_id VARCHAR(100) UNIQUE NOT NULL,
                seller_id VARCHAR(20) NOT NULL,
                buyer_id VARCHAR(20),
                item_id VARCHAR(100) NOT NULL,
                price INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                trade_type VARCHAR(20) DEFAULT 'direct',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES ${this.tables.rebels}(user_id) ON DELETE CASCADE,
                FOREIGN KEY (buyer_id) REFERENCES ${this.tables.rebels}(user_id) ON DELETE SET NULL
            )`,

            // Analytics table
            `CREATE TABLE IF NOT EXISTS ${this.tables.analytics} (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                user_id VARCHAR(20),
                guild_id VARCHAR(20),
                data JSONB DEFAULT '{}',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const query of tableCreationQueries) {
            try {
                await this.pool.query(query);
            } catch (error) {
                this.logger.error(`Failed to create table: ${error.message}`);
                throw error;
            }
        }

        // Check and fix items table schema
        await this.fixItemsTableSchema();

        this.logger.info('✅ All database tables created successfully');
    }

    // Fix items table schema if needed
    async fixItemsTableSchema() {
        try {
            // Check if quantity column exists
            const checkQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'quantity'
            `;
            const result = await this.pool.query(checkQuery);
            
            if (result.rows.length === 0) {
                this.logger.warn('⚠️ Quantity column missing from items table. Adding it now...');
                
                // Add the missing quantity column
                const alterQuery = `
                    ALTER TABLE ${this.tables.items} 
                    ADD COLUMN quantity INTEGER DEFAULT 1
                `;
                await this.pool.query(alterQuery);
                
                this.logger.info('✅ Quantity column added to items table successfully');
            } else {
                this.logger.info('✅ Items table schema is correct');
            }
        } catch (error) {
            this.logger.error('❌ Failed to fix items table schema:', error.message);
            // Don't throw error here as it might prevent the app from starting
        }
    }

    // Create database indexes for performance
    async createIndexes() {
        const indexQueries = [
            // Rebels table indexes
            `CREATE INDEX IF NOT EXISTS idx_rebels_guild_id ON ${this.tables.rebels}(guild_id)`,
            `CREATE INDEX IF NOT EXISTS idx_rebels_level ON ${this.tables.rebels}(level DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_rebels_loyalty_score ON ${this.tables.rebels}(loyalty_score DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_rebels_last_active ON ${this.tables.rebels}(last_active DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_rebels_user_guild ON ${this.tables.rebels}(user_id, guild_id)`,

            // Guilds table indexes
            `CREATE INDEX IF NOT EXISTS idx_guilds_total_members ON ${this.tables.guilds}(total_members DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_guilds_total_damage ON ${this.tables.guilds}(total_damage DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_guilds_created_at ON ${this.tables.guilds}(created_at DESC)`,

            // Items table indexes
            `CREATE INDEX IF NOT EXISTS idx_items_owner_id ON ${this.tables.items}(owner_id)`,
            `CREATE INDEX IF NOT EXISTS idx_items_type ON ${this.tables.items}(type)`,
            `CREATE INDEX IF NOT EXISTS idx_items_rarity ON ${this.tables.items}(rarity)`,
            `CREATE INDEX IF NOT EXISTS idx_items_owner_type ON ${this.tables.items}(owner_id, type)`,

            // Achievements table indexes
            `CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON ${this.tables.achievements}(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_achievements_achievement_id ON ${this.tables.achievements}(achievement_id)`,
            `CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON ${this.tables.achievements}(unlocked_at DESC)`,

            // Trades table indexes
            `CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON ${this.tables.trades}(seller_id)`,
            `CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON ${this.tables.trades}(buyer_id)`,
            `CREATE INDEX IF NOT EXISTS idx_trades_status ON ${this.tables.trades}(status)`,
            `CREATE INDEX IF NOT EXISTS idx_trades_created_at ON ${this.tables.trades}(created_at DESC)`,

            // Analytics table indexes
            `CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON ${this.tables.analytics}(event_type)`,
            `CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON ${this.tables.analytics}(timestamp DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_analytics_guild_id ON ${this.tables.analytics}(guild_id)`,
            `CREATE INDEX IF NOT EXISTS idx_analytics_event_timestamp ON ${this.tables.analytics}(event_type, timestamp DESC)`
        ];

        try {
            for (const query of indexQueries) {
                try {
                    await this.pool.query(query);
                } catch (error) {
                    // Index might already exist, log but don't fail
                    this.logger.warn(`Index creation warning:`, error.message);
                }
            }

            this.logger.info('✅ Database indexes created successfully');
        } catch (error) {
            this.logger.error('❌ Failed to create indexes:', error.message);
            throw error;
        }
    }

    // Get database connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            database: 'raikurevolt_revolt',
            tables: Object.keys(this.tables).length,
            connectionString: this.config.connectionString ? 'configured' : 'not_configured'
        };
    }

    // Health check for database
    async healthCheck() {
        try {
            if (!this.isConnected || !this.pool) {
                return { status: 'disconnected', error: 'No active connection' };
            }

            // Test the database connection
            const startTime = Date.now();
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as current_time');
            client.release();
            const responseTime = Date.now() - startTime;

            // Get database stats
            const statsClient = await this.pool.connect();
            const statsResult = await statsClient.query(`
                SELECT
                    pg_database_size(current_database()) as database_size,
                    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
            `);
            statsClient.release();

            return {
                status: 'healthy',
                responseTime: `${responseTime}ms`,
                database: 'raikurevolt_revolt',
                tables: statsResult.rows[0].table_count,
                databaseSize: this.formatBytes(parseInt(statsResult.rows[0].database_size)),
                currentTime: result.rows[0].current_time
            };
        } catch (error) {
            this.logger.error('❌ Database health check failed:', error.message);
            return { status: 'unhealthy', error: error.message };
        }
    }

    // Format bytes for display
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Disconnect from PostgreSQL
    async disconnect() {
        try {
            if (this.pool && this.isConnected) {
                await this.pool.end();
                this.isConnected = false;
                this.pool = null;
                this.logger.info('🔌 Disconnected from PostgreSQL');
            }
        } catch (error) {
            this.logger.error('❌ Error disconnecting from PostgreSQL:', error.message);
            throw error;
        }
    }

    // Graceful shutdown
    async gracefulShutdown() {
        if (this.pool) {
            this.logger.info('🔌 Closing PostgreSQL connection...');
            await this.pool.end();
            this.isConnected = false;
            this.logger.info('✅ PostgreSQL connection closed');
        }
    }

    // Get database client for queries
    async getClient() {
        if (!this.isConnected || !this.pool) {
            throw new Error('Database not connected');
        }

        return await this.pool.connect();
    }

    // 🚀 SUPERCHARGED QUERY METHOD with intelligent caching
    async query(text, params = []) {
        if (!this.isConnected || !this.pool) {
            throw new Error('Database not connected');
        }

        const startTime = Date.now();

        try {
            // 🧠 INTELLIGENT CACHE CHECK for SELECT queries
            if (text.trim().toUpperCase().startsWith('SELECT')) {
                const cacheKey = this.generateCacheKey(text, params);
                const cached = this.queryCache.get(cacheKey);

                if (cached && cached.expires > Date.now()) {
                    this.metrics.recordEvent('query_cache_hit', 'success', 'postgresql');
                    return cached.result;
                }
            }

            const client = await this.pool.connect();
            const result = await client.query(text, params);
            client.release();

            const duration = Date.now() - startTime;

            // 💾 CACHE SELECT QUERY RESULTS for future use
            if (text.trim().toUpperCase().startsWith('SELECT') && result.rows.length > 0) {
                this.cacheQueryResult(text, params, result);
            }

            this.metrics.recordEvent('database_query', 'success', 'postgresql', { duration });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Database query error:', error);
            this.metrics.recordError('database_query_error', 'medium', 'postgresql', { duration });
            this.errorTracker.trackError(error, {
                component: 'postgresql',
                operation: 'query',
                query: text.substring(0, 100),
                duration
            });
            throw error;
        }
    }

    // Database operation wrapper with error handling
    async executeOperation(operation, tableName, operationName) {
        try {
            const startTime = Date.now();
            const result = await operation();
            const duration = Date.now() - startTime;

            this.metrics.recordEvent('database_operation', 'success', 'postgresql', {
                table: tableName,
                operation: operationName,
                duration
            });

            return result;
        } catch (error) {
            this.logger.error(`❌ Database operation failed [${operationName}]:`, error.message);
            this.errorTracker.trackError(error, {
                component: 'postgresql',
                operation: operationName,
                table: tableName
            });
            this.metrics.recordError('database_operation', 'medium', 'postgresql');
            throw error;
        }
    }

    // Setup connection event handlers
    setupConnectionHandlers() {
        if (this.pool) {
            this.pool.on('connect', () => {
                this.logger.info('🔗 New PostgreSQL client connected');
            });

            this.pool.on('error', (err) => {
                this.logger.error('❌ PostgreSQL pool error:', err.message);
                this.errorTracker.trackError(err, { component: 'postgresql', operation: 'pool_error' });
            });

            this.pool.on('remove', () => {
                this.logger.info('🔌 PostgreSQL client removed from pool');
            });
        }
    }

    // 🚀 ULTIMATE OPTIMIZATION METHODS

    // ⚡ PREPARED STATEMENT EXECUTION for ultra-fast repeated queries
    async executePrepared(name, text, params = []) {
        const startTime = Date.now();
        try {
            // Use pg native named prepared statements
            const result = await this.pool.query({ name, text, values: params });
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

    // 📦 BATCH OPERATIONS for maximum efficiency
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

    // 🧠 CACHE MANAGEMENT METHODS
    generateCacheKey(query, params) {
        return `${query}:${JSON.stringify(params)}`.replace(/\s+/g, ' ').trim();
    }

    cacheQueryResult(query, params, result) {
        if (this.queryCache.size >= this.cacheConfig.maxSize) {
            // Remove oldest entries (LRU eviction)
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

    startQueryCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache();
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

    // 📦 BATCH PROCESSING SYSTEM
    startBatchProcessing() {
        setInterval(() => {
            this.flushBatchQueues();
        }, this.batchConfig.flushInterval);
    }

    async flushBatchQueues() {
        // Flush user updates
        if (this.batchQueues.userUpdates.length > 0) {
            await this.processBatchUserUpdates();
        }

        // Flush inventory updates
        if (this.batchQueues.inventoryUpdates.length > 0) {
            await this.processBatchInventoryUpdates();
        }

        // Flush achievement updates
        if (this.batchQueues.achievementUpdates.length > 0) {
            await this.processBatchAchievementUpdates();
        }

        // Flush analytics events
        if (this.batchQueues.analyticsEvents.length > 0) {
            await this.processBatchAnalyticsEvents();
        }
    }

    async processBatchUserUpdates() {
        const updates = this.batchQueues.userUpdates.splice(0, this.batchConfig.maxBatchSize);
        
        if (updates.length === 0) return;

        try {
            const query = `
                UPDATE ${this.tables.rebels}
                SET level = data.level::INTEGER, 
                    experience = data.experience::INTEGER, 
                    energy = data.energy::INTEGER,
                    loyalty_score = data.loyalty_score::INTEGER, 
                    total_damage = data.total_damage::INTEGER,
                    last_active = NOW()
                FROM (VALUES ${updates.map((_, i) => `($${i*6+1}, $${i*6+2}::INTEGER, $${i*6+3}::INTEGER, $${i*6+4}::INTEGER, $${i*6+5}::INTEGER, $${i*6+6}::INTEGER)`).join(', ')})
                AS data(user_id, level, experience, energy, loyalty_score, total_damage)
                WHERE ${this.tables.rebels}.user_id = data.user_id
            `;

            const values = updates.flatMap(u => [
                u.userId,
                Math.max(0, Math.floor(Number(u.level) || 0)),
                Math.max(0, Math.floor(Number(u.experience) || 0)),
                Math.max(0, Math.floor(Number(u.energy) || 0)),
                Math.max(0, Math.floor(Number(u.loyaltyScore) || 0)),
                Math.max(0, Math.floor(Number(u.totalDamage) || 0))
            ]);

            await this.query(query, values);

            this.logger.debug(`📊 Batch processed ${updates.length} user updates`);
        } catch (error) {
            this.logger.error('Batch user update error:', error);
            // Re-add failed updates to queue for retry
            this.batchQueues.userUpdates.unshift(...updates);
        }
    }

    // ⚡ CONNECTION OPTIMIZATION
    optimizeConnections() {
        if (this.pool) {
            this.pool.on('connect', (client) => {
                // Optimize each new connection
                client.query(`
                    SET work_mem = '32MB';
                    SET maintenance_work_mem = '128MB';
                    SET effective_cache_size = '2GB';
                    SET random_page_cost = 1.1;
                    SET seq_page_cost = 1.0;
                `).catch(err => this.logger.warn('Failed to optimize connection:', err));
            });
        }
    }

    // 🎯 BATCH QUEUE METHODS (for game logic to use)
    queueUserUpdate(userId, level, experience, energy, loyaltyScore, totalDamage) {
        // Ensure all numeric values are properly typed and valid
        const update = {
            userId: String(userId),
            level: Math.max(1, Math.floor(Number(level) || 1)),
            experience: Math.max(0, Math.floor(Number(experience) || 0)),
            energy: Math.max(0, Math.floor(Number(energy) || 0)),
            loyaltyScore: Math.max(0, Math.floor(Number(loyaltyScore) || 0)),
            totalDamage: Math.max(0, Math.floor(Number(totalDamage) || 0))
        };
        
        this.batchQueues.userUpdates.push(update);

        // Flush immediately if queue is full
        if (this.batchQueues.userUpdates.length >= this.batchConfig.maxBatchSize) {
            setImmediate(() => this.processBatchUserUpdates());
        }
    }

    queueInventoryUpdate(userId, items, credits, capacity) {
        this.batchQueues.inventoryUpdates.push({
            userId, items, credits, capacity
        });

        if (this.batchQueues.inventoryUpdates.length >= this.batchConfig.maxBatchSize) {
            setImmediate(() => this.processBatchInventoryUpdates());
        }
    }

    queueAnalyticsEvent(userId, eventType, eventData) {
        this.batchQueues.analyticsEvents.push({
            userId, eventType, eventData, timestamp: new Date()
        });

        if (this.batchQueues.analyticsEvents.length >= this.batchConfig.maxBatchSize) {
            setImmediate(() => this.processBatchAnalyticsEvents());
        }
    }
}

export default PostgreSQLManager;
