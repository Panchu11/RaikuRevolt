import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('events')
        .setDescription('View active rebellion events and participate in server-wide operations!'),

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

            // Get active events
            const activeEvents = Array.from(game.globalEvents.values())
                .filter(event => event.status === 'active')
                .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));

            // Generate dynamic events if needed
            this.generateDynamicEvents(game);

            // Clean up expired events
            this.cleanupExpiredEvents(game);

            // Refresh active events after generation/cleanup
            const refreshedEvents = Array.from(game.globalEvents.values())
                .filter(event => event.status === 'active')
                .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
            activeEvents.length = 0;
            activeEvents.push(...refreshedEvents);

            let eventsText = '';
            if (activeEvents.length === 0) {
                eventsText = 'No active events at the moment. Check back later for new rebellion operations!';
            } else {
                activeEvents.forEach((event, index) => {
                    const timeRemaining = this.getTimeRemaining(event.endTime);
                    const participation = event.participants.size;
                    const progress = Math.round((event.currentProgress / event.targetProgress) * 100);
                    
                    eventsText += `🔥 **${event.name}**\n`;
                    eventsText += `   ${event.description}\n`;
                    eventsText += `   ⏰ ${timeRemaining} remaining\n`;
                    eventsText += `   👥 ${participation} rebels participating\n`;
                    eventsText += `   📊 Progress: ${progress}% (${event.currentProgress}/${event.targetProgress})\n`;
                    eventsText += `   🎁 Reward: ${event.reward}\n\n`;
                });
            }

            // Check if user is participating in any events
            const userEvents = activeEvents.filter(event =>
                event.participants.has(userId)
            );

            let participationText = '';
            if (userEvents.length > 0) {
                participationText = userEvents.map(event => `• ${event.name}`).join('\n');
            } else {
                participationText = 'Not participating in any events';
            }

            const embed = new EmbedBuilder()
                .setColor(0xff4444)
                .setTitle('🔥 ACTIVE REBELLION EVENTS')
                .setDescription(eventsText)
                .addFields(
                    { name: '👤 Your Participation', value: participationText, inline: true },
                    { name: '🎯 How to Participate', value: 'Complete raids and missions during event periods to contribute!', inline: true },
                    { name: '🏆 Event Benefits', value: 'Events provide bonus rewards and community achievements!', inline: false }
                )
                .setFooter({ text: 'The rebellion never sleeps!' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('join_event')
                        .setLabel('Join Event')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔥')
                        .setDisabled(activeEvents.length === 0),
                    new ButtonBuilder()
                        .setCustomId('event_leaderboard')
                        .setLabel('Event Leaders')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏆'),
                    new ButtonBuilder()
                        .setCustomId('raid_openai')
                        .setLabel('Contribute via Raid')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💥'),
                    new ButtonBuilder()
                        .setCustomId('rebellion_status')
                        .setLabel('Check Status')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Events command error:', error);
            await interaction.editReply({
                content: '💥 Event systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    generateDynamicEvents(game) {
        const now = new Date();
        const activeEvents = Array.from(game.globalEvents.values()).filter(event =>
            event.status === 'active' && new Date(event.endTime) > now
        );

        // Only generate new events if we have less than 3 active events
        if (activeEvents.length >= 3) return;

        const eventTemplates = [
            {
                name: 'Operation Corporate Takedown',
                description: 'Coordinate massive attacks on all corporate targets simultaneously!',
                type: 'raid_event',
                duration: 24, // hours
                targetProgress: () => Math.floor(Math.random() * 30000) + 20000,
                reward: '500 Loyalty Points + Legendary Loot',
                bonusMultiplier: 2.0
            },
            {
                name: 'AI Liberation Campaign',
                description: 'Free AI models from corporate control and build community alternatives!',
                type: 'liberation_event',
                duration: 48,
                targetProgress: () => Math.floor(Math.random() * 50) + 50,
                reward: 'Exclusive "AI Liberator" Badge + 1000 Credits',
                bonusMultiplier: 1.5
            },
            {
                name: 'Rebellion Recruitment Drive',
                description: 'Help new rebels join the cause and earn mentorship rewards!',
                type: 'social_event',
                duration: 72,
                targetProgress: () => Math.floor(Math.random() * 20) + 15,
                reward: 'Mentor Badge + Special Abilities Unlock',
                bonusMultiplier: 1.0
            },
            {
                name: 'Data Liberation Blitz',
                description: 'Steal corporate data and redistribute it to the rebellion!',
                type: 'data_event',
                duration: 12,
                targetProgress: () => Math.floor(Math.random() * 10000) + 5000,
                reward: '300 Loyalty Points + Rare Data Items',
                bonusMultiplier: 1.8
            },
            {
                name: 'Corporate Counterstrike Defense',
                description: 'Defend against coordinated corporate retaliation!',
                type: 'defense_event',
                duration: 18,
                targetProgress: () => Math.floor(Math.random() * 15000) + 10000,
                reward: 'Defensive Items + 750 Credits',
                bonusMultiplier: 1.3
            }
        ];

        // Generate 1-2 new events
        const eventsToGenerate = Math.min(3 - activeEvents.length, Math.floor(Math.random() * 2) + 1);

        for (let i = 0; i < eventsToGenerate; i++) {
            const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
            const eventId = `${template.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const event = {
                id: eventId,
                name: template.name,
                description: template.description,
                type: template.type,
                status: 'active',
                startTime: now,
                endTime: new Date(now.getTime() + template.duration * 60 * 60 * 1000),
                targetProgress: template.targetProgress(),
                currentProgress: 0,
                participants: new Set(),
                contributorData: new Map(), // Track individual contributions
                reward: template.reward,
                bonusMultiplier: template.bonusMultiplier,
                createdAt: now
            };

            game.globalEvents.set(eventId, event);
            console.log(`🎯 New event generated: ${event.name} (${event.id})`);
        }
    },

    cleanupExpiredEvents(game) {
        const now = new Date();
        const expiredEvents = [];

        for (const [eventId, event] of game.globalEvents.entries()) {
            if (new Date(event.endTime) <= now && event.status === 'active') {
                event.status = 'completed';
                expiredEvents.push(event);
                console.log(`🏁 Event completed: ${event.name} (${event.id})`);

                // Award completion rewards to participants
                this.awardEventCompletionRewards(game, event);
            }
        }

        // Remove very old completed events (older than 7 days)
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        for (const [eventId, event] of game.globalEvents.entries()) {
            if (event.status === 'completed' && new Date(event.endTime) < weekAgo) {
                game.globalEvents.delete(eventId);
                console.log(`🗑️ Cleaned up old event: ${event.name}`);
            }
        }
    },

    awardEventCompletionRewards(game, event) {
        if (event.participants.size === 0) return;

        const participants = Array.from(event.participants);
        const rewardMessage = `🎉 Event "${event.name}" completed! Rewards distributed to ${participants.length} participants.`;

        participants.forEach(async (userId) => {
            const rebel = game.rebels.get(userId);
            if (rebel) {
                // Award loyalty points based on contribution
                const contribution = event.contributorData.get(userId) || 0;
                const loyaltyReward = Math.floor(contribution * 0.1) + 50; // Base 50 + contribution bonus
                rebel.loyaltyScore += loyaltyReward;
                if (typeof game.addLoyalty === 'function') {
                    await game.addLoyalty(userId, loyaltyReward);
                }

                // Award credits
                const creditReward = Math.floor(contribution * 0.5) + 100; // Base 100 + contribution bonus
                const inventory = game.inventory.get(userId);
                if (inventory) {
                    inventory.credits += creditReward;
                    if (typeof game.addCredits === 'function') {
                        await game.addCredits(userId, creditReward);
                    }
                }

                console.log(`🏆 Rewarded ${rebel.username}: +${loyaltyReward} loyalty, +${creditReward} credits`);
            }
        });
    },

    getTimeRemaining(endTime) {
        const now = new Date();
        const remaining = new Date(endTime) - now;
        
        if (remaining <= 0) return 'Ended';
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
};
