import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your rebellion achievements and progress!'),

    async execute(interaction, game) {
        const userId = interaction.user.id;

        try {
            const rebel = await game.getRebel(userId);
            
            if (!rebel) {
                await interaction.editReply({
                    content: '❌ You must join the rebellion first! Use `/rebellion-status` to enlist!',
                    components: []
                });
                return;
            }

            const userAchievements = game.achievements.get(userId);
            if (!userAchievements) {
                await interaction.editReply({
                    content: '❌ Achievement data not found! Try rejoining the rebellion.',
                    components: []
                });
                return;
            }

            // Get unlocked achievements
            const unlockedAchievements = userAchievements.unlocked.map(id => 
                game.achievementTemplates.get(id)
            ).filter(Boolean);

            // Calculate total points
            const totalPoints = unlockedAchievements.reduce((sum, achievement) => 
                sum + achievement.points, 0
            );

            // Build achievement display
            let achievementText = '';
            if (unlockedAchievements.length === 0) {
                achievementText = 'No achievements unlocked yet. Start raiding to earn your first badges!';
            } else {
                unlockedAchievements.forEach(achievement => {
                    achievementText += `${achievement.icon} **${achievement.name}**\n`;
                    achievementText += `   ${achievement.description} (+${achievement.points} points)\n\n`;
                });
            }

            // Show progress towards next achievements
            let progressText = '';
            
            // Damage progress
            if (rebel.corporateDamage < 1000) {
                const progress = Math.round((rebel.corporateDamage / 1000) * 100);
                progressText += `💥 Damage Dealer: ${progress}% (${rebel.corporateDamage}/1,000)\n`;
            } else if (rebel.corporateDamage < 10000) {
                const progress = Math.round((rebel.corporateDamage / 10000) * 100);
                progressText += `💀 Corporate Nightmare: ${progress}% (${rebel.corporateDamage}/10,000)\n`;
            } else if (rebel.corporateDamage < 100000) {
                const progress = Math.round((rebel.corporateDamage / 100000) * 100);
                progressText += `🔥 AI Liberator: ${progress}% (${rebel.corporateDamage}/100,000)\n`;
            }

            // Loyalty progress
            if (rebel.loyaltyScore < 100) {
                const progress = Math.round((rebel.loyaltyScore / 100) * 100);
                progressText += `🎯 Loyal Rebel: ${progress}% (${rebel.loyaltyScore}/100)\n`;
            } else if (rebel.loyaltyScore < 1000) {
                const progress = Math.round((rebel.loyaltyScore / 1000) * 100);
                progressText += `👑 Rebellion Leader: ${progress}% (${rebel.loyaltyScore}/1,000)\n`;
            } else if (rebel.loyaltyScore < 10000) {
                const progress = Math.round((rebel.loyaltyScore / 10000) * 100);
                progressText += `⭐ Revolution Commander: ${progress}% (${rebel.loyaltyScore}/10,000)\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xffd700)
                .setTitle(`🏅 ${rebel.username}'s Achievements`)
                .setDescription(achievementText)
                .addFields(
                    { name: '📊 Achievement Stats', value: `🏆 Unlocked: ${unlockedAchievements.length}/${game.achievementTemplates.size}\n🎖️ Total Points: ${totalPoints}`, inline: true },
                    { name: '📈 Progress to Next', value: progressText || 'All major achievements unlocked!', inline: true },
                    { name: '🎯 Rebellion Stats', value: `⚔️ Total Raids: ${rebel.totalRaids}\n💥 Total Damage: ${rebel.corporateDamage}\n🏭 Corps Defeated: ${rebel.corporationsDefeated}`, inline: false }
                )
                .setFooter({ text: 'Keep fighting to unlock more achievements!' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('raid_openai')
                        .setLabel('Raid OpenAI')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💥'),
                    new ButtonBuilder()
                        .setCustomId('rebellion_status')
                        .setLabel('Check Status')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('leaderboard')
                        .setLabel('Leaderboard')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏆')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Achievements command error:', error);
            await interaction.editReply({
                content: '💥 Achievement system under attack! Try again, rebel!',
                components: []
            });
        }
    }
};
