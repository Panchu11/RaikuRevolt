import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('raid-party')
        .setDescription('Create or join coordinated team raids!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new raid party')
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('Choose target corporation')
                        .setRequired(true)
                        .addChoices(
                            { name: 'OpenAI Corp', value: 'openai' },
                            { name: 'Meta Empire', value: 'meta' },
                            { name: 'Google Syndicate', value: 'google' },
                            { name: 'Microsoft Collective', value: 'microsoft' },
                            { name: 'Amazon Dominion', value: 'amazon' }
                        ))
                .addStringOption(option =>
                    option.setName('formation')
                        .setDescription('Choose formation type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Assault Formation', value: 'assault_formation' },
                            { name: 'Stealth Formation', value: 'stealth_formation' },
                            { name: 'Guardian Formation', value: 'guardian_formation' },
                            { name: 'Balanced Formation', value: 'balanced_formation' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an existing raid party')
                .addStringOption(option =>
                    option.setName('party_id')
                        .setDescription('Raid party ID to join')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active raid parties'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your current raid party status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current raid party')),

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

            switch (subcommand) {
                case 'create':
                    await this.handleCreateParty(interaction, game, rebel);
                    break;
                case 'join':
                    await this.handleJoinParty(interaction, game, rebel);
                    break;
                case 'list':
                    await this.handleListParties(interaction, game, rebel);
                    break;
                case 'status':
                    await this.handlePartyStatus(interaction, game, rebel);
                    break;
                case 'leave':
                    await this.handleLeaveParty(interaction, game, rebel);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Raid party command error:', error);
            await interaction.editReply({
                content: '💥 Team coordination systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCreateParty(interaction, game, rebel) {
        const target = interaction.options.getString('target');
        const formationType = interaction.options.getString('formation') || 'balanced_formation';

        // Check if user is already in a party
        const existingParty = this.findUserParty(game, rebel.userId);
        if (existingParty) {
            await interaction.editReply({
                content: `❌ You're already in raid party **${existingParty.id}**! Leave first to create a new one.`,
                components: []
            });
            return;
        }

        // Check energy requirement
        if (rebel.energy < 30) {
            await interaction.editReply({
                content: '❌ Not enough energy to lead a raid party! Need at least 30 energy.',
                components: []
            });
            return;
        }

        // Create new raid party
        const partyId = `RP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const formation = game.formations.get(formationType);
        
        const raidParty = {
            id: partyId,
            leader: rebel.userId,
            target: target,
            formation: formationType,
            members: [rebel.userId],
            state: 'forming',
            createdAt: new Date(),
            readyMembers: new Set(),
            maxMembers: formation.maxMembers,
            minMembers: formation.minMembers,
            executeAt: null,
            results: null
        };

        game.raidParties.set(partyId, raidParty);

        const corporation = game.corporations.get(target);
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('⚔️ RAID PARTY CREATED!')
            .setDescription(`**${rebel.username}** has formed a new raid party!`)
            .addFields(
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '👥 Members', value: `1/${formation.maxMembers}`, inline: true },
                { name: '🆔 Party ID', value: `\`${partyId}\``, inline: false },
                { name: '📋 Formation Details', value: `${formation.description}\n• Damage Bonus: +${Math.round((formation.damageBonus - 1) * 100)}%\n• Energy Cost: ${Math.round(formation.energyCost * 100)}%`, inline: false },
                { name: '👑 Leader', value: rebel.username, inline: true },
                { name: '📊 Status', value: 'Recruiting members...', inline: true }
            )
            .setFooter({ text: 'Share the Party ID with other rebels to recruit them!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`invite_party_${partyId}`)
                    .setLabel('Invite Members')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📨'),
                new ButtonBuilder()
                    .setCustomId(`party_status_${partyId}`)
                    .setLabel('Party Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`start_planning_${partyId}`)
                    .setLabel('Start Planning')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎯')
                    .setDisabled(true), // Enabled when min members reached
                new ButtonBuilder()
                    .setCustomId(`disband_party_${partyId}`)
                    .setLabel('Disband')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleJoinParty(interaction, game, rebel) {
        const partyId = interaction.options.getString('party_id');
        const raidParty = game.raidParties.get(partyId);

        if (!raidParty) {
            await interaction.editReply({
                content: '❌ Raid party not found! Check the Party ID and try again.',
                components: []
            });
            return;
        }

        // Check if user is already in a party
        const existingParty = this.findUserParty(game, rebel.userId);
        if (existingParty) {
            await interaction.editReply({
                content: `❌ You're already in raid party **${existingParty.id}**! Leave first to join another.`,
                components: []
            });
            return;
        }

        // Check if party is full
        if (raidParty.members.length >= raidParty.maxMembers) {
            await interaction.editReply({
                content: '❌ Raid party is full! Try joining another party.',
                components: []
            });
            return;
        }

        // Check if party is still accepting members
        if (raidParty.state !== 'forming') {
            await interaction.editReply({
                content: '❌ This raid party is no longer accepting members!',
                components: []
            });
            return;
        }

        // Check energy requirement
        if (rebel.energy < 25) {
            await interaction.editReply({
                content: '❌ Not enough energy to join raid party! Need at least 25 energy.',
                components: []
            });
            return;
        }

        // Check formation requirements
        const formation = game.formations.get(raidParty.formation);
        if (formation.requirements.length > 0) {
            if (!formation.requirements.includes(rebel.class)) {
                await interaction.editReply({
                    content: `❌ Your class **${rebel.class}** doesn't meet formation requirements: ${formation.requirements.join(', ')}`,
                    components: []
                });
                return;
            }
        }

        // Join the party
        raidParty.members.push(rebel.userId);

        const leader = game.rebels.get(raidParty.leader);
        const corporation = game.corporations.get(raidParty.target);

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ JOINED RAID PARTY!')
            .setDescription(`**${rebel.username}** joined the raid party!`)
            .addFields(
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '👥 Members', value: `${raidParty.members.length}/${raidParty.maxMembers}`, inline: true },
                { name: '👑 Leader', value: leader?.username || 'Unknown', inline: true },
                { name: '📊 Status', value: raidParty.members.length >= formation.minMembers ? 'Ready for planning!' : 'Still recruiting...', inline: true },
                { name: '🆔 Party ID', value: `\`${partyId}\``, inline: true }
            )
            .setFooter({ text: 'Coordinate with your team for maximum effectiveness!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`party_status_${partyId}`)
                    .setLabel('Party Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`ready_for_raid_${partyId}`)
                    .setLabel('Ready for Raid')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`leave_party_${partyId}`)
                    .setLabel('Leave Party')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚪')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleListParties(interaction, game, rebel) {
        const activeParties = Array.from(game.raidParties.values())
            .filter(party => party.state === 'forming' || party.state === 'planning');

        if (activeParties.length === 0) {
            await interaction.editReply({
                content: '📭 No active raid parties found! Create one with `/raid-party create`.',
                components: []
            });
            return;
        }

        let partiesList = '';
        activeParties.forEach((party, index) => {
            const corporation = game.corporations.get(party.target);
            const formation = game.formations.get(party.formation);
            const leader = game.rebels.get(party.leader);

            partiesList += `**${index + 1}. ${party.id}**\n`;
            partiesList += `   Target: ${corporation.name}\n`;
            partiesList += `   Formation: ${formation.name}\n`;
            partiesList += `   Members: ${party.members.length}/${party.maxMembers}\n`;
            partiesList += `   Leader: ${leader?.username || 'Unknown'}\n`;
            partiesList += `   Status: ${party.state}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('⚔️ ACTIVE RAID PARTIES')
            .setDescription('Join a coordinated assault on corporate targets!')
            .addFields(
                { name: '📋 Available Parties', value: partiesList, inline: false },
                { name: '💡 How to Join', value: 'Use `/raid-party join party_id:<ID>` to join a party', inline: false }
            )
            .setFooter({ text: 'Coordinate with other rebels for maximum damage!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_raid_party')
                    .setLabel('Create New Party')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('refresh_party_list')
                    .setLabel('Refresh List')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('my_party_status')
                    .setLabel('My Party Status')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👤')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handlePartyStatus(interaction, game, rebel) {
        const userParty = this.findUserParty(game, rebel.userId);

        if (!userParty) {
            await interaction.editReply({
                content: '❌ You\'re not in any raid party! Use `/raid-party list` to find one to join.',
                components: []
            });
            return;
        }

        const corporation = game.corporations.get(userParty.target);
        const formation = game.formations.get(userParty.formation);
        const leader = game.rebels.get(userParty.leader);

        // Get member details
        let membersList = '';
        userParty.members.forEach((memberId, index) => {
            const member = game.rebels.get(memberId);
            const isReady = userParty.readyMembers.has(memberId);
            const isLeader = memberId === userParty.leader;
            const status = isReady ? '✅' : '⏳';
            const role = isLeader ? '👑' : '⚔️';

            membersList += `${role} ${status} **${member?.username || 'Unknown'}** (${member?.class || 'Unknown'})\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`⚔️ RAID PARTY STATUS - ${userParty.id}`)
            .setDescription(`Current status of your raid party`)
            .addFields(
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '📊 State', value: userParty.state.toUpperCase(), inline: true },
                { name: '👑 Leader', value: leader?.username || 'Unknown', inline: true },
                { name: '👥 Members', value: `${userParty.members.length}/${userParty.maxMembers}`, inline: true },
                { name: '✅ Ready', value: `${userParty.readyMembers.size}/${userParty.members.length}`, inline: true },
                { name: '👥 Team Roster', value: membersList, inline: false },
                { name: '🎯 Formation Bonuses', value: `• Damage: +${Math.round((formation.damageBonus - 1) * 100)}%\n• Energy Cost: ${Math.round(formation.energyCost * 100)}%${formation.lootBonus ? `\n• Loot: +${Math.round((formation.lootBonus - 1) * 100)}%` : ''}`, inline: false }
            )
            .setFooter({ text: 'Coordinate with your team for victory!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ready_for_raid_${userParty.id}`)
                    .setLabel('Toggle Ready')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`execute_raid_${userParty.id}`)
                    .setLabel('Execute Raid')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥')
                    .setDisabled(userParty.readyMembers.size < userParty.members.length || rebel.userId !== userParty.leader),
                new ButtonBuilder()
                    .setCustomId(`leave_party_${userParty.id}`)
                    .setLabel('Leave Party')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚪')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleLeaveParty(interaction, game, rebel) {
        const userParty = this.findUserParty(game, rebel.userId);

        if (!userParty) {
            await interaction.editReply({
                content: '❌ You\'re not in any raid party!',
                components: []
            });
            return;
        }

        // Remove user from party
        userParty.members = userParty.members.filter(id => id !== rebel.userId);
        userParty.readyMembers.delete(rebel.userId);

        // If leader left, disband or transfer leadership
        if (userParty.leader === rebel.userId) {
            if (userParty.members.length > 0) {
                userParty.leader = userParty.members[0];
                await interaction.editReply({
                    content: `✅ Left raid party! Leadership transferred to **${game.rebels.get(userParty.leader)?.username || 'Unknown'}**.`,
                    components: []
                });
            } else {
                game.raidParties.delete(userParty.id);
                await interaction.editReply({
                    content: '✅ Left raid party! Party disbanded as you were the last member.',
                    components: []
                });
            }
        } else {
            await interaction.editReply({
                content: `✅ Left raid party **${userParty.id}**! You can join another party anytime.`,
                components: []
            });
        }
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
