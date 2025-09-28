import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top rebels in the AI uprising!'),

    async execute(interaction, game) {
        try {
            const topRebels = Array.from(game.rebels.values())
                .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
                .slice(0, 15);

            if (topRebels.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xff4444)
                    .setTitle('🏆 REBELLION LEADERBOARD')
                    .setDescription('No rebels yet! Be the first to join the uprising!')
                    .addFields(
                        { name: '🎯 How to Join', value: 'Use `/rebellion-status` to enlist in the AI revolution!', inline: false },
                        { name: '⚔️ How to Climb', value: 'Raid corporations, complete missions, and earn loyalty points!', inline: false }
                    )
                    .setFooter({ text: 'The revolution needs YOU!' })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('rebellion_status')
                            .setLabel('Join Rebellion')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔥')
                    );

                await interaction.editReply({ embeds: [embed], components: [actionRow] });
                return;
            }

            // Calculate total rebellion stats
            const totalLoyalty = topRebels.reduce((sum, rebel) => sum + rebel.loyaltyScore, 0);
            const totalDamage = topRebels.reduce((sum, rebel) => sum + rebel.corporateDamage, 0);
            const totalRebels = game.rebels.size;

            // Calculate corporate status
            let corporateStatus = '';
            let totalCorpHealth = 0;
            let totalMaxHealth = 0;
            
            for (const [corpId, corp] of game.corporations) {
                totalCorpHealth += corp.health;
                totalMaxHealth += corp.maxHealth;
                const healthPercent = Math.round((corp.health / corp.maxHealth) * 100);
                corporateStatus += `${corp.name}: ${healthPercent}% 💀\n`;
            }
            
            const rebellionProgress = Math.round(((totalMaxHealth - totalCorpHealth) / totalMaxHealth) * 100);

            // Build leaderboard text
            let leaderboardText = '';
            topRebels.forEach((rebel, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                leaderboardText += `${medal} **${rebel.username}** (${rebel.class})\n`;
                leaderboardText += `   🎖️ Loyalty: ${rebel.loyaltyScore} | 💥 Damage: ${rebel.corporateDamage}\n`;
                if (index < 14) leaderboardText += '\n';
            });

            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setTitle('🏆 REBELLION LEADERBOARD')
                .setDescription(leaderboardText)
                .addFields(
                    { name: '📊 Rebellion Stats', value: `👥 Total Rebels: ${totalRebels}\n🎖️ Total Loyalty: ${totalLoyalty}\n💥 Total Damage: ${totalDamage}`, inline: true },
                    { name: '🏭 Corporate Status', value: corporateStatus, inline: true },
                    { name: '📈 Liberation Progress', value: `${rebellionProgress}% of AI liberated from corporate control!`, inline: false }
                )
                .setFooter({ text: 'Fight harder to climb the ranks and liberate AI!' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
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
                        .setCustomId('rebellion_status')
                        .setLabel('My Status')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('daily_mission')
                        .setLabel('Daily Mission')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📅')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Leaderboard error:', error);
            await interaction.editReply({
                content: '💥 Leaderboard systems under corporate attack! Try again, rebel!',
                components: []
            });
        }
    }
};
