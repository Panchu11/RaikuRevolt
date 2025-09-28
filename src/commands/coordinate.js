import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('coordinate')
        .setDescription('Real-time coordination for synchronized team raids!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('countdown')
                .setDescription('Start synchronized countdown for team raid')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Countdown duration (10-60 seconds)')
                        .setRequired(false)
                        .setMinValue(10)
                        .setMaxValue(60)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check team coordination status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('abort')
                .setDescription('Abort current coordination (leader only)')),

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
                    content: '❌ You must be in a raid party to coordinate attacks! Use `/raid-party create` or `/raid-party join`.',
                    components: []
                });
                return;
            }

            switch (subcommand) {
                case 'countdown':
                    await this.handleCountdown(interaction, game, rebel, userParty);
                    break;
                case 'status':
                    await this.handleStatus(interaction, game, rebel, userParty);
                    break;
                case 'abort':
                    await this.handleAbort(interaction, game, rebel, userParty);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Coordinate command error:', error);
            await interaction.editReply({
                content: '💥 Coordination systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCountdown(interaction, game, rebel, userParty) {
        // Only leader can start countdown
        if (userParty.leader !== rebel.userId) {
            await interaction.editReply({
                content: '❌ Only the raid party leader can start the countdown!',
                components: []
            });
            return;
        }

        // Check if all members are ready
        if (userParty.readyMembers.size < userParty.members.length) {
            await interaction.editReply({
                content: `❌ Not all members are ready! ${userParty.readyMembers.size}/${userParty.members.length} ready.`,
                components: []
            });
            return;
        }

        // Check if already executing
        if (userParty.state === 'executing') {
            await interaction.editReply({
                content: '❌ Raid already in progress!',
                components: []
            });
            return;
        }

        const countdownSeconds = interaction.options.getInteger('seconds') || 30;
        const corporation = game.corporations.get(userParty.target);
        const formation = game.formations.get(userParty.formation);

        // Set execution time
        userParty.executeAt = new Date(Date.now() + (countdownSeconds * 1000));
        userParty.state = 'executing';

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚨 COORDINATED RAID COUNTDOWN!')
            .setDescription(`**SYNCHRONIZED ATTACK ON ${corporation.name.toUpperCase()}**`)
            .addFields(
                { name: '⏰ Countdown', value: `**${countdownSeconds} SECONDS**`, inline: true },
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '👥 Team Size', value: `${userParty.members.length} rebels`, inline: true },
                { name: '💥 Damage Bonus', value: `+${Math.round((formation.damageBonus - 1) * 100)}%`, inline: true },
                { name: '📊 Status', value: 'ALL SYSTEMS GO!', inline: true },
                { name: '⚠️ INSTRUCTIONS', value: '**PREPARE FOR SYNCHRONIZED STRIKE!**\nAll members will attack simultaneously when countdown reaches zero!', inline: false }
            )
            .setFooter({ text: 'The rebellion strikes as one!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`abort_raid_${userParty.id}`)
                    .setLabel('ABORT MISSION')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛑'),
                new ButtonBuilder()
                    .setCustomId(`team_status_${userParty.id}`)
                    .setLabel('Team Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });

        // Start countdown process
        this.startCountdownProcess(game, userParty, countdownSeconds);
    },

    async startCountdownProcess(game, userParty, countdownSeconds) {
        const corporation = game.corporations.get(userParty.target);
        
        // Countdown intervals
        const intervals = [30, 15, 10, 5, 3, 2, 1];
        
        for (const interval of intervals) {
            if (interval <= countdownSeconds) {
                setTimeout(() => {
                    if (userParty.state === 'executing') {
                        game.logger.info(`⏰ Raid countdown: ${interval} seconds remaining for party ${userParty.id}`);
                        // In a real implementation, you'd send updates to all party members
                    }
                }, (countdownSeconds - interval) * 1000);
            }
        }

        // Execute raid when countdown reaches zero
        setTimeout(() => {
            if (userParty.state === 'executing') {
                this.executeCoordinatedRaid(game, userParty);
            }
        }, countdownSeconds * 1000);
    },

    async executeCoordinatedRaid(game, userParty) {
        const corporation = game.corporations.get(userParty.target);
        const formation = game.formations.get(userParty.formation);
        
        // Calculate total team damage
        let totalDamage = 0;
        const memberResults = [];

        for (const memberId of userParty.members) {
            const member = game.rebels.get(memberId);
            if (!member) continue;

            // Calculate individual damage with formation bonuses
            const baseDamage = Math.floor(Math.random() * 200) + 100;
            const formationDamage = Math.floor(baseDamage * formation.damageBonus);
            const finalDamage = Math.floor(formationDamage * (1 + (member.loyaltyScore / 1000)));

            totalDamage += finalDamage;
            
            // Apply energy cost
            const energyCost = Math.floor(30 * formation.energyCost);
            member.energy = Math.max(0, member.energy - energyCost);

            memberResults.push({
                member: member,
                damage: finalDamage,
                energyUsed: energyCost
            });
        }

        // Apply damage to corporation
        corporation.health = Math.max(0, corporation.health - totalDamage);

        // Generate team loot
        const teamLoot = this.generateTeamLoot(game, userParty, totalDamage);

        // Distribute loot among team members
        this.distributeLoot(game, userParty, teamLoot);

        // Process corporate countermeasures (reduced chance due to coordination)
        const stealthBonus = formation.stealthBonus || 0;
        if (Math.random() > stealthBonus) {
            for (const memberId of userParty.members) {
                const member = game.rebels.get(memberId);
                if (member) {
                    game.processCorporateResponse(userParty.target, member, totalDamage / userParty.members.length);
                }
            }
        }

        // Update party state
        userParty.state = 'completed';
        userParty.results = {
            totalDamage: totalDamage,
            memberResults: memberResults,
            loot: teamLoot,
            timestamp: new Date()
        };

        game.logger.info(`⚔️ Coordinated raid completed: Party ${userParty.id} dealt ${totalDamage} damage to ${corporation.name}`);

        // Clean up party after 5 minutes
        setTimeout(() => {
            game.raidParties.delete(userParty.id);
        }, 300000);
    },

    generateTeamLoot(game, userParty, totalDamage) {
        const corporation = game.corporations.get(userParty.target);
        const formation = game.formations.get(userParty.formation);
        const lootMultiplier = formation.lootBonus || 1.0;
        
        const teamLoot = {
            credits: Math.floor((totalDamage / 3) * lootMultiplier),
            items: []
        };

        // Generate items based on team size and damage
        const itemCount = Math.min(userParty.members.length * 2, Math.floor(totalDamage / 150));
        
        for (let i = 0; i < itemCount; i++) {
            const randomItem = corporation.loot[Math.floor(Math.random() * corporation.loot.length)];
            const item = {
                id: `team_${Date.now()}_${i}`,
                name: randomItem,
                type: game.getItemType(randomItem),
                rarity: game.getItemRarity(totalDamage),
                value: Math.floor((totalDamage / userParty.members.length) / 8) + Math.floor(Math.random() * 50),
                acquiredFrom: `Team Raid - ${corporation.name}`,
                acquiredAt: new Date()
            };
            
            teamLoot.items.push(item);
        }

        return teamLoot;
    },

    distributeLoot(game, userParty, teamLoot) {
        const creditsPerMember = Math.floor(teamLoot.credits / userParty.members.length);
        
        userParty.members.forEach(async (memberId, index) => {
            const inventory = game.inventory.get(memberId);
            if (!inventory) return;

            // Distribute credits
            inventory.credits += creditsPerMember;
            if (typeof game.addCredits === 'function') {
                await game.addCredits(memberId, creditsPerMember);
            }

            // Distribute items (round-robin)
            teamLoot.items.forEach((item, itemIndex) => {
                if (itemIndex % userParty.members.length === index) {
                    if (inventory.items.length < inventory.capacity) {
                        inventory.items.push(item);
                        
                        // Persist item to database
                        if (typeof game.rebelDAL?.addItemToInventory === 'function') {
                            game.rebelDAL.addItemToInventory(memberId, item.id, 1).catch(error => {
                                console.warn(`Failed to persist team loot item ${item.id} to database: ${error.message}`);
                            });
                        }
                    }
                }
            });
        });
    },

    async handleStatus(interaction, game, rebel, userParty) {
        const corporation = game.corporations.get(userParty.target);
        const formation = game.formations.get(userParty.formation);
        
        let statusText = '';
        if (userParty.executeAt) {
            const timeRemaining = Math.max(0, Math.ceil((userParty.executeAt - new Date()) / 1000));
            statusText = timeRemaining > 0 ? `⏰ **${timeRemaining} SECONDS REMAINING**` : '💥 **EXECUTING NOW!**';
        } else {
            statusText = `📊 **${userParty.state.toUpperCase()}**`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📊 COORDINATION STATUS')
            .setDescription(`Real-time status for raid party **${userParty.id}**`)
            .addFields(
                { name: '🎯 Target', value: corporation.name, inline: true },
                { name: '🛡️ Formation', value: formation.name, inline: true },
                { name: '📊 Status', value: statusText, inline: true },
                { name: '👥 Team Ready', value: `${userParty.readyMembers.size}/${userParty.members.length}`, inline: true },
                { name: '💥 Damage Bonus', value: `+${Math.round((formation.damageBonus - 1) * 100)}%`, inline: true },
                { name: '⚡ Energy Cost', value: `${Math.round(formation.energyCost * 100)}%`, inline: true }
            )
            .setFooter({ text: 'Coordination is key to victory!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async handleAbort(interaction, game, rebel, userParty) {
        // Only leader can abort
        if (userParty.leader !== rebel.userId) {
            await interaction.editReply({
                content: '❌ Only the raid party leader can abort the mission!',
                components: []
            });
            return;
        }

        if (userParty.state !== 'executing') {
            await interaction.editReply({
                content: '❌ No active coordination to abort!',
                components: []
            });
            return;
        }

        // Abort the raid
        userParty.state = 'planning';
        userParty.executeAt = null;
        userParty.readyMembers.clear();

        await interaction.editReply({
            content: '🛑 **MISSION ABORTED!** Raid coordination has been cancelled. Team members must ready up again.',
            components: []
        });
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
