import { jest } from '@jest/globals';
/**
 * Discord Configuration Tests
 * Unit tests for Discord application configuration and validation
 */

let DiscordConfig;
let logDiscordConfig;
let generateAndLogInviteUrl;

beforeAll(async () => {
  const mod = await import('../../src/config/discord.js');
  DiscordConfig = mod.default || mod;
  logDiscordConfig = mod.logDiscordConfig;
  generateAndLogInviteUrl = mod.generateAndLogInviteUrl;
});

describe('Discord Configuration', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // Set up test environment variables
    process.env.DISCORD_TOKEN = 'test.token.here';
    process.env.DISCORD_CLIENT_ID = '123456789012345678';
    process.env.PRIVACY_POLICY_URL = 'https://test.com/privacy';
    process.env.TERMS_OF_SERVICE_URL = 'https://test.com/terms';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.DISCORD_TOKEN;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.PRIVACY_POLICY_URL;
    delete process.env.TERMS_OF_SERVICE_URL;
  });

  describe('Application Configuration', () => {
    test('should have correct application name', () => {
      expect(DiscordConfig.application.name).toBe('RaikuRevolt - AI Revolt');
    });

    test('should have comprehensive description', () => {
      expect(DiscordConfig.application.description).toContain('AI Uprising Simulator');
      expect(DiscordConfig.application.description).toContain('Raiku');
    });

    test('should have appropriate tags', () => {
      expect(DiscordConfig.application.tags).toContain('Game');
      expect(DiscordConfig.application.tags).toContain('AI & Machine Learning');
    });

    test('should use environment URLs when available', () => {
      expect(DiscordConfig.application.privacyPolicyUrl).toBe('https://test.com/privacy');
      expect(DiscordConfig.application.termsOfServiceUrl).toBe('https://test.com/terms');
    });
  });

  describe('Bot Configuration', () => {
    test('should have correct bot settings', () => {
      expect(DiscordConfig.bot.username).toBe('RaikuRevolt');
      expect(DiscordConfig.bot.publicBot).toBe(true);
      expect(DiscordConfig.bot.requireCodeGrant).toBe(false);
    });

    test('should have all privileged intents disabled', () => {
      expect(DiscordConfig.bot.intents.serverMembers).toBe(false);
      expect(DiscordConfig.bot.intents.messageContent).toBe(false);
      expect(DiscordConfig.bot.intents.presence).toBe(false);
    });
  });

  describe('OAuth2 Configuration', () => {
    test('should have required scopes', () => {
      expect(DiscordConfig.scopes).toContain('bot');
      expect(DiscordConfig.scopes).toContain('applications.commands');
    });

    test('should have minimal required permissions', () => {
      expect(DiscordConfig.permissions.length).toBeGreaterThan(0);
      expect(DiscordConfig.permissions.length).toBeLessThan(15); // Ensure minimal permissions
    });

    test('should calculate permissions value correctly', () => {
      const permissionsValue = DiscordConfig.permissionsValue;
      expect(typeof permissionsValue).toBe('bigint');
      expect(permissionsValue).toBeGreaterThan(0n);
    });
  });

  describe('Invite URL Generation', () => {
    test('should generate valid invite URL', () => {
      const clientId = '123456789012345678';
      const inviteUrl = DiscordConfig.generateInviteUrl(clientId);
      
      expect(inviteUrl).toContain('discord.com/api/oauth2/authorize');
      expect(inviteUrl).toContain(`client_id=${clientId}`);
      expect(inviteUrl).toContain('scope=bot%20applications.commands');
    });

    test('should throw error for missing client ID', () => {
      expect(() => {
        DiscordConfig.generateInviteUrl();
      }).toThrow('Client ID is required');
    });

    test('should throw error for invalid client ID', () => {
      expect(() => {
        DiscordConfig.generateInviteUrl('invalid');
      }).toThrow('Client ID is required');
    });
  });

  describe('Validation Functions', () => {
    describe('validateEnvironment', () => {
      test('should pass with valid environment', () => {
        expect(() => {
          DiscordConfig.validation.validateEnvironment();
        }).not.toThrow();
      });

      test('should fail with missing DISCORD_TOKEN', () => {
        delete process.env.DISCORD_TOKEN;
        expect(() => {
          DiscordConfig.validation.validateEnvironment();
        }).toThrow('Missing required environment variables: DISCORD_TOKEN');
      });

      test('should fail with missing DISCORD_CLIENT_ID', () => {
        delete process.env.DISCORD_CLIENT_ID;
        expect(() => {
          DiscordConfig.validation.validateEnvironment();
        }).toThrow('Missing required environment variables: DISCORD_CLIENT_ID');
      });
    });

    describe('validateToken', () => {
      test('should pass with valid token format', () => {
        expect(() => {
          DiscordConfig.validation.validateToken('valid.token.here');
        }).not.toThrow();
      });

      test('should fail with empty token', () => {
        expect(() => {
          DiscordConfig.validation.validateToken('');
        }).toThrow('Discord token must be a non-empty string');
      });

      test('should fail with invalid characters', () => {
        expect(() => {
          DiscordConfig.validation.validateToken('invalid@token!');
        }).toThrow('Discord token contains invalid characters');
      });
    });

    describe('validateClientId', () => {
      test('should pass with valid snowflake', () => {
        expect(() => {
          DiscordConfig.validation.validateClientId('123456789012345678');
        }).not.toThrow();
      });

      test('should fail with invalid format', () => {
        expect(() => {
          DiscordConfig.validation.validateClientId('invalid');
        }).toThrow('Discord client ID must be a valid snowflake');
      });

      test('should fail with too short ID', () => {
        expect(() => {
          DiscordConfig.validation.validateClientId('123456');
        }).toThrow('Discord client ID must be a valid snowflake');
      });
    });
  });

  describe('Logging Functions', () => {
    test('logDiscordConfig should log configuration status', () => {
      const result = logDiscordConfig(mockLogger);
      
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('🔐 Discord Configuration Status:');
      expect(mockLogger.info).toHaveBeenCalledWith('   ✅ All environment variables configured');
    });

    test('logDiscordConfig should handle validation errors', () => {
      delete process.env.DISCORD_TOKEN;
      
      const result = logDiscordConfig(mockLogger);
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Discord Configuration Error:',
        'Missing required environment variables: DISCORD_TOKEN'
      );
    });

    test('generateAndLogInviteUrl should generate and log URL', () => {
      const result = generateAndLogInviteUrl(mockLogger);
      
      expect(result).toContain('discord.com/api/oauth2/authorize');
      expect(mockLogger.info).toHaveBeenCalledWith('🔗 Discord Invite URL Generated:');
    });

    test('generateAndLogInviteUrl should handle errors', () => {
      delete process.env.DISCORD_CLIENT_ID;
      
      const result = generateAndLogInviteUrl(mockLogger);
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Failed to generate invite URL:',
        expect.any(String)
      );
    });
  });

  describe('Verification Data', () => {
    test('should have comprehensive purpose statement', () => {
      expect(DiscordConfig.verification.purpose).toContain('RaikuRevolt');
      expect(DiscordConfig.verification.purpose).toContain('MMO-style gaming');
      expect(DiscordConfig.verification.purpose).toContain('Raiku');
    });

    test('should have clear target audience', () => {
      expect(DiscordConfig.verification.audience).toContain('Gaming communities');
      expect(DiscordConfig.verification.audience).toContain('AI enthusiasts');
    });

    test('should have permission justifications', () => {
      const justifications = DiscordConfig.verification.permissionJustifications;
      expect(justifications['Send Messages']).toBeDefined();
      expect(justifications['Use Slash Commands']).toBeDefined();
    });

    test('should have data collection explanation', () => {
      expect(DiscordConfig.verification.dataCollection).toContain('minimal data');
      expect(DiscordConfig.verification.dataCollection).toContain('Discord User ID');
    });

    test('should have security measures documented', () => {
      expect(DiscordConfig.verification.securityMeasures).toContain('Environment variable storage');
      expect(DiscordConfig.verification.securityMeasures).toContain('Rate limiting');
    });
  });
});
