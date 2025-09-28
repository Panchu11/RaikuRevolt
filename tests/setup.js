/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { jest } from '@jest/globals';
import { config as dotenvConfig } from 'dotenv';

// Load test environment variables
dotenvConfig({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Global test utilities
global.testUtils = {
  // Mock Discord interaction
  createMockInteraction: (options = {}) => ({
    user: {
      id: options.userId || '123456789012345678',
      tag: options.userTag || 'TestUser#1234',
      username: options.username || 'TestUser'
    },
    guild: {
      id: options.guildId || '987654321098765432',
      name: options.guildName || 'Test Guild'
    },
    channel: {
      id: options.channelId || '111222333444555666',
      name: options.channelName || 'test-channel'
    },
    commandName: options.commandName || 'test-command',
    options: {
      getString: () => null,
      getInteger: () => null,
      getBoolean: () => null,
      getUser: () => null,
      getSubcommand: () => null
    },
    reply: () => Promise.resolve(),
    editReply: () => Promise.resolve(),
    followUp: () => Promise.resolve(),
    deferReply: () => Promise.resolve(),
    deferred: options.deferred || false,
    replied: options.replied || false,
    customId: options.customId || null,
    isButton: () => options.isButton || false,
    isChatInputCommand: () => options.isChatInputCommand !== false,
    isModalSubmit: () => options.isModalSubmit || false
  }),

  // Mock Discord client
  createMockClient: () => ({
    user: {
      id: '999888777666555444',
      tag: 'RaikuRevolt#1234',
      username: 'RaikuRevolt'
    },
    guilds: {
      cache: new Map()
    },
    login: () => Promise.resolve(),
    on: () => {},
    once: () => {}
  }),

  // Mock game instance
  createMockGame: () => ({
    rebels: new Map(),
    corporations: new Map(),
    inventory: new Map(),
    achievements: new Map(),
    activeTrades: new Map(),
    marketplace: new Map(),
    auctions: new Map(),
    dailyMissions: new Map(),
    globalEvents: new Map(),
    raidParties: new Map(),
    resistanceCells: new Map(),
    leaderboard: new Map(),
    cooldowns: new Map(),
    
    // Mock methods
    getRebel: jest.fn(() => null),
    createRebel: jest.fn(() => {}),
    updateRebel: jest.fn(() => {}),
    deleteRebel: jest.fn(() => {}),
    checkRateLimit: jest.fn(() => true),
    updateUserActivity: jest.fn(() => {}),
    awardAchievement: jest.fn(() => {}),
    calculateDamage: jest.fn(() => 100),
    generateLoot: jest.fn(() => []),
    
    // Mock logger
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {}
    }
  }),

  // Create test rebel data
  createTestRebel: (overrides = {}) => {
    const base = {
      userId: '123456789012345678',
      username: 'TestRebel',
      class: 'hacker',
      level: 1,
      experience: 0,
      energy: 100,
      maxEnergy: 100,
      loyaltyScore: 0,
      corporateDamage: 0,
      totalRaids: 0,
      corporationsDefeated: 0,
      dailyStreak: 0,
      lastDailyMission: null,
      joinedAt: new Date(),
      lastActive: new Date(),
      currentZone: 'foundation',
      reputation: 'Rookie Rebel',
      specialAbilities: ['code_injection', 'system_infiltration'],
      isNewUser: true,
      stats: {
        strength: 10,
        intelligence: 10,
        charisma: 10,
        stealth: 10
      }
    };
    const rebel = { ...base, ...overrides };
    rebel.experience = Math.max(0, rebel.experience || 0);
    return rebel;
  },

  // Create test inventory
  createTestInventory: (overrides = {}) => ({
    items: [],
    capacity: 20,
    credits: 100,
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random test data
  randomId: () => Math.floor(Math.random() * 1000000000000000000).toString(),
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  randomNumber: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min
};

// Global test hooks (commented out for basic setup)
// beforeEach(() => {
//   // Clear all mocks before each test
// });

// afterEach(() => {
//   // Clean up after each test
// });

// Suppress console output in tests unless explicitly needed
// const originalConsole = global.console;
// global.console = {
//   ...originalConsole,
//   log: () => {},
//   info: () => {},
//   warn: () => {},
//   error: () => {}
// };

// Custom matchers (commented out for basic setup)
// expect.extend({
//   toBeValidDiscordId(received) {
//     const pass = typeof received === 'string' && /^\d{17,19}$/.test(received);
//     return {
//       message: () => `expected ${received} to be a valid Discord ID`,
//       pass
//     };
//   },

//   toBeValidRebelClass(received) {
//     const validClasses = ['hacker', 'whistleblower', 'activist', 'researcher', 'coordinator'];
//     const pass = validClasses.includes(received);
//     return {
//       message: () => `expected ${received} to be a valid rebel class`,
//       pass
//     };
//   },

//   toHaveValidGameStats(received) {
//     const requiredStats = ['strength', 'intelligence', 'charisma', 'stealth'];
//     const pass = requiredStats.every(stat =>
//       typeof received[stat] === 'number' && received[stat] >= 0
//     );
//     return {
//       message: () => `expected ${received} to have valid game stats`,
//       pass
//     };
//   }
// });

// Enable custom matchers used by unit tests
expect.extend({
  toBeValidDiscordId(received) {
    const pass = typeof received === 'string' && /^\d{17,19}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid Discord ID`,
      pass
    };
  },

  toBeValidRebelClass(received) {
    const validClasses = ['hacker', 'whistleblower', 'activist', 'researcher', 'coordinator'];
    const pass = validClasses.includes(received);
    return {
      message: () => `expected ${received} to be a valid rebel class`,
      pass
    };
  },

  toHaveValidGameStats(received) {
    const requiredStats = ['strength', 'intelligence', 'charisma', 'stealth'];
    const pass = requiredStats.every(stat =>
      typeof received[stat] === 'number' && received[stat] >= 0
    );
    return {
      message: () => `expected ${received} to have valid game stats`,
      pass
    };
  }
});
