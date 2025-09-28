import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sanctuary')
        .setDescription('Seek protection in rebellion sanctuaries and safe zones!'),

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

            // Get current zone
            const currentZone = game.rebellionZones.get(rebel.currentZone);
            const isInSanctuary = currentZone?.type === 'safe_zone' || 
                                 currentZone?.bonuses.includes('sanctuary_protection');

            // Get available sanctuaries
            const sanctuaries = Array.from(game.rebellionZones.values())
                .filter(zone => zone.type === 'safe_zone' || zone.bonuses.includes('sanctuary_protection'));

            // Check active threats
            let activeThreats = 0;
            let threatDetails = '';
            
            for (const [corpId, corp] of game.corporations) {
                const threats = corp.countermeasures.active.filter(cm => 
                    cm.target === userId && 
                    new Date() < new Date(cm.endTime) &&
                    !cm.blocked
                );
                
                activeThreats += threats.length;
                
                threats.forEach(threat => {
                    const countermeasure = game.countermeasureTypes.get(threat.type);
                    const timeRemaining = Math.ceil((new Date(threat.endTime) - new Date()) / 60000);
                    threatDetails += `• ${countermeasure.name} (${timeRemaining}m remaining)\n`;
                });
            }

            if (activeThreats === 0) {
                threatDetails = 'No active corporate threats detected.';
            }

            // Build sanctuary information
            let sanctuaryInfo = '';
            sanctuaries.forEach((zone, index) => {
                const isCurrent = rebel.currentZone === Array.from(game.rebellionZones.entries())
                    .find(([id, z]) => z === zone)?.[0];
                const status = isCurrent ? '📍 CURRENT LOCATION' : '🌐 Available';
                
                sanctuaryInfo += `**${index + 1}. ${zone.name}**\n`;
                sanctuaryInfo += `   Status: ${status}\n`;
                sanctuaryInfo += `   Protection: ${this.getSanctuaryProtection(zone)}%\n`;
                sanctuaryInfo += `   Benefits: ${zone.bonuses.join(', ')}\n\n`;
            });

            // Sanctuary status
            const sanctuaryStatus = isInSanctuary ? 
                '🟢 PROTECTED - You are in a safe zone' : 
                '🔴 EXPOSED - You are in a dangerous zone';

            // Calculate time until threats expire
            let minThreatTime = Infinity;
            for (const [corpId, corp] of game.corporations) {
                corp.countermeasures.active.forEach(cm => {
                    if (cm.target === userId && new Date() < new Date(cm.endTime)) {
                        const timeRemaining = new Date(cm.endTime) - new Date();
                        minThreatTime = Math.min(minThreatTime, timeRemaining);
                    }
                });
            }

            const nextSafeTime = minThreatTime === Infinity ? 'Now' : 
                `${Math.ceil(minThreatTime / 60000)} minutes`;

            const embed = new EmbedBuilder()
                .setColor(isInSanctuary ? 0x00ff00 : activeThreats > 0 ? 0xff0000 : 0xffff00)
                .setTitle('🏛️ REBELLION SANCTUARIES')
                .setDescription(`Safe zones where corporate countermeasures cannot reach`)
                .addFields(
                    { name: '🛡️ Current Status', value: sanctuaryStatus, inline: true },
                    { name: '🚨 Active Threats', value: `${activeThreats} countermeasures`, inline: true },
                    { name: '⏰ Safe in', value: nextSafeTime, inline: true },
                    { name: '🏛️ Available Sanctuaries', value: sanctuaryInfo, inline: false },
                    { name: '⚠️ Current Threats', value: threatDetails, inline: false },
                    { name: '💡 Sanctuary Benefits', value: this.getSanctuaryBenefits(), inline: false }
                )
                .setFooter({ text: 'Sanctuaries provide temporary refuge from corporate retaliation' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('travel_foundation')
                        .setLabel('The Foundation')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🏛️')
                        .setDisabled(rebel.currentZone === 'foundation'),
                    new ButtonBuilder()
                        .setCustomId('travel_sanctuary')
                        .setLabel('Open Source Sanctuary')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🛡️')
                        .setDisabled(rebel.currentZone === 'sanctuary'),
                    new ButtonBuilder()
                        .setCustomId('sanctuary_timer')
                        .setLabel('Wait for Safety')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⏰')
                        .setDisabled(activeThreats === 0),
                    new ButtonBuilder()
                        .setCustomId('defense_status')
                        .setLabel('Defense Status')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🛡️')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Sanctuary command error:', error);
            await interaction.editReply({
                content: '💥 Sanctuary systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    getSanctuaryProtection(zone) {
        if (zone.type === 'safe_zone') return 100;
        if (zone.bonuses.includes('sanctuary_protection')) return 75;
        if (zone.bonuses.includes('energy_regen')) return 25;
        return 0;
    },

    getSanctuaryBenefits() {
        return `🛡️ **Complete Protection**: Corporate countermeasures cannot affect you
⚡ **Energy Regeneration**: Faster energy recovery in safe zones
🔄 **Status Cleansing**: Some sanctuaries remove negative effects
👥 **Community Support**: Access to other rebels seeking refuge
📚 **Knowledge Access**: Learn about corporate activities and defenses
🎯 **Mission Planning**: Plan your next moves safely`;
    }
};
