/**
 * Jest Integration Test Configuration
 * Configuration for integration tests that require Discord API interaction
 */

export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  testTimeout: 60000,
  maxWorkers: 1,
  verbose: true,
  clearMocks: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js'
};
