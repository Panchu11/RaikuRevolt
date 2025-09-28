/**
 * Rebel Data Access Layer
 * Handles all database operations for rebel (player) data
 * Includes CRUD operations, queries, and business logic
 */

import { DefaultValues, Validators } from '../models.js';

export class RebelDAL {
    constructor(postgresManager, logger, metricsCollector) {
        this.postgres = postgresManager;
        this.logger = logger;
        this.metrics = metricsCollector;
        this.table = 'rebels';

        // **FIX: Add safety check for metrics**
        if (!this.metrics || typeof this.metrics.recordEvent !== 'function') {
            this.logger.warn('⚠️ MetricsCollector not properly initialized in RebelDAL');
            this.metrics = {
                recordEvent: () => {}, // No-op fallback
                recordError: () => {}
            };
        }
    }

    // Create a new rebel
    async createRebel(userId, username, guildId, className = 'hacker') {
        return await this.postgres.executeOperation(async () => {
            // Validate inputs
            if (!Validators.isValidUserId(userId)) {
                throw new Error('Invalid user ID format');
            }
            if (!Validators.isValidGuildId(guildId)) {
                throw new Error('Invalid guild ID format');
            }
            if (!Validators.isValidClass(className)) {
                throw new Error('Invalid rebel class');
            }

            // Check if rebel already exists
            const existing = await this.getRebel(userId);
            if (existing) {
                throw new Error('Rebel already exists');
            }

            // Create new rebel record
            const query = `
                INSERT INTO ${this.table} (
                    user_id, username, guild_id, class, level, experience,
                    energy, max_energy, loyalty_score, total_damage, credits,
                    created_at, last_active, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            `;

            const values = [
                userId,
                username,
                guildId,
                className,
                DefaultValues.rebel.level || 1,
                DefaultValues.rebel.experience || 0,
                DefaultValues.rebel.energy || 100,
                DefaultValues.rebel.maxEnergy || 100,
                DefaultValues.rebel.loyaltyScore || 0,
                DefaultValues.rebel.totalDamage || 0,
                DefaultValues.rebel.credits || 100,
                new Date(),
                new Date(),
                new Date()
            ];

            const result = await this.postgres.query(query, values);

            if (result.rows && result.rows.length > 0) {
                const newRebel = result.rows[0];
                this.logger.info(`✅ Created new rebel: ${username} (${userId}) - Class: ${className}`);
                this.metrics.recordEvent('rebel_created', 'success', 'database');
                return newRebel;
            } else {
                throw new Error('Failed to create rebel');
            }
        }, this.table, 'createRebel');
    }

    // Get rebel by user ID
    async getRebel(userId) {
        return await this.postgres.executeOperation(async () => {
            if (!Validators.isValidUserId(userId)) {
                throw new Error('Invalid user ID format');
            }

            const query = `SELECT * FROM ${this.table} WHERE user_id = $1`;
            const result = await this.postgres.query(query, [userId]);
            const rebel = result.rows.length > 0 ? result.rows[0] : null;
            
            if (rebel) {
                // Update last active timestamp
                await this.updateLastActive(userId);
            }
            
            return rebel;
        }, this.table, 'getRebel');
    }

    // Update rebel data
    async updateRebel(userId, updateData) {
        return await this.postgres.executeOperation(async () => {
            if (!Validators.isValidUserId(userId)) {
                throw new Error('Invalid user ID format');
            }

            // Build dynamic update query
            const fields = Object.keys(updateData);
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const values = [userId, ...Object.values(updateData), new Date()];

            const query = `
                UPDATE ${this.table}
                SET ${setClause}, updated_at = $${values.length}
                WHERE user_id = $1
                RETURNING *
            `;

            const result = await this.postgres.query(query, values);

            if (result.rows.length === 0) {
                // **FIX: Instead of throwing error, log warning and return null**
                this.logger.warn(`⚠️ Attempted to update non-existent rebel: ${userId}`);
                return null;
            }

            this.logger.info(`✅ Updated rebel: ${userId}`);
            return result.rows[0];
        }, this.table, 'updateRebel');
    }

    // Add experience and handle level ups
    async addExperience(userId, experience) {
        return await this.postgres.executeOperation(async () => {
            const rebel = await this.getRebel(userId);
            if (!rebel) {
                throw new Error('Rebel not found');
            }

            const newExperience = rebel.experience + experience;
            const newLevel = this.calculateLevel(newExperience);
            const leveledUp = newLevel > rebel.level;

            const updateData = {
                experience: newExperience,
                level: newLevel
            };

            // If leveled up, increase max energy
            if (leveledUp) {
                updateData.max_energy = Math.min(200, rebel.max_energy + 5);
                updateData.energy = updateData.max_energy; // Full energy on level up
                this.logger.info(`🎉 Rebel ${userId} leveled up to level ${newLevel}!`);
                this.metrics.recordEvent('rebel_levelup', 'success', 'game');
            }

            await this.updateRebel(userId, updateData);

            return {
                leveledUp,
                oldLevel: rebel.level,
                newLevel,
                experienceGained: experience,
                totalExperience: newExperience
            };
        }, this.table, 'addExperience');
    }

    // Calculate level from experience
    calculateLevel(experience) {
        // Level formula: level = floor(sqrt(experience / 100)) + 1
        return Math.min(100, Math.floor(Math.sqrt(experience / 100)) + 1);
    }

    // Update energy
    async updateEnergy(userId, energyChange) {
        return await this.postgres.executeOperation(async () => {
            const rebel = await this.getRebel(userId);
            if (!rebel) {
                throw new Error('Rebel not found');
            }

            const newEnergy = Math.max(0, Math.min(rebel.max_energy, rebel.energy + energyChange));

            await this.updateRebel(userId, {
                energy: newEnergy,
                last_energy_regen: new Date()
            });

            return {
                oldEnergy: rebel.energy,
                newEnergy,
                maxEnergy: rebel.max_energy
            };
        }, this.table, 'updateEnergy');
    }

    // Add item to inventory (using items table)
    async addItemToInventory(userId, itemId, quantity = 1) {
        return await this.postgres.executeOperation(async () => {
            const rebel = await this.getRebel(userId);
            if (!rebel) {
                throw new Error('Rebel not found');
            }

            try {
                // Check if item already exists
                const existingQuery = `SELECT * FROM items WHERE owner_id = $1 AND item_id = $2`;
                const existingResult = await this.postgres.query(existingQuery, [userId, itemId]);

                if (existingResult.rows.length > 0) {
                    // Update existing item quantity
                    const updateQuery = `
                        UPDATE items
                        SET quantity = quantity + $1
                        WHERE owner_id = $2 AND item_id = $3
                    `;
                    await this.postgres.query(updateQuery, [quantity, userId, itemId]);
                } else {
                    // Add new item
                    const insertQuery = `
                        INSERT INTO items (item_id, owner_id, name, type, rarity, quantity, value, acquired_from, acquired_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `;
                    await this.postgres.query(insertQuery, [
                        itemId, userId, itemId, 'loot', 'common', quantity, 0, 'raid', new Date()
                    ]);
                }

                this.logger.info(`📦 Added ${quantity}x ${itemId} to ${userId}'s inventory`);
                return true;
            } catch (error) {
                // Check if this is a missing column error
                if (error.message && error.message.includes('column "quantity" of relation "items" does not exist')) {
                    this.logger.error(`❌ Database schema error: quantity column missing from items table. Attempting to fix...`);
                    
                    // Try to fix the schema automatically
                    try {
                        const alterQuery = `ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1`;
                        await this.postgres.query(alterQuery);
                        this.logger.info(`✅ Successfully added quantity column to items table`);
                        
                        // Retry the original operation
                        return await this.addItemToInventory(userId, itemId, quantity);
                    } catch (fixError) {
                        this.logger.error(`❌ Failed to fix database schema: ${fixError.message}`);
                        throw new Error(`Database schema error: Please restart the application to fix the items table structure`);
                    }
                }
                
                // Re-throw other errors
                throw error;
            }
        }, this.table, 'addItemToInventory');
    }

    // Remove item from inventory
    async removeItemFromInventory(userId, itemId, quantity = 1) {
        return await this.postgres.executeOperation(async () => {
            const rebel = await this.getRebel(userId);
            if (!rebel) {
                throw new Error('Rebel not found');
            }

            try {
                // Check if item exists
                const itemQuery = `SELECT * FROM items WHERE owner_id = $1 AND item_id = $2`;
                const itemResult = await this.postgres.query(itemQuery, [userId, itemId]);

                if (itemResult.rows.length === 0) {
                    throw new Error('Item not found in inventory');
                }

                const item = itemResult.rows[0];
                if (item.quantity < quantity) {
                    throw new Error('Insufficient item quantity');
                }

                if (item.quantity === quantity) {
                    // Remove item completely
                    const deleteQuery = `DELETE FROM items WHERE owner_id = $1 AND item_id = $2`;
                    await this.postgres.query(deleteQuery, [userId, itemId]);
                } else {
                    // Reduce quantity
                    const updateQuery = `
                        UPDATE items
                        SET quantity = quantity - $1
                        WHERE owner_id = $2 AND item_id = $3
                    `;
                    await this.postgres.query(updateQuery, [quantity, userId, itemId]);
                }

                this.logger.info(`📦 Removed ${quantity}x ${itemId} from ${userId}'s inventory`);
                return true;
            } catch (error) {
                // Check if this is a missing column error
                if (error.message && error.message.includes('column "quantity" of relation "items" does not exist')) {
                    this.logger.error(`❌ Database schema error: quantity column missing from items table. Attempting to fix...`);
                    
                    // Try to fix the schema automatically
                    try {
                        const alterQuery = `ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1`;
                        await this.postgres.query(alterQuery);
                        this.logger.info(`✅ Successfully added quantity column to items table`);
                        
                        // Retry the original operation
                        return await this.removeItemFromInventory(userId, itemId, quantity);
                    } catch (fixError) {
                        this.logger.error(`❌ Failed to fix database schema: ${fixError.message}`);
                        throw new Error(`Database schema error: Please restart the application to fix the items table structure`);
                    }
                }
                
                // Re-throw other errors
                throw error;
            }
        }, this.table, 'removeItemFromInventory');
    }

    // Update last active timestamp
    async updateLastActive(userId) {
        return await this.postgres.executeOperation(async () => {
            const query = `
                UPDATE ${this.table}
                SET last_active = $1, updated_at = $2
                WHERE user_id = $3
            `;
            await this.postgres.query(query, [new Date(), new Date(), userId]);
        }, this.table, 'updateLastActive');
    }

    // Get rebels by guild
    async getRebelsByGuild(guildId, limit = 50, skip = 0) {
        return await this.postgres.executeOperation(async () => {
            if (!Validators.isValidGuildId(guildId)) {
                throw new Error('Invalid guild ID format');
            }

            const query = `
                SELECT * FROM ${this.table}
                WHERE guild_id = $1
                ORDER BY level DESC, loyalty_score DESC
                LIMIT $2 OFFSET $3
            `;
            const result = await this.postgres.query(query, [guildId, limit, skip]);

            return result.rows;
        }, this.table, 'getRebelsByGuild');
    }

    // Get top rebels (leaderboard)
    async getTopRebels(guildId = null, sortBy = 'level', limit = 10) {
        return await this.postgres.executeOperation(async () => {
            let whereClause = '';
            let params = [limit];

            if (guildId) {
                whereClause = 'WHERE guild_id = $2';
                params = [limit, guildId];
            }

            // Define sort options
            let orderBy = '';
            switch (sortBy) {
                case 'level':
                    orderBy = 'ORDER BY level DESC, experience DESC';
                    break;
                case 'loyalty':
                    orderBy = 'ORDER BY loyalty_score DESC';
                    break;
                case 'damage':
                    orderBy = 'ORDER BY total_damage DESC';
                    break;
                default:
                    orderBy = 'ORDER BY level DESC';
            }

            const query = `
                SELECT * FROM ${this.table}
                ${whereClause}
                ${orderBy}
                LIMIT $1
            `;
            const result = await this.postgres.query(query, params);

            return result.rows;
        }, this.table, 'getTopRebels');
    }

    // Get rebel statistics
    async getRebelStats(userId) {
        return await this.postgres.executeOperation(async () => {
            const rebel = await this.getRebel(userId);
            if (!rebel) {
                throw new Error('Rebel not found');
            }

            // Get inventory count
            const inventoryQuery = `SELECT COUNT(*) as item_count FROM items WHERE owner_id = $1`;
            const inventoryResult = await this.postgres.query(inventoryQuery, [userId]);
            const inventoryUsed = parseInt(inventoryResult.rows[0].item_count) || 0;
            const inventorySpace = 50 - inventoryUsed; // Default max slots

            return {
                basic: {
                    level: rebel.level,
                    experience: rebel.experience,
                    experienceToNext: this.getExperienceToNextLevel(rebel.level, rebel.experience),
                    energy: rebel.energy,
                    maxEnergy: rebel.max_energy
                },
                combat: {
                    totalStats: 40, // Default stats total
                    corporateDamage: rebel.total_damage,
                    loyaltyScore: rebel.loyalty_score
                },
                inventory: {
                    used: inventoryUsed,
                    available: inventorySpace,
                    total: 50
                },
                progression: {
                    class: rebel.class,
                    currentZone: 'foundation',
                    reputation: 'Rookie Rebel'
                }
            };
        }, this.table, 'getRebelStats');
    }

    // Calculate experience needed for next level
    getExperienceToNextLevel(currentLevel, currentExperience) {
        if (currentLevel >= 100) return 0;
        
        const nextLevelExperience = Math.pow(currentLevel, 2) * 100;
        return Math.max(0, nextLevelExperience - currentExperience);
    }

    // Delete rebel (for admin purposes)
    async deleteRebel(userId) {
        return await this.postgres.executeOperation(async () => {
            if (!Validators.isValidUserId(userId)) {
                throw new Error('Invalid user ID format');
            }

            // Delete rebel and related data (CASCADE will handle items)
            const query = `DELETE FROM ${this.table} WHERE user_id = $1`;
            const result = await this.postgres.query(query, [userId]);

            if (result.rowCount > 0) {
                this.logger.info(`🗑️ Deleted rebel: ${userId}`);
                this.metrics.recordEvent('rebel_deleted', 'success', 'database');
                return true;
            } else {
                throw new Error('Rebel not found');
            }
        }, this.table, 'deleteRebel');
    }

    // Get rebel inventory
    async getRebelInventory(userId) {
        return await this.postgres.executeOperation(async () => {
            const query = `SELECT * FROM items WHERE owner_id = $1 ORDER BY acquired_at DESC`;
            const result = await this.postgres.query(query, [userId]);
            return result.rows;
        }, this.table, 'getRebelInventory');
    }

    // Add credits to rebel
    async addCredits(userId, amount) {
        return await this.postgres.executeOperation(async () => {
            const query = `
                UPDATE ${this.table}
                SET credits = credits + $1, updated_at = $2
                WHERE user_id = $3
                RETURNING credits
            `;
            const result = await this.postgres.query(query, [amount, new Date(), userId]);
            return result.rows[0]?.credits || 0;
        }, this.table, 'addCredits');
    }

    // Update loyalty score
    async updateLoyaltyScore(userId, amount) {
        return await this.postgres.executeOperation(async () => {
            const query = `
                UPDATE ${this.table}
                SET loyalty_score = loyalty_score + $1, updated_at = $2
                WHERE user_id = $3
                RETURNING loyalty_score
            `;
            const result = await this.postgres.query(query, [amount, new Date(), userId]);
            return result.rows[0]?.loyalty_score || 0;
        }, this.table, 'updateLoyaltyScore');
    }

    // Update total damage
    async updateTotalDamage(userId, damage) {
        return await this.postgres.executeOperation(async () => {
            const query = `
                UPDATE ${this.table}
                SET total_damage = total_damage + $1, updated_at = $2
                WHERE user_id = $3
                RETURNING total_damage
            `;
            const result = await this.postgres.query(query, [damage, new Date(), userId]);
            return result.rows[0]?.total_damage || 0;
        }, this.table, 'updateTotalDamage');
    }
}

export default RebelDAL;
