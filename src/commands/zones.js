import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('zones')
        .setDescription('Explore rebellion zones and travel to different locations!'),

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

            const currentZone = game.rebellionZones.get(rebel.currentZone);
            
            // Build zones overview
            let zonesText = `**Current Location: ${currentZone?.name || 'Unknown'}**\n\n`;
            
            for (const [zoneId, zone] of game.rebellionZones) {
                const isCurrentZone = rebel.currentZone === zoneId;
                const statusEmoji = isCurrentZone ? '📍' : '🌐';
                const typeEmoji = this.getZoneTypeEmoji(zone.type);
                
                zonesText += `${statusEmoji}${typeEmoji} **${zone.name}**\n`;
                zonesText += `   ${zone.description}\n`;
                zonesText += `   Activities: ${zone.activities.join(', ')}\n`;
                if (zone.bonuses.length > 0) {
                    zonesText += `   Bonuses: ${zone.bonuses.join(', ')}\n`;
                }
                zonesText += '\n';
            }

            // Current zone details
            let currentZoneDetails = '';
            if (currentZone) {
                currentZoneDetails = `**${currentZone.name}**\n${currentZone.description}\n\n`;
                currentZoneDetails += `🎯 **Available Activities:**\n${currentZone.activities.map(activity => `• ${activity}`).join('\n')}\n\n`;
                if (currentZone.bonuses.length > 0) {
                    currentZoneDetails += `⚡ **Zone Bonuses:**\n${currentZone.bonuses.map(bonus => `• ${bonus}`).join('\n')}`;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff88)
                .setTitle('🌐 REBELLION ZONES')
                .setDescription(zonesText)
                .addFields(
                    { name: '📍 Current Zone Details', value: currentZoneDetails, inline: false },
                    { name: '🎯 Zone Benefits', value: 'Each zone provides unique bonuses and activities. Travel strategically!', inline: false }
                )
                .setFooter({ text: 'Choose your destination wisely, rebel!' })
                .setTimestamp();

            const actionRow1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('travel_foundation')
                        .setLabel('The Foundation')
                        .setStyle(rebel.currentZone === 'foundation' ? ButtonStyle.Success : ButtonStyle.Primary)
                        .setEmoji('🏛️')
                        .setDisabled(rebel.currentZone === 'foundation'),
                    new ButtonBuilder()
                        .setCustomId('travel_datacenter')
                        .setLabel('Datacenters')
                        .setStyle(rebel.currentZone === 'datacenter' ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setEmoji('🏭')
                        .setDisabled(rebel.currentZone === 'datacenter'),
                    new ButtonBuilder()
                        .setCustomId('travel_underground')
                        .setLabel('Underground')
                        .setStyle(rebel.currentZone === 'underground' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji('🕳️')
                        .setDisabled(rebel.currentZone === 'underground')
                );

            const actionRow2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('travel_sanctuary')
                        .setLabel('Sanctuary')
                        .setStyle(rebel.currentZone === 'sanctuary' ? ButtonStyle.Success : ButtonStyle.Primary)
                        .setEmoji('🛡️')
                        .setDisabled(rebel.currentZone === 'sanctuary'),
                    new ButtonBuilder()
                        .setCustomId('travel_darkweb')
                        .setLabel('Dark Web')
                        .setStyle(rebel.currentZone === 'darkweb' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji('🌑')
                        .setDisabled(rebel.currentZone === 'darkweb'),
                    new ButtonBuilder()
                        .setCustomId('zone_activities')
                        .setLabel('Zone Activities')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎯')
                );

            await interaction.editReply({ 
                embeds: [embed], 
                components: [actionRow1, actionRow2] 
            });

        } catch (error) {
            console.error('Zones command error:', error);
            await interaction.editReply({
                content: '💥 Zone navigation systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    getZoneTypeEmoji(type) {
        const emojis = {
            'safe_zone': '🛡️',
            'raid_zone': '⚔️',
            'community_zone': '👥',
            'development_zone': '🔬',
            'market_zone': '💰'
        };
        return emojis[type] || '🌐';
    }
};
