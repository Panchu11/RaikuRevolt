import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('battle-plan')
        .setDescription('Plan synchronized attacks and coordinate team strategies!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a battle plan for your raid party')
                .addIntegerOption(option =>
                    option.setName('countdown')
                        .setDescription('Countdown timer in seconds (10-60)')
                        .setRequired(false)
                        .setMinValue(10)
                        .setMaxValue(60)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current battle plan'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('modify')
                .setDescription('Modify existing battle plan'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('execute')
                .setDescription('Execute the coordinated attack!')),

    async execute(interaction, game) {
        const subcommand = interaction.options.getSubcommand();
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

            // Find user's raid party
            const userParty = this.findUserParty(game, rebel.userId);
            if (!userParty) {
                await interaction.editReply({
                    content: '❌ You must be in a raid party to create battle plans! Use `/raid-party create` or `/raid-party join`.',
                    components: []
                });
                return;
            }

            switch (subcommand) {
                case 'create':
                    await this.handleCreatePlan(interaction, game, rebel, userParty);
                    break;
                case 'view':
                    await this.handleViewPlan(interaction, game, rebel, userParty);
                    break;
                case 'modify':
                    await this.handleModifyPlan(interaction, game, rebel, userParty);
                    break;
                case 'execute':
                    await this.handleExecutePlan(interaction, game, rebel, userParty);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Battle plan command error:', error);
            await interaction.editReply({
                content: '💥 Battle planning systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCreatePlan(interaction, game, rebel, userParty) {
        // Only leader can create battle plans
        if (userParty.leader !== rebel.userId) {
            await interaction.editReply({
                content: '❌ Only the raid party leader can create battle plans!',
                components: []
            });
            return;
        }

        // Check if party has minimum members
        const formation = game.formations.get(userParty.formation);
        if (userParty.members.length < formation.minMembers) {
            await interaction.editReply({
                content: `❌ Need at least ${formation.minMembers} members for ${formation.name}!`,
                components: []
            });
            return;
        }

        const countdown = interaction.options.getInteger('countdown') || 30;
        const corporation = game.corporations.get(userParty.target);

        // Create battle plan
        const battlePlan = {
            countdown: countdown,
            strategy: 'coordinated_strike',
            targetWeakness: corporation.weakness,
            memberRoles: this.assignMemberRoles(game, userParty),
            executionTime: null,
            bonuses: this.calculateTeamBonuses(game, userParty)
        };

        userParty.battlePlan = battlePlan;
        userParty.state = 'planning';

        const embed = new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle('📋 BATTLE PLAN CREATED!')
            .setDescription(`Strategic coordination plan for **${corporation.name}** assault`)
            .addFields(
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '⏱️ Countdown', value: `${countdown} seconds`, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '💥 Strategy', value: 'Coordinated Strike', inline: true },
                { name: '🎯 Target Weakness', value: corporation.weakness.replace('_', ' ').toUpperCase(), inline: true },
                { name: '👥 Team Size', value: `${userParty.members.length} rebels`, inline: true },
                { name: '📊 Team Bonuses', value: this.formatBonuses(battlePlan.bonuses), inline: false },
                { name: '👥 Member Roles', value: this.formatMemberRoles(game, battlePlan.memberRoles), inline: false },
                { name: '⚠️ Instructions', value: 'All members must click "Ready for Raid" before execution!', inline: false }
            )
            .setFooter({ text: 'Coordinate your attack for maximum effectiveness!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`notify_team_${userParty.id}`)
                    .setLabel('Notify Team')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📢'),
                new ButtonBuilder()
                    .setCustomId(`modify_plan_${userParty.id}`)
                    .setLabel('Modify Plan')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId(`ready_check_${userParty.id}`)
                    .setLabel('Ready Check')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`execute_plan_${userParty.id}`)
                    .setLabel('Execute Plan')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥')
                    .setDisabled(true) // Enabled when all members ready
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleViewPlan(interaction, game, rebel, userParty) {
        if (!userParty.battlePlan) {
            await interaction.editReply({
                content: '❌ No battle plan exists! The leader must create one first.',
                components: []
            });
            return;
        }

        const corporation = game.corporations.get(userParty.target);
        const formation = game.formations.get(userParty.formation);
        const battlePlan = userParty.battlePlan;

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📋 CURRENT BATTLE PLAN')
            .setDescription(`Strategic plan for **${corporation.name}** assault`)
            .addFields(
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '⏱️ Countdown', value: `${battlePlan.countdown} seconds`, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '📊 Team Status', value: `${userParty.readyMembers.size}/${userParty.members.length} ready`, inline: true },
                { name: '💥 Strategy', value: battlePlan.strategy.replace('_', ' ').toUpperCase(), inline: true },
                { name: '🎯 Weakness', value: battlePlan.targetWeakness.replace('_', ' ').toUpperCase(), inline: true },
                { name: '📊 Team Bonuses', value: this.formatBonuses(battlePlan.bonuses), inline: false },
                { name: '👥 Member Roles', value: this.formatMemberRoles(game, battlePlan.memberRoles), inline: false }
            )
            .setFooter({ text: 'All members must be ready before execution!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ready_for_raid_${userParty.id}`)
                    .setLabel(userParty.readyMembers.has(rebel.userId) ? 'Cancel Ready' : 'Ready for Raid')
                    .setStyle(userParty.readyMembers.has(rebel.userId) ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setEmoji(userParty.readyMembers.has(rebel.userId) ? '❌' : '✅'),
                new ButtonBuilder()
                    .setCustomId(`party_status_${userParty.id}`)
                    .setLabel('Party Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`execute_plan_${userParty.id}`)
                    .setLabel('Execute Plan')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥')
                    .setDisabled(userParty.readyMembers.size < userParty.members.length || rebel.userId !== userParty.leader)
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    assignMemberRoles(game, userParty) {
        const roles = {};
        const formation = game.formations.get(userParty.formation);
        
        userParty.members.forEach((memberId, index) => {
            const member = game.rebels.get(memberId);
            if (!member) return;
            
            // Assign roles based on class and formation
            let role = 'Assault';
            
            switch (member.class) {
                case 'Protocol Hacker':
                    role = 'Primary Striker';
                    break;
                case 'Data Liberator':
                    role = 'Loot Specialist';
                    break;
                case 'Enclave Guardian':
                    role = 'Team Protector';
                    break;
                case 'Model Trainer':
                    role = 'Coordinator';
                    break;
                case 'Community Organizer':
                    role = 'Support';
                    break;
                default:
                    role = 'Assault';
            }
            
            roles[memberId] = role;
        });
        
        return roles;
    },

    calculateTeamBonuses(game, userParty) {
        const formation = game.formations.get(userParty.formation);
        const bonuses = {
            damage: formation.damageBonus,
            energy: formation.energyCost,
            loot: formation.lootBonus || 1.0,
            protection: formation.protectionBonus || 0,
            stealth: formation.stealthBonus || 0
        };
        
        // Add class synergy bonuses
        const classes = userParty.members.map(id => game.rebels.get(id)?.class).filter(Boolean);
        const uniqueClasses = [...new Set(classes)];
        
        if (uniqueClasses.length >= 3) {
            bonuses.damage *= 1.1; // 10% bonus for class diversity
        }
        
        return bonuses;
    },

    formatBonuses(bonuses) {
        let text = '';
        if (bonuses.damage !== 1) text += `• Damage: +${Math.round((bonuses.damage - 1) * 100)}%\n`;
        if (bonuses.energy !== 1) text += `• Energy: ${Math.round(bonuses.energy * 100)}%\n`;
        if (bonuses.loot !== 1) text += `• Loot: +${Math.round((bonuses.loot - 1) * 100)}%\n`;
        if (bonuses.protection > 0) text += `• Protection: ${Math.round(bonuses.protection * 100)}%\n`;
        if (bonuses.stealth > 0) text += `• Stealth: +${Math.round(bonuses.stealth * 100)}%\n`;
        return text || 'No special bonuses';
    },

    formatMemberRoles(game, memberRoles) {
        let text = '';
        for (const [memberId, role] of Object.entries(memberRoles)) {
            const member = game.rebels.get(memberId);
            text += `• **${member?.username || 'Unknown'}**: ${role}\n`;
        }
        return text || 'No roles assigned';
    },

    findUserParty(game, userId) {
        for (const [partyId, party] of game.raidParties) {
            if (party.members.includes(userId)) {
                return party;
            }
        }
        return null;
    }
};
