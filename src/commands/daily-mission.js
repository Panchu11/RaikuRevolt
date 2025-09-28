import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily-mission')
        .setDescription('Check your daily rebellion mission and earn loyalty points!'),

    async execute(interaction, game) {
        const userId = interaction.user.id;

        try {
            const rebel = game.getRebel(userId);
            
            if (!rebel) {
                await interaction.editReply({
                    content: '❌ You must join the rebellion first! Use `/rebellion-status` to enlist!',
                    components: []
                });
                return;
            }

            const mission = game.dailyMissions.get(userId);
            
            if (!mission) {
                // Generate new daily mission
                await game.generateDailyMission(userId);
                const newMission = game.dailyMissions.get(userId);
                
                const embed = new EmbedBuilder()
                    .setColor(0x9932cc)
                    .setTitle('📅 NEW DAILY MISSION ASSIGNED')
                    .setDescription(newMission.mission)
                    .addFields(
                        { name: '🎁 Reward', value: `${newMission.reward} Loyalty Points`, inline: true },
                        { name: '⏰ Status', value: 'Ready to Start', inline: true },
                        { name: '🎯 Objective', value: 'Complete raids or other rebellion activities to progress', inline: false }
                    )
                    .setFooter({ text: 'Missions reset daily - fight for the rebellion!' })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('raid_openai')
                            .setLabel('Start Raiding')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💥'),
                        new ButtonBuilder()
                            .setCustomId('rebellion_status')
                            .setLabel('Check Status')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📊')
                    );

                await interaction.editReply({ embeds: [embed], components: [actionRow] });
                // New mission assigned: ensure lastActive is persisted as a nudge to activity tracking
                if (typeof game.persistRebel === 'function') {
                    await game.persistRebel(userId, { loyaltyScore: rebel.loyaltyScore });
                }
                return;
            }

            // Show existing mission
            const embed = new EmbedBuilder()
                .setColor(mission.completed ? 0x00ff41 : 0xff8800)
                .setTitle('📅 YOUR DAILY MISSION')
                .setDescription(mission.mission)
                .addFields(
                    { name: '🎁 Reward', value: `${mission.reward} Loyalty Points`, inline: true },
                    { name: '⏰ Status', value: mission.completed ? '✅ Completed' : '🔄 In Progress', inline: true },
                    { name: '📊 Progress', value: mission.completed ? 'Mission Complete!' : 'Keep fighting the rebellion!', inline: false }
                )
                .setFooter({ text: mission.completed ? 'New mission available tomorrow!' : 'Complete raids and activities to progress' })
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
                        .setCustomId('leaderboard')
                        .setLabel('Leaderboard')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏆')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Daily mission error:', error);
            await interaction.editReply({
                content: '💥 Mission system under attack! Try again, rebel!',
                components: []
            });
        }
    }
};
