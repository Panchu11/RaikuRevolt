import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('defense-status')
        .setDescription('Check your defensive capabilities and active protections!'),

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

            const inventory = game.inventory.get(userId);
            if (!inventory) {
                await interaction.editReply({
                    content: '❌ Inventory not found! Try rejoining the rebellion.',
                    components: []
                });
                return;
            }

            // Get defensive items
            const defensiveItems = inventory.items.filter(item => 
                game.defensiveItems.has(item.type)
            );

            // Get active protections
            const activeProtections = defensiveItems.filter(item => 
                item.activatedAt && 
                (Date.now() - item.activatedAt) < game.defensiveItems.get(item.type).duration
            );

            // Calculate overall protection level
            const maxProtection = activeProtections.length > 0 ? 
                Math.max(...activeProtections.map(item => 
                    game.defensiveItems.get(item.type).protection
                )) : 0;

            // Get current zone protection
            const currentZone = game.rebellionZones.get(rebel.currentZone);
            const zoneProtection = currentZone?.bonuses.includes('sanctuary_protection') ? 50 : 0;

            const totalProtection = Math.min(100, maxProtection + zoneProtection);

            // Build defensive items display
            let defensiveItemsText = '';
            if (defensiveItems.length === 0) {
                defensiveItemsText = 'No defensive items in inventory.';
            } else {
                defensiveItems.forEach((item, index) => {
                    const defenseData = game.defensiveItems.get(item.type);
                    const isActive = item.activatedAt && 
                        (Date.now() - item.activatedAt) < defenseData.duration;
                    
                    const status = isActive ? '🟢 ACTIVE' : '⚪ INACTIVE';
                    const timeRemaining = isActive ? 
                        Math.ceil((defenseData.duration - (Date.now() - item.activatedAt)) / 60000) : 0;
                    
                    defensiveItemsText += `**${index + 1}. ${defenseData.name}**\n`;
                    defensiveItemsText += `   Status: ${status}\n`;
                    defensiveItemsText += `   Protection: ${defenseData.protection}%\n`;
                    if (isActive) {
                        defensiveItemsText += `   Time Left: ${timeRemaining} minutes\n`;
                    }
                    defensiveItemsText += '\n';
                });
            }

            // Get active countermeasures targeting this rebel
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
                    threatDetails += `• ${countermeasure.name} from ${corp.name} (${timeRemaining}m)\n`;
                });
            }

            if (activeThreats === 0) {
                threatDetails = 'No active corporate threats detected.';
            }

            // Protection status
            const protectionStatus = totalProtection >= 90 ? '🟢 MAXIMUM PROTECTION' :
                                   totalProtection >= 70 ? '🟡 HIGH PROTECTION' :
                                   totalProtection >= 40 ? '🟠 MODERATE PROTECTION' :
                                   totalProtection >= 20 ? '🔴 LOW PROTECTION' : '💀 VULNERABLE';

            const embed = new EmbedBuilder()
                .setColor(this.getProtectionColor(totalProtection))
                .setTitle(`🛡️ ${rebel.username}'s Defense Status`)
                .setDescription(`Current protection level: **${totalProtection}%**`)
                .addFields(
                    { name: '🛡️ Protection Status', value: protectionStatus, inline: true },
                    { name: '🌐 Zone Bonus', value: `${zoneProtection}% from ${currentZone?.name || 'Unknown'}`, inline: true },
                    { name: '🚨 Active Threats', value: `${activeThreats} corporate countermeasures`, inline: true },
                    { name: '🎒 Defensive Items', value: defensiveItemsText, inline: false },
                    { name: '⚠️ Current Threats', value: threatDetails, inline: false },
                    { name: '💡 Recommendations', value: this.getDefenseRecommendations(totalProtection, activeThreats, defensiveItems.length), inline: false }
                )
                .setFooter({ text: 'Stay protected, rebel! The corporations are always watching.' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('activate_shield')
                        .setLabel('Activate Shield')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🛡️')
                        .setDisabled(activeProtections.length > 0 || defensiveItems.length === 0),
                    new ButtonBuilder()
                        .setCustomId('buy_defense')
                        .setLabel('Buy Defenses')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🛒'),
                    new ButtonBuilder()
                        .setCustomId('seek_sanctuary')
                        .setLabel('Seek Sanctuary')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏛️'),
                    new ButtonBuilder()
                        .setCustomId('corporate_intel_all')
                        .setLabel('Threat Intel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🚨')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Defense status command error:', error);
            await interaction.editReply({
                content: '💥 Defense systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    getProtectionColor(protection) {
        if (protection >= 90) return 0x00ff00; // Green
        if (protection >= 70) return 0x88ff00; // Light green
        if (protection >= 40) return 0xffff00; // Yellow
        if (protection >= 20) return 0xff8800; // Orange
        return 0xff0000; // Red
    },

    getDefenseRecommendations(protection, threats, defenseItems) {
        if (threats > 2 && protection < 50) {
            return '🚨 CRITICAL: Multiple threats with low protection! Activate all defenses and seek sanctuary immediately.';
        } else if (threats > 0 && protection < 70) {
            return '⚠️ WARNING: Corporate countermeasures active. Activate defensive items and avoid high-risk activities.';
        } else if (defenseItems === 0) {
            return '💡 SUGGESTION: Acquire defensive items through raids or purchase them to prepare for corporate retaliation.';
        } else if (protection < 30) {
            return '🛡️ ADVICE: Low protection detected. Activate defensive items or move to a sanctuary zone.';
        } else {
            return '✅ STATUS: Good defensive posture. Continue monitoring for new threats.';
        }
    }
};
