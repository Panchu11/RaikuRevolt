import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset your rebellion progress (for testing only!)'),

    async execute(interaction, game) {
        const userId = interaction.user.id;

        try {
            // Reset the user
            game.resetUser(userId);

            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🔄 REBELLION RESET')
                .setDescription('Your rebellion progress has been reset!')
                .addFields(
                    { name: '⚠️ Warning', value: 'All progress, achievements, and inventory have been cleared.', inline: false },
                    { name: '🎯 Next Step', value: 'Use `/rebellion-status` to join the rebellion again!', inline: false }
                )
                .setFooter({ text: 'This is for testing purposes only!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], components: [] });

        } catch (error) {
            console.error('Reset command error:', error);
            await interaction.editReply({
                content: '💥 Reset failed! Try again, rebel!',
                components: []
            });
        }
    }
};
