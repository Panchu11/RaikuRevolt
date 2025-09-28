/**
 * Database Models and Schemas
 * Defines data structures for MongoDB collections
 * Includes validation and default values
 */

export const DatabaseSchemas = {
    // Rebel (Player) Schema
    rebel: {
        userId: { type: 'string', required: true, unique: true },
        username: { type: 'string', required: true },
        guildId: { type: 'string', required: true },
        
        // Character progression
        class: { 
            type: 'string', 
            required: true, 
            enum: ['hacker', 'whistleblower', 'activist', 'researcher', 'coordinator'],
            default: 'hacker'
        },
        level: { type: 'number', default: 1, min: 1, max: 100 },
        experience: { type: 'number', default: 0, min: 0 },
        
        // Resources
        energy: { type: 'number', default: 100, min: 0, max: 100 },
        maxEnergy: { type: 'number', default: 100, min: 100, max: 200 },
        loyaltyScore: { type: 'number', default: 0, min: 0 },
        corporateDamage: { type: 'number', default: 0, min: 0 },
        
        // Stats
        stats: {
            strength: { type: 'number', default: 10, min: 1, max: 100 },
            intelligence: { type: 'number', default: 10, min: 1, max: 100 },
            charisma: { type: 'number', default: 10, min: 1, max: 100 },
            stealth: { type: 'number', default: 10, min: 1, max: 100 }
        },
        
        // Game state
        currentZone: { 
            type: 'string', 
            default: 'foundation',
            enum: ['foundation', 'corporate-district', 'underground', 'data-center', 'neural-network']
        },
        reputation: { type: 'string', default: 'Rookie Rebel' },
        
        // Inventory
        inventory: {
            items: [{ 
                itemId: 'string',
                quantity: { type: 'number', default: 1 },
                acquiredAt: { type: 'date', default: Date.now }
            }],
            maxSlots: { type: 'number', default: 50 }
        },
        
        // Cooldowns and limits
        lastRaid: { type: 'date', default: null },
        lastDaily: { type: 'date', default: null },
        lastEnergyRegen: { type: 'date', default: Date.now },
        
        // Timestamps
        createdAt: { type: 'date', default: Date.now },
        lastActive: { type: 'date', default: Date.now },
        updatedAt: { type: 'date', default: Date.now }
    },

    // Guild Schema
    guild: {
        guildId: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        
        // Guild stats
        totalMembers: { type: 'number', default: 0 },
        totalDamage: { type: 'number', default: 0 },
        totalRaids: { type: 'number', default: 0 },
        
        // Guild settings
        settings: {
            raidCooldown: { type: 'number', default: 300000 }, // 5 minutes
            maxRaidParty: { type: 'number', default: 5 },
            autoBackup: { type: 'boolean', default: true },
            alertsEnabled: { type: 'boolean', default: true }
        },
        
        // Active events
        activeRaids: [{ 
            raidId: 'string',
            startedAt: 'date',
            participants: ['string']
        }],
        
        // Timestamps
        createdAt: { type: 'date', default: Date.now },
        updatedAt: { type: 'date', default: Date.now }
    },

    // Raid Schema
    raid: {
        raidId: { type: 'string', required: true, unique: true },
        guildId: { type: 'string', required: true },
        leaderId: { type: 'string', required: true },
        
        // Raid details
        target: {
            name: { type: 'string', required: true },
            type: { type: 'string', required: true },
            difficulty: { type: 'number', min: 1, max: 10 },
            health: { type: 'number', required: true },
            maxHealth: { type: 'number', required: true }
        },
        
        // Participants
        participants: [{
            userId: 'string',
            joinedAt: 'date',
            damage: { type: 'number', default: 0 },
            status: { type: 'string', enum: ['active', 'defeated', 'left'], default: 'active' }
        }],
        
        // Raid state
        status: { 
            type: 'string', 
            enum: ['preparing', 'active', 'completed', 'failed', 'cancelled'],
            default: 'preparing'
        },
        totalDamage: { type: 'number', default: 0 },
        
        // Rewards
        rewards: {
            experience: { type: 'number', default: 0 },
            items: [{ itemId: 'string', quantity: 'number' }],
            loyaltyPoints: { type: 'number', default: 0 }
        },
        
        // Timestamps
        createdAt: { type: 'date', default: Date.now },
        startedAt: { type: 'date', default: null },
        completedAt: { type: 'date', default: null },
        updatedAt: { type: 'date', default: Date.now }
    },

    // Item Schema
    item: {
        itemId: { type: 'string', required: true, unique: true },
        ownerId: { type: 'string', required: true },
        
        // Item details
        name: { type: 'string', required: true },
        description: { type: 'string', required: true },
        type: { 
            type: 'string', 
            required: true,
            enum: ['weapon', 'armor', 'tool', 'consumable', 'material', 'key_item']
        },
        rarity: { 
            type: 'string', 
            required: true,
            enum: ['common', 'uncommon', 'rare', 'epic', 'legendary']
        },
        
        // Item stats
        stats: {
            attack: { type: 'number', default: 0 },
            defense: { type: 'number', default: 0 },
            utility: { type: 'number', default: 0 }
        },
        
        // Market data
        marketValue: { type: 'number', default: 0 },
        tradeable: { type: 'boolean', default: true },
        
        // Timestamps
        acquiredAt: { type: 'date', default: Date.now },
        lastUsed: { type: 'date', default: null }
    },

    // Achievement Schema
    achievement: {
        userId: { type: 'string', required: true },
        achievementId: { type: 'string', required: true },
        
        // Achievement details
        name: { type: 'string', required: true },
        description: { type: 'string', required: true },
        category: { 
            type: 'string', 
            required: true,
            enum: ['combat', 'exploration', 'social', 'economy', 'progression']
        },
        
        // Progress tracking
        progress: { type: 'number', default: 0 },
        target: { type: 'number', required: true },
        completed: { type: 'boolean', default: false },
        
        // Rewards
        rewards: {
            experience: { type: 'number', default: 0 },
            loyaltyPoints: { type: 'number', default: 0 },
            items: [{ itemId: 'string', quantity: 'number' }]
        },
        
        // Timestamps
        unlockedAt: { type: 'date', default: Date.now },
        completedAt: { type: 'date', default: null }
    },

    // Trade Schema
    trade: {
        tradeId: { type: 'string', required: true, unique: true },
        sellerId: { type: 'string', required: true },
        buyerId: { type: 'string', default: null },
        
        // Trade details
        item: {
            itemId: 'string',
            name: 'string',
            quantity: { type: 'number', default: 1 }
        },
        price: { type: 'number', required: true },
        
        // Trade state
        status: { 
            type: 'string', 
            enum: ['listed', 'sold', 'cancelled', 'expired'],
            default: 'listed'
        },
        
        // Timestamps
        createdAt: { type: 'date', default: Date.now },
        expiresAt: { type: 'date', required: true },
        completedAt: { type: 'date', default: null }
    },

    // Analytics Schema
    analytics: {
        eventType: { type: 'string', required: true },
        guildId: { type: 'string', required: true },
        userId: { type: 'string', default: null },
        
        // Event data
        data: { type: 'object', default: {} },
        metadata: {
            command: { type: 'string', default: null },
            duration: { type: 'number', default: null },
            success: { type: 'boolean', default: true }
        },
        
        // Timestamp
        timestamp: { type: 'date', default: Date.now }
    }
};

// Default values for new documents
export const DefaultValues = {
    rebel: {
        level: 1,
        experience: 0,
        energy: 100,
        maxEnergy: 100,
        loyaltyScore: 0,
        corporateDamage: 0,
        currentZone: 'foundation',
        reputation: 'Rookie Rebel',
        stats: {
            strength: 10,
            intelligence: 10,
            charisma: 10,
            stealth: 10
        },
        inventory: {
            items: [],
            maxSlots: 50
        }
    },
    
    guild: {
        totalMembers: 0,
        totalDamage: 0,
        totalRaids: 0,
        settings: {
            raidCooldown: 300000,
            maxRaidParty: 5,
            autoBackup: true,
            alertsEnabled: true
        },
        activeRaids: []
    }
};

// Validation functions
export const Validators = {
    // Validate rebel class
    isValidClass(className) {
        const validClasses = [
            // Current game classes (display names)
            'Protocol Hacker',
            'Model Trainer',
            'Data Liberator',
            'Community Organizer',
            'Enclave Guardian',
            // Legacy classes (for backward compatibility)
            'hacker',
            'whistleblower',
            'activist',
            'researcher',
            'coordinator'
        ];
        return validClasses.includes(className);
    },
    
    // Validate zone
    isValidZone(zoneName) {
        const validZones = ['foundation', 'corporate-district', 'underground', 'data-center', 'neural-network'];
        return validZones.includes(zoneName);
    },
    
    // Validate item type
    isValidItemType(itemType) {
        const validTypes = ['weapon', 'armor', 'tool', 'consumable', 'material', 'key_item'];
        return validTypes.includes(itemType);
    },
    
    // Validate rarity
    isValidRarity(rarity) {
        const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        return validRarities.includes(rarity);
    },
    
    // Validate user ID (Discord snowflake)
    isValidUserId(userId) {
        return typeof userId === 'string' && /^\d{17,19}$/.test(userId);
    },
    
    // Validate guild ID (Discord snowflake)
    isValidGuildId(guildId) {
        return typeof guildId === 'string' && /^\d{17,19}$/.test(guildId);
    }
};

export default { DatabaseSchemas, DefaultValues, Validators };
