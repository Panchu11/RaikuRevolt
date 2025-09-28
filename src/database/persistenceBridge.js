// Persistence bridge to sync critical in-memory updates to PostgreSQL via RebelDAL

export function installPersistenceBridge(game) {
  if (!game?.rebelDAL) {
    return;
  }

  // Provide a helper to persist a rebel's core fields
  game.persistRebel = async function persistRebel(userId, fields = {}) {
    try {
      const payload = {};
      if (typeof fields.energy === 'number') payload.energy = fields.energy;
      if (typeof fields.loyaltyScore === 'number') payload.loyalty_score = fields.loyaltyScore;
      if (typeof fields.totalDamage === 'number') payload.total_damage = fields.totalDamage;
      if (typeof fields.level === 'number') payload.level = fields.level;
      if (typeof fields.experience === 'number') payload.experience = fields.experience;
      if (Object.keys(payload).length > 0) {
        await game.rebelDAL.updateRebel(userId, payload);
      }
    } catch (err) {
      game.logger?.warn?.(`Persistence warning for ${userId}: ${err.message}`);
    }
  };

  // Credits helpers
  game.addCredits = async function addCredits(userId, amount) {
    try {
      await game.rebelDAL.addCredits(userId, amount);
      const rebel = game.rebels.get(userId);
      const inv = game.inventory.get(userId);
      if (inv) inv.credits = (inv.credits || 0) + amount;
      if (rebel) rebel.lastActive = new Date();
    } catch (err) {
      game.logger?.warn?.(`Failed to add credits for ${userId}: ${err.message}`);
    }
  };

  // Loyalty helper
  game.addLoyalty = async function addLoyalty(userId, amount) {
    try {
      await game.rebelDAL.updateLoyaltyScore(userId, amount);
      const rebel = game.rebels.get(userId);
      if (rebel) {
        rebel.loyaltyScore = (rebel.loyaltyScore || 0) + amount;
        rebel.lastActive = new Date();
      }
    } catch (err) {
      game.logger?.warn?.(`Failed to add loyalty for ${userId}: ${err.message}`);
    }
  };
}

export default installPersistenceBridge;


