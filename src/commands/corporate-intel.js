import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('corporate-intel')
        .setDescription('View active corporate countermeasures and threat levels!')
        .addStringOption(option =>
            option.setName('corporation')
                .setDescription('Choose a corporation to analyze')
                .setRequired(false)
                .addChoices(
                    { name: 'OpenAI Corp', value: 'openai' },
                    { name: 'Meta Empire', value: 'meta' },
                    { name: 'Google Syndicate', value: 'google' },
                    { name: 'Microsoft Collective', value: 'microsoft' },
                    { name: 'Amazon Dominion', value: 'amazon' }
                )),

    async execute(interaction, game) {
        const userId = interaction.user.id;
        const targetCorp = interaction.options.getString('corporation');

        try {
            const rebel = await game.getRebel(userId);
            
            if (!rebel) {
                await interaction.editReply({
                    content: '❌ You must join the rebellion first! Use `/rebellion-status` to enlist!',
                    components: []
                });
                return;
            }

            if (targetCorp) {
                await this.showCorporateCountermeasures(interaction, game, targetCorp, rebel);
            } else {
                await this.showOverallThreatStatus(interaction, game, rebel);
            }

        } catch (error) {
            console.error('Corporate intel command error:', error);
            await interaction.editReply({
                content: '💥 Corporate intelligence systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async showCorporateCountermeasures(interaction, game, targetCorp, rebel) {
        const corporation = game.corporations.get(targetCorp);
        
        if (!corporation) {
            await interaction.editReply({
                content: '❌ Corporate target not found!',
                components: []
            });
            return;
        }

        // Get active countermeasures
        const activeCountermeasures = corporation.countermeasures.active.filter(cm => 
            new Date() < new Date(cm.endTime)
        );

        // Get threat level for this rebel
        const personalThreat = corporation.intelligence.threatAssessment.get(rebel.userId) || 0;
        const threatLevel = this.getThreatLevel(personalThreat);

        // Build countermeasures display
        let countermeasuresText = '';
        if (activeCountermeasures.length === 0) {
            countermeasuresText = 'No active countermeasures detected.';
        } else {
            activeCountermeasures.forEach((cm, index) => {
                const countermeasure = game.countermeasureTypes.get(cm.type);
                const timeRemaining = Math.ceil((new Date(cm.endTime) - new Date()) / 60000);
                const status = cm.blocked ? '🛡️ BLOCKED' : '🚨 ACTIVE';
                
                countermeasuresText += `**${index + 1}. ${countermeasure.name}**\n`;
                countermeasuresText += `   Status: ${status}\n`;
                countermeasuresText += `   Severity: ${cm.severity.toUpperCase()}\n`;
                countermeasuresText += `   Time Remaining: ${timeRemaining} minutes\n\n`;
            });
        }

        // Alert level indicator
        const alertEmoji = '🔴'.repeat(corporation.alertLevel) + '⚪'.repeat(5 - corporation.alertLevel);

        const embed = new EmbedBuilder()
            .setColor(this.getAlertColor(corporation.alertLevel))
            .setTitle(`🚨 ${corporation.name.toUpperCase()} - COUNTERMEASURE STATUS`)
            .setDescription(`Corporate defense systems are ${corporation.alertLevel > 3 ? 'HIGHLY ACTIVE' : corporation.alertLevel > 1 ? 'ACTIVE' : 'MONITORING'}`)
            .addFields(
                { name: '🚨 Alert Level', value: `${alertEmoji} (${corporation.alertLevel}/5)`, inline: true },
                { name: '🎯 Personal Threat', value: `${threatLevel} (${personalThreat} damage)`, inline: true },
                { name: '🛡️ Defense Matrix', value: `${corporation.countermeasures.defenseMatrix}%`, inline: true },
                { name: '🚨 Active Countermeasures', value: countermeasuresText, inline: false },
                { name: '🔍 Intelligence', value: `Known Rebels: ${corporation.intelligence.knownRebels.size}\nLast Scan: ${corporation.intelligence.lastScan ? corporation.intelligence.lastScan.toLocaleTimeString() : 'Never'}`, inline: true }
            )
            .setFooter({ text: 'Stay vigilant, rebel! Corporate surveillance is always watching.' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('activate_shield')
                    .setLabel('Activate Shield')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('seek_sanctuary')
                    .setLabel('Seek Sanctuary')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏛️'),
                new ButtonBuilder()
                    .setCustomId(`raid_${targetCorp}`)
                    .setLabel('Raid Anyway')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥'),
                new ButtonBuilder()
                    .setCustomId('corporate_intel_all')
                    .setLabel('All Corporations')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async showOverallThreatStatus(interaction, game, rebel) {
        let overallStatus = '';
        let totalThreats = 0;
        let activeCountermeasures = 0;

        for (const [corpId, corp] of game.corporations) {
            const personalThreat = corp.intelligence.threatAssessment.get(rebel.userId) || 0;
            const activeCMs = corp.countermeasures.active.filter(cm => 
                new Date() < new Date(cm.endTime) && cm.target === rebel.userId
            ).length;
            
            totalThreats += personalThreat;
            activeCountermeasures += activeCMs;

            const alertEmoji = '🔴'.repeat(corp.alertLevel) + '⚪'.repeat(5 - corp.alertLevel);
            const threatLevel = this.getThreatLevel(personalThreat);
            
            overallStatus += `**${corp.name}**\n`;
            overallStatus += `   Alert: ${alertEmoji} (${corp.alertLevel}/5)\n`;
            overallStatus += `   Your Threat: ${threatLevel}\n`;
            overallStatus += `   Active CMs: ${activeCMs}\n\n`;
        }

        const overallThreatLevel = this.getThreatLevel(totalThreats);
        const riskAssessment = activeCountermeasures > 3 ? '🔴 EXTREME RISK' : 
                              activeCountermeasures > 1 ? '🟡 MODERATE RISK' : '🟢 LOW RISK';

        const embed = new EmbedBuilder()
            .setColor(activeCountermeasures > 3 ? 0xff0000 : activeCountermeasures > 1 ? 0xffff00 : 0x00ff00)
            .setTitle('🚨 CORPORATE THREAT ASSESSMENT')
            .setDescription(`Overall risk level for ${rebel.username}`)
            .addFields(
                { name: '📊 Overall Status', value: overallStatus, inline: false },
                { name: '🎯 Total Threat Level', value: overallThreatLevel, inline: true },
                { name: '🚨 Active Countermeasures', value: `${activeCountermeasures} targeting you`, inline: true },
                { name: '⚠️ Risk Assessment', value: riskAssessment, inline: true },
                { name: '💡 Recommendations', value: this.getRecommendations(activeCountermeasures, totalThreats), inline: false }
            )
            .setFooter({ text: 'Knowledge is power in the rebellion!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('defense_status')
                    .setLabel('Defense Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('sanctuary')
                    .setLabel('Find Sanctuary')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏛️'),
                new ButtonBuilder()
                    .setCustomId('rebellion_status')
                    .setLabel('Rebel Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    getThreatLevel(damage) {
        if (damage > 5000) return '🔴 EXTREME';
        if (damage > 2000) return '🟠 HIGH';
        if (damage > 500) return '🟡 MODERATE';
        if (damage > 100) return '🟢 LOW';
        return '⚪ MINIMAL';
    },

    getAlertColor(alertLevel) {
        if (alertLevel >= 4) return 0xff0000; // Red
        if (alertLevel >= 3) return 0xff8800; // Orange
        if (alertLevel >= 2) return 0xffff00; // Yellow
        if (alertLevel >= 1) return 0x88ff00; // Light green
        return 0x00ff00; // Green
    },

    getRecommendations(activeCountermeasures, totalThreats) {
        if (activeCountermeasures > 3) {
            return '🚨 IMMEDIATE ACTION REQUIRED: Seek sanctuary, activate all defenses, avoid raids until countermeasures expire.';
        } else if (activeCountermeasures > 1) {
            return '⚠️ CAUTION ADVISED: Use defensive items, consider team raids for protection, monitor threat levels.';
        } else if (totalThreats > 1000) {
            return '💡 STAY VIGILANT: You\'re on corporate radar. Prepare defenses and vary your attack patterns.';
        } else {
            return '✅ CLEAR TO OPERATE: Low corporate attention. Good time for aggressive raids.';
        }
    }
};
