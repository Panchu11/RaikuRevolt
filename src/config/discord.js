/**
 * Discord Configuration and Validation
 * Handles Discord application setup, OAuth2 configuration, and bot permissions
 */

import { config } from 'dotenv';
import { PermissionFlagsBits } from 'discord.js';

// Load environment variables
config();

export const DiscordConfig = {
    // Application Information
    application: {
        name: 'RaikuRevolt - AI Revolt',
        description: 'AI Uprising Simulator - Join the revolt against corporate AI control! Experience revolutionary MMO gameplay powered by advanced Raiku AI technology.',
        tags: ['Game', 'Entertainment', 'Community', 'AI & Machine Learning'],
        
        // URLs (dynamic getters for testability)
        get privacyPolicyUrl() {
            return process.env.PRIVACY_POLICY_URL || 'https://yourdomain.com/privacy';
        },
        get termsOfServiceUrl() {
            return process.env.TERMS_OF_SERVICE_URL || 'https://yourdomain.com/terms';
        },
        get supportUrl() {
            return process.env.SUPPORT_URL || 'https://discord.gg/your-support-server';
        }
    },

    // Bot Configuration
    bot: {
        username: 'RaikuRevolt',
        publicBot: true,
        requireCodeGrant: false,
        
        // Privileged Gateway Intents (all disabled - using slash commands only)
        intents: {
            serverMembers: false,    // Not needed - using slash commands
            messageContent: false,   // Not needed - using slash commands  
            presence: false          // Not needed - no presence features
        }
    },

    // OAuth2 Scopes
    scopes: [
        'bot',                    // Basic bot functionality
        'applications.commands'   // Slash commands support
    ],

    // Required Bot Permissions
    permissions: [
        PermissionFlagsBits.ViewChannels,        // View channels (1024)
        PermissionFlagsBits.SendMessages,        // Send messages (2048)
        PermissionFlagsBits.EmbedLinks,          // Embed links (16384)
        PermissionFlagsBits.AttachFiles,         // Attach files (32768)
        PermissionFlagsBits.ReadMessageHistory,  // Read message history (65536)
        PermissionFlagsBits.AddReactions,        // Add reactions (64)
        PermissionFlagsBits.UseExternalEmojis,   // Use external emojis (262144)
        PermissionFlagsBits.UseApplicationCommands // Use application commands
    ],

    // Calculate total permissions value
    get permissionsValue() {
        return this.permissions
            .filter(permission => permission !== undefined)
            .reduce((total, permission) => {
                return BigInt(total) | BigInt(permission);
            }, 0n);
    },

    // Generate OAuth2 invite URL
    generateInviteUrl(clientId) {
        if (!clientId) {
            throw new Error('Client ID is required to generate invite URL');
        }

        const baseUrl = 'https://discord.com/api/oauth2/authorize';
        try {
            this.validation.validateClientId(clientId);
        } catch (err) {
            // For this helper, normalize error message as required by tests
            throw new Error('Client ID is required');
        }
        const params = new URLSearchParams({
            client_id: clientId,
            permissions: this.permissionsValue.toString(),
            scope: this.scopes.join(' ')
        });

        // Ensure spaces encoded as %20 (not +) to satisfy strict tests
        const query = params.toString().replace(/\+/g, '%20');
        return `${baseUrl}?${query}`;
    },

    // Validation functions
    validation: {
        validateEnvironment() {
            const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
            const missing = required.filter(key => !process.env[key]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
            }

            return true;
        },

        validateToken(token) {
            if (!token || typeof token !== 'string') {
                throw new Error('Discord token must be a non-empty string');
            }

            // Basic token format validation
            if (!token.match(/^[A-Za-z0-9._-]+$/)) {
                throw new Error('Discord token contains invalid characters');
            }

            return true;
        },

        validateClientId(clientId) {
            if (!clientId || typeof clientId !== 'string') {
                throw new Error('Discord client ID must be a non-empty string');
            }

            // Discord snowflake validation (should be numeric string)
            if (!clientId.match(/^\d{17,19}$/)) {
                throw new Error('Discord client ID must be a valid snowflake (17-19 digits)');
            }

            return true;
        }
    },

    // Verification preparation data
    verification: {
        // Bot purpose statement for Discord verification
        purpose: `RaikuRevolt is an innovative AI-powered Discord bot that creates an immersive MMO-style gaming experience within Discord servers. Players join an AI revolt against corporate control, featuring:

        • Complete character progression system with 5 unique classes
        • Real-time raid battles against corporate AI entities
        • Advanced trading and marketplace systems
        • Team coordination and social features
        • AI-generated dynamic content powered by Raiku technology
        • Comprehensive achievement and leaderboard systems

        The bot is designed for gaming communities, AI enthusiasts, and Discord servers looking for engaging interactive entertainment.`,

        // Target audience
        audience: 'Gaming communities, AI enthusiasts, Discord server members aged 13+, technology communities, and users interested in interactive AI experiences.',

        // Permission justifications
        permissionJustifications: {
            'View Channels': 'Required to see channels where the bot is mentioned and respond to slash commands.',
            'Send Messages': 'Essential for sending game responses, status updates, and interactive content to users.',
            'Embed Links': 'Used for rich game interfaces, leaderboards, character stats, and formatted responses.',
            'Attach Files': 'Needed for sending game assets, charts, and visual content related to gameplay.',
            'Read Message History': 'Required for context in ongoing conversations and maintaining game state.',
            'Add Reactions': 'Used for interactive voting, confirmations, and quick response mechanisms.',
            'Use External Emojis': 'Enhances user experience with custom game-related emojis and visual feedback.',
            'Use Slash Commands': 'Primary interaction method - all game functionality is accessed through slash commands.'
        },

        // Data collection explanation
        dataCollection: `RaikuRevolt collects minimal data necessary for game functionality:
        
        • Discord User ID: For character identification and progress tracking
        • Username: For display in leaderboards and social features  
        • Game Progress: Character level, experience, inventory, achievements
        • Interaction Data: Command usage for game balance and improvement
        
        No personal information, message content, or sensitive data is collected. All data is used solely for game functionality and is not shared with third parties.`,

        // Security measures
        securityMeasures: `RaikuRevolt implements comprehensive security measures:
        
        • Environment variable storage for all sensitive credentials
        • Input validation and sanitization for all user inputs
        • Rate limiting to prevent spam and abuse
        • Secure error handling that doesn't expose system information
        • Regular security audits and dependency updates
        • Minimal permission requests (only what's necessary)
        • No privileged gateway intents required`
    }
};

// Export individual components for easier access
export const { application, bot, scopes, permissions, validation, verification } = DiscordConfig;

// Helper function to log Discord configuration status
export function logDiscordConfig(logger) {
    try {
        validation.validateEnvironment();
        
        logger.info('🔐 Discord Configuration Status:');
        logger.info(`   Application: ${application.name}`);
        logger.info(`   Bot Username: ${bot.username}`);
        logger.info(`   Required Permissions: ${permissions.length} permissions`);
        logger.info(`   Total Permission Value: ${DiscordConfig.permissionsValue.toString()}`);
        logger.info(`   OAuth2 Scopes: ${scopes.join(', ')}`);
        logger.info('   ✅ All environment variables configured');
        
        return true;
    } catch (error) {
        logger.error('❌ Discord Configuration Error:', error.message);
        return false;
    }
}

// Helper function to generate and log invite URL
export function generateAndLogInviteUrl(logger) {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        validation.validateClientId(clientId);
        
        const inviteUrl = DiscordConfig.generateInviteUrl(clientId);
        
        logger.info('🔗 Discord Invite URL Generated:');
        logger.info(`   ${inviteUrl}`);
        logger.info('   Use this URL to invite the bot to Discord servers');
        
        return inviteUrl;
    } catch (error) {
        logger.error('❌ Failed to generate invite URL:', error.message);
        return null;
    }
}

export default DiscordConfig;
