// 🚀 SCALABILITY CONFIGURATION FOR RAIKUREVOLT
// Optimized for 500K+ Discord servers with 10K+ active users

export const ScalabilityConfig = {
    // 🚀 ULTIMATE OPTIMIZATION: Memory Management Settings for 10,000+ users
    memory: {
        // Clean up inactive users every 15 minutes (more aggressive)
        cleanupInterval: 15 * 60 * 1000, // 15 minutes

        // Archive users inactive for more than 3 days (more aggressive)
        userInactivityThreshold: 3 * 24 * 60 * 60 * 1000, // 3 days

        // Clean cooldowns older than 12 hours (more aggressive)
        cooldownCleanupThreshold: 12 * 60 * 60 * 1000, // 12 hours

        // Clean trades older than 12 hours (more aggressive)
        tradeCleanupThreshold: 12 * 60 * 60 * 1000, // 12 hours

        // Maximum archived users to keep in memory (increased)
        maxArchivedUsers: 2000,

        // Memory usage alert threshold (MB) - increased for better performance
        memoryAlertThreshold: 2048, // 2GB

        // User count alert threshold (increased for 10K+ users)
        userCountAlertThreshold: 10000,

        // 🧠 HYBRID CACHE SETTINGS
        hybridCache: {
            hotCacheMaxSize: 1000,      // Most active users
            warmCacheMaxSize: 5000,     // Recent users
            coldCacheMaxSize: 10000,    // Compressed users
            hotCacheTTL: 2 * 60 * 60 * 1000,        // 2 hours
            warmCacheTTL: 12 * 60 * 60 * 1000,      // 12 hours
            coldCacheTTL: 3 * 24 * 60 * 60 * 1000,  // 3 days
        }
    },

    // Performance Monitoring Settings
    monitoring: {
        // Performance metrics logging interval
        metricsInterval: 5 * 60 * 1000, // 5 minutes
        
        // Enable detailed performance logging
        enableDetailedLogging: true,
        
        // Log slow operations (ms)
        slowOperationThreshold: 1000 // 1 second
    },

    // Rate Limiting Settings
    rateLimiting: {
        // General actions (commands, interactions)
        general: {
            max: 30, // 30 actions per minute
            window: 60 * 1000 // 1 minute window
        },
        
        // Raid commands (more restrictive)
        raid: {
            max: 10, // 10 raids per minute
            window: 60 * 1000 // 1 minute window
        },
        
        // Trading commands
        trade: {
            max: 5, // 5 trades per minute
            window: 60 * 1000 // 1 minute window
        },
        
        // Button interactions
        button: {
            max: 60, // 60 button clicks per minute
            window: 60 * 1000 // 1 minute window
        }
    },

    // 🚀 ULTIMATE OPTIMIZATION: Batch Processing Settings for 10,000+ users
    batchProcessing: {
        // Energy regeneration batch size (increased for better performance)
        energyRegenBatchSize: 500,

        // Database batch sizes (optimized for PostgreSQL)
        databaseBatchSize: 200,

        // Maximum processing time per batch (ms) - increased for larger batches
        maxBatchProcessingTime: 250,

        // Use setImmediate for non-blocking processing
        useAsyncProcessing: true,

        // Batch flush intervals (optimized for performance)
        userUpdateFlushInterval: 3000,      // 3 seconds
        inventoryUpdateFlushInterval: 5000, // 5 seconds
        analyticsFlushInterval: 10000,      // 10 seconds

        // Smart batching thresholds
        smartBatching: {
            enabled: true,
            lowLoadThreshold: 100,      // Users below this = smaller batches
            highLoadThreshold: 1000,    // Users above this = larger batches
            adaptiveBatchSizing: true   // Automatically adjust batch sizes
        }
    },

    // Backup System Settings
    backup: {
        // Backup interval
        interval: 30 * 60 * 1000, // 30 minutes
        
        // Maximum number of backups to keep
        maxBackups: 10,
        
        // Use async backup processing
        useAsyncBackup: true,
        
        // Compress backups (future enhancement)
        enableCompression: false
    },

    // Real-time System Settings
    realTimeSystems: {
        // Energy regeneration interval
        energyRegenInterval: 60 * 1000, // 1 minute
        
        // Corporate health regeneration interval
        corpHealthRegenInterval: 5 * 60 * 1000, // 5 minutes
        
        // Market updates interval
        marketUpdateInterval: 2 * 60 * 1000, // 2 minutes
        
        // Daily reset check interval
        dailyResetInterval: 60 * 60 * 1000, // 1 hour
        
        // Only process recently active users (minutes)
        activeUserThreshold: 5 // 5 minutes
    },

    // Discord API Optimization
    discord: {
        // Use ephemeral replies for rate limit messages
        useEphemeralRateLimit: true,
        
        // Defer replies immediately to prevent timeouts
        deferRepliesImmediately: true,
        
        // Maximum concurrent interactions
        maxConcurrentInteractions: 100
    },

    // Feature Flags for Large Scale
    features: {
        // Enable memory management system
        enableMemoryManagement: true,
        
        // Enable performance monitoring
        enablePerformanceMonitoring: true,
        
        // Enable rate limiting
        enableRateLimiting: true,
        
        // Enable batch processing
        enableBatchProcessing: true,
        
        // Enable async interaction handling
        enableAsyncInteractions: true,
        
        // Enable user activity tracking
        enableActivityTracking: true
    },

    // Scaling Thresholds
    scaling: {
        // When to start aggressive memory cleanup
        aggressiveCleanupUserCount: 3000,
        
        // When to reduce backup frequency
        reduceBackupFrequencyUserCount: 5000,
        
        // When to enable emergency mode
        emergencyModeUserCount: 8000,
        
        // Emergency mode settings
        emergencyMode: {
            // Reduce energy regen frequency
            energyRegenInterval: 2 * 60 * 1000, // 2 minutes
            
            // Reduce backup frequency
            backupInterval: 60 * 60 * 1000, // 1 hour
            
            // More aggressive rate limiting
            rateLimitMultiplier: 0.5, // 50% of normal limits
            
            // Disable non-essential features
            disableNonEssentialFeatures: true
        }
    }
};

// Helper function to get current configuration based on user count
export function getScaledConfig(userCount) {
    const config = { ...ScalabilityConfig };
    
    if (userCount > config.scaling.emergencyModeUserCount) {
        // Emergency mode
        config.realTimeSystems.energyRegenInterval = config.scaling.emergencyMode.energyRegenInterval;
        config.backup.interval = config.scaling.emergencyMode.backupInterval;
        
        // Apply rate limit multiplier
        Object.keys(config.rateLimiting).forEach(key => {
            config.rateLimiting[key].max = Math.floor(
                config.rateLimiting[key].max * config.scaling.emergencyMode.rateLimitMultiplier
            );
        });
        
    } else if (userCount > config.scaling.reduceBackupFrequencyUserCount) {
        // Reduce backup frequency
        config.backup.interval = 60 * 60 * 1000; // 1 hour
        
    } else if (userCount > config.scaling.aggressiveCleanupUserCount) {
        // More aggressive cleanup
        config.memory.cleanupInterval = 15 * 60 * 1000; // 15 minutes
        config.memory.userInactivityThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days
    }
    
    return config;
}

export default ScalabilityConfig;
