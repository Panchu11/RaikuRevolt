/**
 * Integration Test Setup
 * Setup for tests that require Discord API interaction
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Ensure we have test credentials
if (!process.env.DISCORD_TEST_TOKEN || !process.env.DISCORD_TEST_CLIENT_ID) {
  console.warn('⚠️  Integration tests require DISCORD_TEST_TOKEN and DISCORD_TEST_CLIENT_ID');
  console.warn('   Set these in .env.test file for full integration testing');
}

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'warn';

// Global integration test utilities
global.integrationUtils = {
  // Test Discord client setup
  createTestClient: async () => {
    const { Client, GatewayIntentBits } = await import('discord.js');
    
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });

    return client;
  },

  // Test guild setup
  testGuildId: process.env.DISCORD_TEST_GUILD_ID || '123456789012345678',
  testChannelId: process.env.DISCORD_TEST_CHANNEL_ID || '987654321098765432',
  testUserId: process.env.DISCORD_TEST_USER_ID || '111222333444555666',

  // Rate limiting helpers
  waitForRateLimit: async (ms = 1000) => {
    await new Promise(resolve => setTimeout(resolve, ms));
  },

  // Command testing helpers
  executeCommand: async (client, commandName, options = {}) => {
    // Mock command execution for integration tests
    const mockInteraction = global.testUtils.createMockInteraction({
      commandName,
      ...options
    });

    return mockInteraction;
  },

  // Cleanup helpers
  cleanupTestData: async () => {
    // Clean up any test data created during integration tests
    console.log('🧹 Cleaning up integration test data...');
  }
};

// Integration test hooks
beforeAll(async () => {
  console.log('🚀 Setting up integration test environment...');
});

afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  await global.integrationUtils.cleanupTestData();
});

beforeEach(async () => {
  // Wait between tests to respect rate limits
  await global.integrationUtils.waitForRateLimit(500);
});

// Custom integration test matchers
expect.extend({
  toBeValidDiscordResponse(received) {
    const hasContent = received && (received.content || received.embeds);
    const pass = Boolean(hasContent);
    return {
      message: () => `expected ${received} to be a valid Discord response`,
      pass
    };
  },

  toHaveValidEmbed(received) {
    const hasEmbed = received && received.embeds && received.embeds.length > 0;
    const pass = Boolean(hasEmbed);
    return {
      message: () => `expected ${received} to have valid embed`,
      pass
    };
  }
});
