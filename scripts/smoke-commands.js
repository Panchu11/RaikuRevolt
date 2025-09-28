#!/usr/bin/env node
// ESM script to smoke-test command modules by invoking execute() with mock interaction and game
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsDir = path.join(__dirname, '..', 'src', 'commands');

function buildMockGame(userId) {
  const game = {
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
    tradeCategories: new Map([
      ['weapons', { id: 'weapons', name: 'Weapons & Tools', description: 'Offensive gear', tax: 0.05, items: [] }],
      ['data', { id: 'data', name: 'Data & Intelligence', description: 'Intel items', tax: 0.05, items: [] }],
      ['resources', { id: 'resources', name: 'Resources & Materials', description: 'Materials', tax: 0.05, items: [] }],
      ['defensive', { id: 'defensive', name: 'Defensive Items', description: 'Defense', tax: 0.05, items: [] }],
      ['rare', { id: 'rare', name: 'Rare & Legendary', description: 'Rares', tax: 0.1, items: [] }]
    ]),
    tradeOfferTypes: new Map([
      ['marketplace', { fee: 5 }]
    ]),
    defensiveItems: new Map([
      ['shield', { id: 'shield' }]
    ]),
    getRebel: (uid) => game.rebels.get(uid),
    getCorporation: (id) => game.corporations.get(id),
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
  };

  // Seed rebel and inventory
  const rebel = {
    userId,
    username: 'TestUser',
    class: 'Protocol Hacker',
    level: 5,
    experience: 1000,
    energy: 100,
    maxEnergy: 100,
    loyaltyScore: 100,
    corporateDamage: 0,
    lastActive: new Date()
  };
  game.rebels.set(userId, rebel);
  game.inventory.set(userId, { items: [], credits: 1000, capacity: 50 });

  // Seed corporations
  const corps = [
    ['openai', 'OpenAI Corp'],
    ['meta', 'Meta Empire'],
    ['google', 'Google Syndicate'],
    ['microsoft', 'Microsoft Collective'],
    ['amazon', 'Amazon Dominion']
  ];
  corps.forEach(([id, name]) => {
    game.corporations.set(id, { name, health: 10000, maxHealth: 10000, loot: ['Intel', 'Credits'] });
  });

  return game;
}

function buildMockInteractionFromCommand(commandDataJson, userId) {
  // Extract simple first subcommand (if any) and required options, default values
  const optionsRoot = commandDataJson?.options || [];
  let subcommand = null;
  let optionDefs = optionsRoot;
  if (optionsRoot.length > 0 && optionsRoot[0].type === 1 /* SUB_COMMAND */) {
    subcommand = optionsRoot[0].name;
    optionDefs = optionsRoot[0].options || [];
  }

  const optionValues = {};
  for (const opt of optionDefs) {
    if (opt.required) {
      if (opt.choices && opt.choices.length > 0) {
        optionValues[opt.name] = opt.choices[0].value;
      } else {
        // Provide a sensible default
        optionValues[opt.name] =
          opt.type === 4 /* INTEGER */ ? 1 : opt.type === 5 /* BOOLEAN */ ? true : 'test';
      }
    }
  }

  const mock = {
    user: { id: userId, username: 'TestUser' },
    guild: { id: '987654321098765432', name: 'Test Guild' },
    deferred: false,
    replied: false,
    options: {
      getSubcommand: () => subcommand,
      getString: (name) => optionValues[name] ?? null,
      getInteger: (name) => optionValues[name] ?? null,
      getBoolean: (name) => optionValues[name] ?? null,
      getUser: () => null
    },
    reply: async () => {},
    deferReply: async () => { mock.deferred = true; },
    editReply: async () => {},
    followUp: async () => {}
  };
  return mock;
}

async function main() {
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));
  const userId = '123456789012345678';
  const game = buildMockGame(userId);
  const results = [];

  for (const file of files) {
    const fullPath = `file:///${path.join(commandsDir, file).replace(/\\/g, '/')}`;
    try {
      const mod = await import(fullPath);
      const command = mod.default || mod;
      if (!command?.data || !command?.execute) {
        results.push({ command: file, status: 'skip', reason: 'No data/execute' });
        continue;
      }
      const json = command.data.toJSON ? command.data.toJSON() : { name: command.data.name };
      const interaction = buildMockInteractionFromCommand(json, userId);
      try {
        await command.execute(interaction, game);
        results.push({ command: json.name || file, status: 'ok' });
      } catch (err) {
        results.push({ command: json.name || file, status: 'error', error: err?.message || String(err) });
      }
    } catch (e) {
      results.push({ command: file, status: 'load_error', error: e?.message || String(e) });
    }
  }

  // Print summary
  const ok = results.filter((r) => r.status === 'ok').length;
  const errs = results.filter((r) => r.status !== 'ok');
  console.log('Command smoke test summary:');
  console.table(
    results.map((r) => ({ command: r.command, status: r.status, error: r.error || '' }))
  );
  if (errs.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Smoke test runner crashed:', e);
  process.exitCode = 1;
});


