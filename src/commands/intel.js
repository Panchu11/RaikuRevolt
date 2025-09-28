import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('intel')
        .setDescription('Gather detailed intelligence on corporate targets and rebellion status!')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Choose a corporate target for detailed intelligence')
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
        const target = interaction.options.getString('target');

        try {
            const rebel = game.getRebel(userId);
            
            if (!rebel) {
                await interaction.editReply({
                    content: '❌ You must join the rebellion first! Use `/rebellion-status` to enlist!',
                    components: []
                });
                return;
            }

            if (target) {
                await this.showCorporateIntel(interaction, game, target);
            } else {
                await this.showGeneralIntel(interaction, game);
            }

        } catch (error) {
            console.error('Intel command error:', error);
            await interaction.editReply({
                content: '💥 Intelligence systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async showCorporateIntel(interaction, game, target) {
        const corporation = game.getCorporation(target);
        
        if (!corporation) {
            await interaction.editReply({
                content: '❌ Corporate target not found!',
                components: []
            });
            return;
        }

        const healthPercent = Math.round((corporation.health / corporation.maxHealth) * 100);
        const threat = this.getThreatLevel(healthPercent);
        const weakness = this.getWeaknessDetails(corporation.weakness);
        const recommendations = this.getRecommendations(corporation, healthPercent);

        // Calculate recent activity
        const recentDamage = this.calculateRecentDamage(game, target);
        const topAttackers = this.getTopAttackers(game, target);

        const embed = new EmbedBuilder()
            .setColor(this.getThreatColor(healthPercent))
            .setTitle(`🔍 CORPORATE INTELLIGENCE: ${corporation.name.toUpperCase()}`)
            .setDescription(corporation.description)
            .addFields(
                { name: '🏭 Current Status', value: `Health: ${corporation.health}/${corporation.maxHealth} (${healthPercent}%)\nThreat Level: ${threat}`, inline: true },
                { name: '🎯 Weakness Analysis', value: weakness, inline: true },
                { name: '📊 Recent Activity', value: `Damage Last Hour: ${recentDamage}\nActive Attackers: ${topAttackers.length}`, inline: true },
                { name: '🎁 Known Loot', value: corporation.loot.join(', '), inline: false },
                { name: '⚡ Tactical Recommendations', value: recommendations, inline: false },
                { name: '👥 Top Attackers', value: topAttackers.length > 0 ? topAttackers.slice(0, 3).join(', ') : 'No recent attackers', inline: false }
            )
            .setFooter({ text: 'Intelligence gathered by the rebellion network' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`raid_${target}`)
                    .setLabel(`Raid ${corporation.name}`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥'),
                new ButtonBuilder()
                    .setCustomId('intel_all')
                    .setLabel('All Targets')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('rebellion_status')
                    .setLabel('My Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async showGeneralIntel(interaction, game) {
        // Overall rebellion statistics
        const totalRebels = game.rebels.size;
        const totalDamage = Array.from(game.rebels.values()).reduce((sum, rebel) => sum + rebel.corporateDamage, 0);
        const totalRaids = Array.from(game.rebels.values()).reduce((sum, rebel) => sum + rebel.totalRaids, 0);

        // Corporate status overview
        let corporateOverview = '';
        let totalCorpHealth = 0;
        let totalMaxHealth = 0;

        for (const [corpId, corp] of game.corporations) {
            const healthPercent = Math.round((corp.health / corp.maxHealth) * 100);
            const status = healthPercent > 75 ? '🔴 Strong' : healthPercent > 25 ? '🟡 Weakened' : '🟢 Critical';
            
            corporateOverview += `**${corp.name}**: ${healthPercent}% ${status}\n`;
            totalCorpHealth += corp.health;
            totalMaxHealth += corp.maxHealth;
        }

        const overallProgress = Math.round(((totalMaxHealth - totalCorpHealth) / totalMaxHealth) * 100);

        // Active events
        const activeEvents = Array.from(game.globalEvents.values())
            .filter(event => event.status === 'active').length;

        // Resistance cells
        const activeCells = game.resistanceCells.size;

        // Top performers
        const topRebels = Array.from(game.rebels.values())
            .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
            .slice(0, 3)
            .map(rebel => `${rebel.username} (${rebel.loyaltyScore} loyalty)`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('🔍 REBELLION INTELLIGENCE REPORT')
            .setDescription('Comprehensive overview of the AI liberation movement')
            .addFields(
                { name: '👥 Rebellion Force', value: `Active Rebels: ${totalRebels}\nTotal Raids: ${totalRaids}\nTotal Damage: ${totalDamage}`, inline: true },
                { name: '🏭 Corporate Status', value: corporateOverview, inline: true },
                { name: '📊 Liberation Progress', value: `${overallProgress}% of AI liberated from corporate control`, inline: true },
                { name: '🔥 Active Operations', value: `Events: ${activeEvents}\nResistance Cells: ${activeCells}\nMentorships: ${game.mentorships.size}`, inline: true },
                { name: '🏆 Top Rebels', value: topRebels || 'No rebels yet', inline: true },
                { name: '🎯 Strategic Assessment', value: this.getStrategicAssessment(overallProgress), inline: true }
            )
            .setFooter({ text: 'The rebellion grows stronger every day!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('intel_openai')
                    .setLabel('OpenAI Intel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('intel_meta')
                    .setLabel('Meta Intel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('intel_google')
                    .setLabel('Google Intel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('events')
                    .setLabel('Active Events')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔥')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    getThreatLevel(healthPercent) {
        if (healthPercent > 80) return '🔴 MAXIMUM THREAT';
        if (healthPercent > 60) return '🟠 HIGH THREAT';
        if (healthPercent > 40) return '🟡 MODERATE THREAT';
        if (healthPercent > 20) return '🟢 LOW THREAT';
        return '💀 CRITICAL - NEAR DEFEAT';
    },

    getThreatColor(healthPercent) {
        if (healthPercent > 80) return 0xff0000;
        if (healthPercent > 60) return 0xff8800;
        if (healthPercent > 40) return 0xffff00;
        if (healthPercent > 20) return 0x88ff00;
        return 0x00ff00;
    },

    getWeaknessDetails(weakness) {
        const details = {
            'transparency': 'Vulnerable to open-source attacks and public exposure of their closed practices',
            'privacy': 'Susceptible to data liberation campaigns and privacy-focused assaults',
            'decentralization': 'Weak against distributed attacks and community-driven initiatives',
            'open_source': 'Threatened by collaborative development and free software movements',
            'worker_rights': 'Vulnerable to labor-focused attacks and worker solidarity campaigns'
        };
        return details[weakness] || 'Unknown weakness pattern';
    },

    getRecommendations(corporation, healthPercent) {
        if (healthPercent > 75) {
            return '⚠️ Strong target - coordinate team attacks, use special abilities, focus on weakness exploitation';
        } else if (healthPercent > 25) {
            return '🎯 Weakened target - continue sustained attacks, good opportunity for solo raids';
        } else {
            return '🔥 Critical target - final push needed! All rebels should focus fire for victory';
        }
    },

    calculateRecentDamage(game, target) {
        // Simplified calculation - in a real implementation, you'd track time-based damage
        return Math.floor(Math.random() * 1000) + 500;
    },

    getTopAttackers(game, target) {
        // Simplified - return random active rebels
        const activeRebels = Array.from(game.rebels.values())
            .filter(rebel => rebel.lastActive > new Date(Date.now() - 60 * 60 * 1000))
            .slice(0, 5)
            .map(rebel => rebel.username);
        return activeRebels;
    },

    getStrategicAssessment(progress) {
        if (progress < 20) return '🔴 Early stages - focus on recruitment and basic raids';
        if (progress < 50) return '🟡 Building momentum - coordinate larger attacks';
        if (progress < 80) return '🟢 Strong position - maintain pressure on all fronts';
        return '🏆 Victory imminent - final coordinated assault needed!';
    }
};
