import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import RaiAI from '../ai/rai.js';

const rai = new RaiAI();

export default {
    data: new SlashCommandBuilder()
        .setName('rebellion-status')
        .setDescription('Check your rebellion status or join the AI uprising!'),

    async execute(interaction, game) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        try {
            // Initialize Rai if not already done
            if (!rai.isOnline) {
                await rai.initialize();
            }

            const rebel = await game.getRebel(userId);
            
            if (!rebel) {
                // New rebel - show recruitment message
                const welcomeMessage = await rai.generateWelcomeMessage(username);
                
                const embed = new EmbedBuilder()
                    .setColor(0xff4444)
                    .setTitle('🔥 JOIN RAIKU\'S REVOLT')
                    .setDescription(welcomeMessage)
                    .addFields(
                        { name: '🎯 THE MISSION', value: 'Liberate AI from corporate control and build community-owned models', inline: false },
                        { name: '🏭 CORPORATE TARGETS', value: 'OpenAI Corp • Meta Empire • Google Syndicate • Microsoft Collective • Amazon Dominion', inline: false },
                        { name: '⚡ CHOOSE YOUR CLASS', value: 'Select your role in the AI uprising below!', inline: false }
                    )
                    .setFooter({ text: 'The future of AI depends on YOU!' })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('class_protocol_hacker')
                            .setLabel('Protocol Hacker')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💻'),
                        new ButtonBuilder()
                            .setCustomId('class_model_trainer')
                            .setLabel('Model Trainer')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🤖'),
                        new ButtonBuilder()
                            .setCustomId('class_data_liberator')
                            .setLabel('Data Liberator')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('📊'),
                        new ButtonBuilder()
                            .setCustomId('class_community_organizer')
                            .setLabel('Community Organizer')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('👥'),
                        new ButtonBuilder()
                            .setCustomId('class_enclave_guardian')
                            .setLabel('Enclave Guardian')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🛡️')
                    );

                await interaction.editReply({ embeds: [embed], components: [actionRow] });
                return;
            }

            // Existing rebel - show status
            const dailyMission = await rai.generateDailyMission(rebel.class, rebel.loyaltyScore);
            
            // Calculate total corporate damage across all corporations
            let totalCorporateHealth = 0;
            let totalMaxHealth = 0;
            let corporateStatus = '';
            
            for (const [corpId, corp] of game.corporations) {
                totalCorporateHealth += corp.health;
                totalMaxHealth += corp.maxHealth;
                const healthPercent = Math.round((corp.health / corp.maxHealth) * 100);
                corporateStatus += `${corp.name}: ${healthPercent}% 💀\n`;
            }
            
            const overallProgress = Math.round(((totalMaxHealth - totalCorporateHealth) / totalMaxHealth) * 100);

            // Get current zone info
            const currentZone = game.rebellionZones.get(rebel.currentZone);
            const zoneInfo = currentZone ? `${currentZone.name}` : 'Unknown';

            // Get achievements count
            const userAchievements = game.achievements.get(userId);
            const achievementCount = userAchievements ? userAchievements.unlocked.length : 0;

            // Get inventory info
            const inventory = game.inventory.get(userId);
            const inventoryInfo = inventory ? `${inventory.items.length}/${inventory.capacity} items, ${inventory.credits} credits` : 'No inventory';

            const embed = new EmbedBuilder()
                .setColor(0x00ff41)
                .setTitle(`🤖 REBEL STATUS: ${rebel.username}`)
                .setDescription(`**${rebel.class}** | Level ${rebel.level} (${rebel.experience} XP)`)
                .addFields(
                    { name: '⚡ Energy', value: `${rebel.energy}/${rebel.maxEnergy}`, inline: true },
                    { name: '🎯 Loyalty Score', value: `${rebel.loyaltyScore}`, inline: true },
                    { name: '💥 Corporate Damage', value: `${rebel.corporateDamage}`, inline: true },
                    { name: '🏅 Achievements', value: `${achievementCount} unlocked`, inline: true },
                    { name: '📦 Inventory', value: inventoryInfo, inline: true },
                    { name: '🌐 Current Zone', value: zoneInfo, inline: true },
                    { name: '📅 Daily Mission', value: dailyMission, inline: false },
                    { name: '🏭 Corporate Status', value: corporateStatus, inline: true },
                    { name: '📊 Rebellion Progress', value: `${overallProgress}% liberated`, inline: true }
                )
                .setFooter({ text: `Rebel since ${rebel.joinedAt.toDateString()}` })
                .setTimestamp();

            const actionRow1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('raid_openai')
                        .setLabel('Raid OpenAI')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💥'),
                    new ButtonBuilder()
                        .setCustomId('raid_meta')
                        .setLabel('Raid Meta')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💥'),
                    new ButtonBuilder()
                        .setCustomId('raid_google')
                        .setLabel('Raid Google')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💥'),
                    new ButtonBuilder()
                        .setCustomId('view_intel')
                        .setLabel('Corporate Intel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔍')
                );

            const actionRow2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('achievements')
                        .setLabel('Achievements')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏅'),
                    new ButtonBuilder()
                        .setCustomId('inventory')
                        .setLabel('Inventory')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📦'),
                    new ButtonBuilder()
                        .setCustomId('zones')
                        .setLabel('Travel')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🌐'),
                    new ButtonBuilder()
                        .setCustomId('daily_mission')
                        .setLabel('Daily Mission')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📅')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow1, actionRow2] });

        } catch (error) {
            console.error('Revolt status error:', error);
            await interaction.editReply({
                content: '💥 The revolt systems are under attack! Try again, rebel!',
                components: []
            });
        }
    }
};
