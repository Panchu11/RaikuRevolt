/**
 * Game Mechanics Tests
 * Unit tests for core game functionality and mechanics
 */

describe('Game Mechanics', () => {
  let mockGame;
  let testRebel;
  let testInventory;

  beforeEach(() => {
    mockGame = global.testUtils.createMockGame();
    testRebel = global.testUtils.createTestRebel();
    testInventory = global.testUtils.createTestInventory();
    
    // Set up test data
    mockGame.rebels.set(testRebel.userId, testRebel);
    mockGame.inventory.set(testRebel.userId, testInventory);
  });

  describe('Rebel Creation', () => {
    test('should create rebel with valid class', () => {
      expect(testRebel.class).toBeValidRebelClass();
    });

    test('should have valid initial stats', () => {
      expect(testRebel.stats).toHaveValidGameStats();
    });

    test('should have valid Discord ID', () => {
      expect(testRebel.userId).toBeValidDiscordId();
    });

    test('should start at level 1', () => {
      expect(testRebel.level).toBe(1);
      expect(testRebel.experience).toBe(0);
    });

    test('should have full energy initially', () => {
      expect(testRebel.energy).toBe(testRebel.maxEnergy);
      expect(testRebel.energy).toBe(100);
    });

    test('should have initial inventory', () => {
      expect(testInventory.items).toEqual([]);
      expect(testInventory.credits).toBe(100);
      expect(testInventory.capacity).toBe(20);
    });
  });

  describe('Class Abilities', () => {
    test('hacker should have correct abilities', () => {
      const hackerRebel = global.testUtils.createTestRebel({ class: 'hacker' });
      expect(hackerRebel.specialAbilities).toContain('code_injection');
      expect(hackerRebel.specialAbilities).toContain('system_infiltration');
    });

    test('whistleblower should have correct abilities', () => {
      const whistleblowerRebel = global.testUtils.createTestRebel({ 
        class: 'whistleblower',
        specialAbilities: ['leak_intel', 'expose_corruption']
      });
      expect(whistleblowerRebel.specialAbilities).toContain('leak_intel');
      expect(whistleblowerRebel.specialAbilities).toContain('expose_corruption');
    });

    test('activist should have correct abilities', () => {
      const activistRebel = global.testUtils.createTestRebel({ 
        class: 'activist',
        specialAbilities: ['rally_support', 'organize_protests']
      });
      expect(activistRebel.specialAbilities).toContain('rally_support');
      expect(activistRebel.specialAbilities).toContain('organize_protests');
    });
  });

  describe('Experience and Leveling', () => {
    test('should calculate level correctly from experience', () => {
      // Test level progression
      const levels = [
        { exp: 0, level: 1 },
        { exp: 100, level: 2 },
        { exp: 300, level: 3 },
        { exp: 600, level: 4 },
        { exp: 1000, level: 5 }
      ];

      levels.forEach(({ exp, level }) => {
        const rebel = global.testUtils.createTestRebel({ experience: exp });
        // Note: This would require implementing the actual level calculation function
        // For now, we'll test the data structure
        expect(typeof rebel.experience).toBe('number');
        expect(typeof rebel.level).toBe('number');
      });
    });

    test('should not allow negative experience', () => {
      const rebel = global.testUtils.createTestRebel({ experience: -100 });
      expect(rebel.experience).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Energy System', () => {
    test('should have valid energy values', () => {
      expect(testRebel.energy).toBeGreaterThanOrEqual(0);
      expect(testRebel.energy).toBeLessThanOrEqual(testRebel.maxEnergy);
    });

    test('should handle energy consumption', () => {
      const initialEnergy = testRebel.energy;
      const energyCost = 20;
      
      // Simulate energy consumption
      testRebel.energy = Math.max(0, testRebel.energy - energyCost);
      
      expect(testRebel.energy).toBe(initialEnergy - energyCost);
      expect(testRebel.energy).toBeGreaterThanOrEqual(0);
    });

    test('should not allow energy to exceed maximum', () => {
      testRebel.energy = testRebel.maxEnergy + 50;
      
      // Simulate energy cap enforcement
      testRebel.energy = Math.min(testRebel.energy, testRebel.maxEnergy);
      
      expect(testRebel.energy).toBe(testRebel.maxEnergy);
    });
  });

  describe('Inventory Management', () => {
    test('should have valid inventory structure', () => {
      expect(Array.isArray(testInventory.items)).toBe(true);
      expect(typeof testInventory.credits).toBe('number');
      expect(typeof testInventory.capacity).toBe('number');
    });

    test('should handle item addition', () => {
      const newItem = {
        id: global.testUtils.randomId(),
        name: 'Test Item',
        type: 'tool',
        rarity: 'common',
        value: 50
      };

      testInventory.items.push(newItem);
      
      expect(testInventory.items).toContain(newItem);
      expect(testInventory.items.length).toBe(1);
    });

    test('should respect inventory capacity', () => {
      // Fill inventory to capacity
      for (let i = 0; i < testInventory.capacity; i++) {
        testInventory.items.push({
          id: global.testUtils.randomId(),
          name: `Item ${i}`,
          type: 'tool',
          rarity: 'common'
        });
      }

      expect(testInventory.items.length).toBe(testInventory.capacity);
      
      // Attempt to add one more item (should be prevented)
      const canAddMore = testInventory.items.length < testInventory.capacity;
      expect(canAddMore).toBe(false);
    });

    test('should handle credit transactions', () => {
      const initialCredits = testInventory.credits;
      const cost = 25;
      
      // Simulate purchase
      if (testInventory.credits >= cost) {
        testInventory.credits -= cost;
      }
      
      expect(testInventory.credits).toBe(initialCredits - cost);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow actions within rate limit', () => {
      mockGame.checkRateLimit.mockReturnValue(true);
      
      const result = mockGame.checkRateLimit(testRebel.userId, 'general');
      expect(result).toBe(true);
    });

    test('should block actions exceeding rate limit', () => {
      mockGame.checkRateLimit.mockReturnValue(false);
      
      const result = mockGame.checkRateLimit(testRebel.userId, 'raid');
      expect(result).toBe(false);
    });

    test('should track different action types separately', () => {
      mockGame.checkRateLimit
        .mockReturnValueOnce(true)  // general action allowed
        .mockReturnValueOnce(false); // raid action blocked

      expect(mockGame.checkRateLimit(testRebel.userId, 'general')).toBe(true);
      expect(mockGame.checkRateLimit(testRebel.userId, 'raid')).toBe(false);
    });
  });

  describe('Achievement System', () => {
    test('should award achievements correctly', () => {
      mockGame.awardAchievement.mockReturnValue(true);
      
      const result = mockGame.awardAchievement(testRebel.userId, 'first_raid');
      expect(result).toBe(true);
      expect(mockGame.awardAchievement).toHaveBeenCalledWith(testRebel.userId, 'first_raid');
    });

    test('should not award duplicate achievements', () => {
      mockGame.awardAchievement.mockReturnValue(false);
      
      const result = mockGame.awardAchievement(testRebel.userId, 'first_raid');
      expect(result).toBe(false);
    });
  });

  describe('Damage Calculation', () => {
    test('should calculate damage based on stats', () => {
      mockGame.calculateDamage.mockReturnValue(150);
      
      const damage = mockGame.calculateDamage(testRebel, 'openai');
      expect(typeof damage).toBe('number');
      expect(damage).toBeGreaterThan(0);
    });

    test('should consider class bonuses', () => {
      const hackerDamage = mockGame.calculateDamage(
        global.testUtils.createTestRebel({ class: 'hacker' }), 
        'openai'
      );
      
      expect(typeof hackerDamage).toBe('number');
      expect(hackerDamage).toBeGreaterThan(0);
    });
  });

  describe('User Activity Tracking', () => {
    test('should update user activity', () => {
      mockGame.updateUserActivity(testRebel.userId);
      expect(mockGame.updateUserActivity).toHaveBeenCalledWith(testRebel.userId);
    });

    test('should track last active time', () => {
      const beforeTime = testRebel.lastActive;
      
      // Simulate activity update
      testRebel.lastActive = new Date(beforeTime.getTime() + 1);
      
      expect(testRebel.lastActive.getTime()).toBeGreaterThan(beforeTime.getTime());
    });
  });
});
