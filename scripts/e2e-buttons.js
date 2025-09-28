#!/usr/bin/env node
// Minimal e2e: registers a message component interaction using Discord REST to trigger a customId
// Requires ENV: DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_TEST_CHANNEL_ID, DISCORD_TEST_GUILD_ID

import { REST, Routes } from 'discord.js';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

async function run() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const channelId = process.env.DISCORD_TEST_CHANNEL_ID;
  const guildId = process.env.DISCORD_TEST_GUILD_ID;
  if (!token || !clientId || !channelId || !guildId) {
    console.error('Missing DISCORD_TOKEN / DISCORD_CLIENT_ID / DISCORD_TEST_CHANNEL_ID / DISCORD_TEST_GUILD_ID');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  // Post a test message with a button customId we expect the bot to handle
  const payload = {
    content: 'E2E Button Test',
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: 'Raid OpenAI',
            style: 4,
            custom_id: 'raid_openai'
          }
        ]
      }
    ]
  };

  const msg = await rest.post(Routes.channelMessages(channelId), { body: payload });
  console.log('Posted test message id:', msg.id);
  console.log('Now click the button in Discord to ensure the bot responds without errors.');
}

run().catch((e) => {
  console.error('E2E error:', e);
  process.exit(1);
});


