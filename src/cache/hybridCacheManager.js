/**
 * Hybrid Cache Manager for RaikuRevolt
 * No external services required - uses intelligent memory management + PostgreSQL
 * Optimized for 1000+ concurrent users without external caching services
 */

export class HybridCacheManager {
    constructor(logger, postgresManager, metricsCollector) {
        this.logger = logger;
        this.db = postgresManager;
        this.metrics = metricsCollector;
        
        // Multi-tier cache system
        this.hotCache = new Map();      // Active users (last 1 hour)
        this.warmCache = new Map();     // Recent users (last 24 hours) 
        this.coldCache = new Map();     // Compressed/minimal data
        
        // Cache statistics
        this.stats = {
            hits: { hot: 0, warm: 0, cold: 0, db: 0 },
            misses: 0,
            evictions: 0,
            compressions: 0
        };
        
        // Configuration
        this.config = {
            hotCacheMaxSize: 500,       // Max 500 users in hot cache
            warmCacheMaxSize: 2000,     // Max 2000 users in warm cache
            coldCacheMaxSize: 5000,     // Max 5000 users in cold cache
            hotCacheTTL: 60 * 60 * 1000,        // 1 hour
            warmCacheTTL: 24 * 60 * 60 * 1000,  // 24 hours
            coldCacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
            compressionThreshold: 1000   // Compress objects larger than 1KB
        };
        
        // Start cleanup intervals
        this.startCleanupIntervals();
    }

    // 🚀 ULTIMATE USER DATA RETRIEVAL with zero game impact
    async getUser(userId) {
        const startTime = Date.now();

        // Check hot cache first (most recent/active users)
        if (this.hotCache.has(userId)) {
            const entry = this.hotCache.get(userId);
            entry.accessCount++;
            entry.lastAccess = Date.now();
            this.stats.hits.hot++;
            this.recordCacheHit('hot', Date.now() - startTime);
            return entry.data;
        }

        // Check warm cache (recent users)
        if (this.warmCache.has(userId)) {
            const entry = this.warmCache.get(userId);

            // Promote to hot cache if recently accessed
            this.promoteToHotCache(userId, entry.data);
            this.stats.hits.warm++;
            this.recordCacheHit('warm', Date.now() - startTime);
            return entry.data;
        }

        // Check cold cache (compressed data)
        if (this.coldCache.has(userId)) {
            const entry = this.coldCache.get(userId);
            const decompressed = this.decompressUserData(entry.data);

            // Promote to warm cache
            this.promoteToWarmCache(userId, decompressed);
            this.stats.hits.cold++;
            this.recordCacheHit('cold', Date.now() - startTime);
            return decompressed;
        }

        // Load from database (fallback)
        try {
            const userData = await this.loadFromDatabase(userId);
            if (userData) {
                this.setUser(userId, userData);
                this.stats.hits.db++;
                this.recordCacheHit('database', Date.now() - startTime);
                return userData;
            }
        } catch (error) {
            this.logger.error('Database cache miss error:', error);
        }

        this.stats.misses++;
        return null;
    }

    // 🎯 GAME-SPECIFIC OPTIMIZED METHODS

    // Get user with immediate fallback to game Map (zero impact)
    getUserSync(userId, gameMap) {
        // Try cache first
        if (this.hotCache.has(userId)) {
            const entry = this.hotCache.get(userId);
            entry.accessCount++;
            entry.lastAccess = Date.now();
            this.stats.hits.hot++;
            return entry.data;
        }

        // Fallback to game Map (existing behavior)
        const gameUser = gameMap.get(userId);
        if (gameUser) {
            // Cache the user for future access
            this.setUser(userId, gameUser);
            return gameUser;
        }

        return null;
    }

    // Intelligent user update with batching
    updateUser(userId, userData, gameMap) {
        // Update cache immediately
        this.setUser(userId, userData);

        // Update game Map (maintain existing behavior)
        gameMap.set(userId, userData);

        // Queue for database batch update
        this.db.queueUserUpdate(
            userId,
            userData.level,
            userData.experience,
            userData.energy,
            userData.loyaltyScore,
            userData.corporateDamage || 0
        );
    }

    // Set user data with intelligent placement
    setUser(userId, userData) {
        // Always place new/updated data in hot cache
        this.setHotCache(userId, userData);
        
        // Remove from other caches to avoid duplicates
        this.warmCache.delete(userId);
        this.coldCache.delete(userId);
    }

    // Hot cache management (most active users)
    setHotCache(userId, userData) {
        // Evict oldest if at capacity
        if (this.hotCache.size >= this.config.hotCacheMaxSize) {
            this.evictOldestFromHotCache();
        }
        
        this.hotCache.set(userId, {
            data: userData,
            timestamp: Date.now(),
            accessCount: 1
        });
    }

    // Promote user to hot cache
    promoteToHotCache(userId, userData) {
        this.setHotCache(userId, userData);
        this.warmCache.delete(userId);
        this.coldCache.delete(userId);
    }

    // Promote user to warm cache
    promoteToWarmCache(userId, userData) {
        if (this.warmCache.size >= this.config.warmCacheMaxSize) {
            this.evictOldestFromWarmCache();
        }
        
        this.warmCache.set(userId, {
            data: userData,
            timestamp: Date.now(),
            accessCount: 1
        });
        
        this.coldCache.delete(userId);
    }

    // Compress user data for cold storage
    compressUserData(userData) {
        // Store only essential data in compressed format
        return {
            id: userData.userId,
            lvl: userData.level,
            exp: userData.experience,
            nrg: userData.energy,
            cls: this.getClassId(userData.class),
            lst: userData.lastActive?.getTime() || Date.now(),
            dmg: userData.corporateDamage || 0,
            crd: userData.credits || 0
        };
    }

    // Decompress user data
    decompressUserData(compressedData) {
        // Reconstruct full user object (will need database lookup for complete data)
        return {
            userId: compressedData.id,
            level: compressedData.lvl,
            experience: compressedData.exp,
            energy: compressedData.nrg,
            class: this.getClassName(compressedData.cls),
            lastActive: new Date(compressedData.lst),
            corporateDamage: compressedData.dmg,
            credits: compressedData.crd,
            // Mark as compressed so we know to load full data if needed
            _compressed: true
        };
    }

    // Load user from database
    async loadFromDatabase(userId) {
        try {
            const query = 'SELECT * FROM rebels WHERE user_id = $1';
            const result = await this.db.query(query, [userId]);
            
            if (result.rows.length > 0) {
                return this.mapDatabaseRowToUser(result.rows[0]);
            }
            return null;
        } catch (error) {
            this.logger.error('Failed to load user from database:', error);
            return null;
        }
    }

    // Eviction strategies
    evictOldestFromHotCache() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.hotCache) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            const evicted = this.hotCache.get(oldestKey);
            this.hotCache.delete(oldestKey);
            
            // Move to warm cache instead of discarding
            this.promoteToWarmCache(oldestKey, evicted.data);
            this.stats.evictions++;
        }
    }

    evictOldestFromWarmCache() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.warmCache) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            const evicted = this.warmCache.get(oldestKey);
            this.warmCache.delete(oldestKey);
            
            // Compress and move to cold cache
            const compressed = this.compressUserData(evicted.data);
            this.coldCache.set(oldestKey, {
                data: compressed,
                timestamp: Date.now()
            });
            this.stats.evictions++;
            this.stats.compressions++;
        }
    }

    // Cleanup intervals
    startCleanupIntervals() {
        // Clean expired entries every 10 minutes
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, 10 * 60 * 1000);
        
        // Log cache statistics every 5 minutes
        setInterval(() => {
            this.logCacheStatistics();
        }, 5 * 60 * 1000);
    }

    cleanupExpiredEntries() {
        const now = Date.now();
        let cleaned = 0;
        
        // Clean hot cache
        for (const [key, entry] of this.hotCache) {
            if (now - entry.timestamp > this.config.hotCacheTTL) {
                this.hotCache.delete(key);
                cleaned++;
            }
        }
        
        // Clean warm cache
        for (const [key, entry] of this.warmCache) {
            if (now - entry.timestamp > this.config.warmCacheTTL) {
                this.warmCache.delete(key);
                cleaned++;
            }
        }
        
        // Clean cold cache
        for (const [key, entry] of this.coldCache) {
            if (now - entry.timestamp > this.config.coldCacheTTL) {
                this.coldCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.logger.info(`🧹 Cache cleanup: ${cleaned} expired entries removed`);
        }
    }

    // Utility methods
    getClassId(className) {
        const classMap = { 'hacker': 1, 'activist': 2, 'researcher': 3, 'whistleblower': 4, 'coordinator': 5 };
        return classMap[className] || 1;
    }

    getClassName(classId) {
        const classNames = { 1: 'hacker', 2: 'activist', 3: 'researcher', 4: 'whistleblower', 5: 'coordinator' };
        return classNames[classId] || 'hacker';
    }

    mapDatabaseRowToUser(row) {
        return {
            userId: row.user_id,
            username: row.username,
            class: row.class,
            level: row.level,
            experience: row.experience,
            energy: row.energy,
            maxEnergy: row.max_energy,
            loyaltyScore: row.loyalty_score,
            corporateDamage: row.total_damage,
            credits: row.credits,
            lastActive: row.last_active,
            createdAt: row.created_at
        };
    }

    recordCacheHit(type, duration) {
        this.metrics.recordEvent('cache_hit', 'success', type, { duration });
    }

    logCacheStatistics() {
        const total = this.stats.hits.hot + this.stats.hits.warm + this.stats.hits.cold + this.stats.hits.db;
        const hitRate = total > 0 ? ((total - this.stats.misses) / total * 100).toFixed(1) : 0;
        
        this.logger.info(`📊 Cache Statistics:
        Hot: ${this.hotCache.size}/${this.config.hotCacheMaxSize} (${this.stats.hits.hot} hits)
        Warm: ${this.warmCache.size}/${this.config.warmCacheMaxSize} (${this.stats.hits.warm} hits)  
        Cold: ${this.coldCache.size}/${this.config.coldCacheMaxSize} (${this.stats.hits.cold} hits)
        Hit Rate: ${hitRate}% | Evictions: ${this.stats.evictions} | Compressions: ${this.stats.compressions}`);
    }

    // Get cache health status
    getHealthStatus() {
        return {
            hotCache: { size: this.hotCache.size, max: this.config.hotCacheMaxSize },
            warmCache: { size: this.warmCache.size, max: this.config.warmCacheMaxSize },
            coldCache: { size: this.coldCache.size, max: this.config.coldCacheMaxSize },
            stats: this.stats,
            memoryUsage: process.memoryUsage()
        };
    }
}

export default HybridCacheManager;
