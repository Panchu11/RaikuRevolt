import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade items and credits with other rebels!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('offer')
                .setDescription('Create a trade offer to another player')
                .addUserOption(option =>
                    option.setName('player')
                        .setDescription('Player to trade with')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('your_item')
                        .setDescription('Item ID you want to trade (use /items list to see IDs)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('your_credits')
                        .setDescription('Credits you want to trade')
                        .setRequired(false)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('request_item')
                        .setDescription('Item type you want in return')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('request_credits')
                        .setDescription('Credits you want in return')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a trade offer')
                .addStringOption(option =>
                    option.setName('trade_id')
                        .setDescription('Trade offer ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('decline')
                .setDescription('Decline a trade offer')
                .addStringOption(option =>
                    option.setName('trade_id')
                        .setDescription('Trade offer ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel your trade offer')
                .addStringOption(option =>
                    option.setName('trade_id')
                        .setDescription('Trade offer ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your active trade offers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View your trading history')),

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
                case 'offer':
                    await this.handleTradeOffer(interaction, game, rebel);
                    break;
                case 'accept':
                    await this.handleAcceptTrade(interaction, game, rebel);
                    break;
                case 'decline':
                    await this.handleDeclineTrade(interaction, game, rebel);
                    break;
                case 'cancel':
                    await this.handleCancelTrade(interaction, game, rebel);
                    break;
                case 'list':
                    await this.handleListTrades(interaction, game, rebel);
                    break;
                case 'history':
                    await this.handleTradeHistory(interaction, game, rebel);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            game.logger.error('Trade command error:', error);
            await interaction.editReply({
                content: '💥 Trading systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleTradeOffer(interaction, game, rebel) {
        const targetUser = interaction.options.getUser('player');
        const yourItemId = interaction.options.getString('your_item');
        const yourCredits = interaction.options.getInteger('your_credits') || 0;
        const requestItem = interaction.options.getString('request_item');
        const requestCredits = interaction.options.getInteger('request_credits') || 0;

        // Validate target user
        if (targetUser.id === rebel.userId) {
            await interaction.editReply({
                content: '❌ You cannot trade with yourself!',
                components: []
            });
            return;
        }

        const targetRebel = game.getRebel(targetUser.id);
        if (!targetRebel) {
            await interaction.editReply({
                content: '❌ Target player is not part of the rebellion!',
                components: []
            });
            return;
        }

        // Validate trade offer
        if (!yourItemId && yourCredits === 0) {
            await interaction.editReply({
                content: '❌ You must offer either an item or credits!',
                components: []
            });
            return;
        }

        if (!requestItem && requestCredits === 0) {
            await interaction.editReply({
                content: '❌ You must request either an item type or credits!',
                components: []
            });
            return;
        }

        const yourInventory = game.inventory.get(rebel.userId);
        if (!yourInventory) {
            await interaction.editReply({
                content: '❌ Inventory not found!',
                components: []
            });
            return;
        }

        // Validate your offerings
        let yourItem = null;
        if (yourItemId) {
            yourItem = yourInventory.items.find(item => item.id === yourItemId);
            if (!yourItem) {
                await interaction.editReply({
                    content: '❌ Item not found in your inventory! Use `/items list` to see your items with IDs.',
                    components: []
                });
                return;
            }
        }

        if (yourCredits > yourInventory.credits) {
            await interaction.editReply({
                content: `❌ Not enough credits! You have ${yourInventory.credits}, trying to trade ${yourCredits}.`,
                components: []
            });
            return;
        }

        // Create trade offer
        const tradeId = `TR_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const tradeOffer = {
            id: tradeId,
            initiator: rebel.userId,
            target: targetUser.id,
            offering: {
                item: yourItem,
                credits: yourCredits
            },
            requesting: {
                itemType: requestItem,
                credits: requestCredits
            },
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000) // 1 hour
        };

        game.activeTrades.set(tradeId, tradeOffer);

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('💱 TRADE OFFER CREATED!')
            .setDescription(`Trade offer sent to **${targetUser.username}**`)
            .addFields(
                { name: '🎯 Target Player', value: targetUser.username, inline: true },
                { name: '🆔 Trade ID', value: `\`${tradeId}\``, inline: true },
                { name: '⏰ Expires', value: '<t:' + Math.floor(tradeOffer.expiresAt.getTime() / 1000) + ':R>', inline: true },
                { name: '📤 You Offer', value: this.formatTradeOffering(tradeOffer.offering), inline: true },
                { name: '📥 You Request', value: this.formatTradeRequest(tradeOffer.requesting), inline: true },
                { name: '📊 Status', value: 'Pending Response', inline: true },
                { name: '💡 Next Steps', value: `${targetUser.username} can use \`/trade accept trade_id:${tradeId}\` to accept this offer.`, inline: false }
            )
            .setFooter({ text: 'Trade offers expire after 1 hour' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cancel_trade_${tradeId}`)
                    .setLabel('Cancel Trade')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`trade_status_${tradeId}`)
                    .setLabel('Trade Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('my_trades')
                    .setLabel('My Trades')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleAcceptTrade(interaction, game, rebel) {
        const tradeId = interaction.options.getString('trade_id');
        const tradeOffer = game.activeTrades.get(tradeId);

        if (!tradeOffer) {
            await interaction.editReply({
                content: '❌ Trade offer not found or has expired!',
                components: []
            });
            return;
        }

        if (tradeOffer.target !== rebel.userId) {
            await interaction.editReply({
                content: '❌ This trade offer is not for you!',
                components: []
            });
            return;
        }

        if (tradeOffer.status !== 'pending') {
            await interaction.editReply({
                content: '❌ This trade offer is no longer available!',
                components: []
            });
            return;
        }

        if (new Date() > tradeOffer.expiresAt) {
            await interaction.editReply({
                content: '❌ This trade offer has expired!',
                components: []
            });
            game.activeTrades.delete(tradeId);
            return;
        }

        // Execute the trade
        const result = await this.executeTrade(game, tradeOffer);
        
        if (!result.success) {
            await interaction.editReply({
                content: `❌ Trade failed: ${result.error}`,
                components: []
            });
            return;
        }

        // Update trade status
        tradeOffer.status = 'completed';
        tradeOffer.completedAt = new Date();

        // Add to trade history
        game.tradeHistory.push({
            ...tradeOffer,
            completedAt: new Date()
        });

        // Remove from active trades
        game.activeTrades.delete(tradeId);

        const initiator = game.rebels.get(tradeOffer.initiator);
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ TRADE COMPLETED!')
            .setDescription(`Successful trade between **${initiator?.username || 'Unknown'}** and **${rebel.username}**`)
            .addFields(
                { name: '🆔 Trade ID', value: `\`${tradeId}\``, inline: true },
                { name: '📤 You Received', value: this.formatTradeOffering(tradeOffer.offering), inline: true },
                { name: '📥 You Gave', value: this.formatTradeRequest(tradeOffer.requesting), inline: true },
                { name: '🤝 Trade Partner', value: initiator?.username || 'Unknown', inline: true },
                { name: '⏰ Completed', value: '<t:' + Math.floor(Date.now() / 1000) + ':R>', inline: true },
                { name: '📊 Status', value: 'Successfully Completed', inline: true }
            )
            .setFooter({ text: 'Trade completed successfully!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    formatTradeOffering(offering) {
        let text = '';
        if (offering.item) {
            text += `📦 **${offering.item.name}** (${offering.item.rarity})\n`;
        }
        if (offering.credits > 0) {
            text += `💰 **${offering.credits}** credits\n`;
        }
        return text || 'Nothing';
    },

    formatTradeRequest(requesting) {
        let text = '';
        if (requesting.itemType) {
            text += `📦 **${requesting.itemType}** (any)\n`;
        }
        if (requesting.credits > 0) {
            text += `💰 **${requesting.credits}** credits\n`;
        }
        return text || 'Nothing';
    },

    async executeTrade(game, tradeOffer) {
        const initiatorInventory = game.inventory.get(tradeOffer.initiator);
        const targetInventory = game.inventory.get(tradeOffer.target);

        if (!initiatorInventory || !targetInventory) {
            return { success: false, error: 'Player inventory not found' };
        }

        // Validate initiator can still provide what they offered
        if (tradeOffer.offering.item) {
            const item = initiatorInventory.items.find(i => i.id === tradeOffer.offering.item.id);
            if (!item) {
                return { success: false, error: 'Offered item no longer available' };
            }
        }

        if (tradeOffer.offering.credits > initiatorInventory.credits) {
            return { success: false, error: 'Initiator no longer has enough credits' };
        }

        // Validate target can provide what was requested
        if (tradeOffer.requesting.itemType) {
            const hasRequestedItem = targetInventory.items.some(item =>
                item.type === tradeOffer.requesting.itemType ||
                item.name.toLowerCase().includes(tradeOffer.requesting.itemType.toLowerCase())
            );
            if (!hasRequestedItem) {
                return { success: false, error: 'Target player does not have requested item type' };
            }
        }

        if (tradeOffer.requesting.credits > targetInventory.credits) {
            return { success: false, error: 'Target player does not have enough credits' };
        }

        // Execute the trade
        try {
            // Transfer from initiator to target
            if (tradeOffer.offering.item) {
                const itemIndex = initiatorInventory.items.findIndex(i => i.id === tradeOffer.offering.item.id);
                const item = initiatorInventory.items.splice(itemIndex, 1)[0];
                targetInventory.items.push(item);
            }

            if (tradeOffer.offering.credits > 0) {
                initiatorInventory.credits -= tradeOffer.offering.credits;
                targetInventory.credits += tradeOffer.offering.credits;
                if (typeof game.addCredits === 'function') {
                    await game.addCredits(tradeOffer.initiator, -tradeOffer.offering.credits);
                    await game.addCredits(tradeOffer.target, tradeOffer.offering.credits);
                }
            }

            // Transfer from target to initiator
            if (tradeOffer.requesting.itemType) {
                const itemIndex = targetInventory.items.findIndex(item =>
                    item.type === tradeOffer.requesting.itemType ||
                    item.name.toLowerCase().includes(tradeOffer.requesting.itemType.toLowerCase())
                );
                if (itemIndex !== -1) {
                    const item = targetInventory.items.splice(itemIndex, 1)[0];
                    initiatorInventory.items.push(item);
                }
            }

            if (tradeOffer.requesting.credits > 0) {
                targetInventory.credits -= tradeOffer.requesting.credits;
                initiatorInventory.credits += tradeOffer.requesting.credits;
                if (typeof game.addCredits === 'function') {
                    await game.addCredits(tradeOffer.target, -tradeOffer.requesting.credits);
                    await game.addCredits(tradeOffer.initiator, tradeOffer.requesting.credits);
                }
            }

            // Update trading reputation
            this.updateTradingReputation(game, tradeOffer.initiator, 'completed');
            this.updateTradingReputation(game, tradeOffer.target, 'completed');

            return { success: true };

        } catch (error) {
            console.error('Trade execution error:', error);
            return { success: false, error: 'Trade execution failed' };
        }
    },

    updateTradingReputation(game, userId, action) {
        if (!game.tradingReputation.has(userId)) {
            game.tradingReputation.set(userId, {
                completed: 0,
                cancelled: 0,
                reputation: 100
            });
        }

        const rep = game.tradingReputation.get(userId);

        switch (action) {
            case 'completed':
                rep.completed++;
                rep.reputation = Math.min(1000, rep.reputation + 5);
                break;
            case 'cancelled':
                rep.cancelled++;
                rep.reputation = Math.max(0, rep.reputation - 2);
                break;
        }
    },

    async handleDeclineTrade(interaction, game, rebel) {
        const tradeId = interaction.options.getString('trade_id');
        const tradeOffer = game.activeTrades.get(tradeId);

        if (!tradeOffer) {
            await interaction.editReply({
                content: '❌ Trade offer not found!',
                components: []
            });
            return;
        }

        if (tradeOffer.target !== rebel.userId) {
            await interaction.editReply({
                content: '❌ This trade offer is not for you!',
                components: []
            });
            return;
        }

        // Remove trade offer
        game.activeTrades.delete(tradeId);

        const initiator = game.rebels.get(tradeOffer.initiator);
        await interaction.editReply({
            content: `✅ Trade offer from **${initiator?.username || 'Unknown'}** has been declined.`,
            components: []
        });
    },

    async handleCancelTrade(interaction, game, rebel) {
        const tradeId = interaction.options.getString('trade_id');
        const tradeOffer = game.activeTrades.get(tradeId);

        if (!tradeOffer) {
            await interaction.editReply({
                content: '❌ Trade offer not found!',
                components: []
            });
            return;
        }

        if (tradeOffer.initiator !== rebel.userId) {
            await interaction.editReply({
                content: '❌ You can only cancel your own trade offers!',
                components: []
            });
            return;
        }

        // Remove trade offer
        game.activeTrades.delete(tradeId);
        this.updateTradingReputation(game, rebel.userId, 'cancelled');

        await interaction.editReply({
            content: `✅ Trade offer **${tradeId}** has been cancelled.`,
            components: []
        });
    },

    async handleListTrades(interaction, game, rebel) {
        const userTrades = Array.from(game.activeTrades.values())
            .filter(trade => trade.initiator === rebel.userId || trade.target === rebel.userId);

        if (userTrades.length === 0) {
            await interaction.editReply({
                content: '📭 No active trade offers found!',
                components: []
            });
            return;
        }

        let tradesList = '';
        userTrades.forEach((trade, index) => {
            const isInitiator = trade.initiator === rebel.userId;
            const otherUserId = isInitiator ? trade.target : trade.initiator;
            const otherUser = game.rebels.get(otherUserId);
            const role = isInitiator ? 'Sent to' : 'Received from';

            tradesList += `**${index + 1}. ${trade.id}**\n`;
            tradesList += `   ${role}: ${otherUser?.username || 'Unknown'}\n`;
            tradesList += `   Status: ${trade.status}\n`;
            tradesList += `   Expires: <t:${Math.floor(trade.expiresAt.getTime() / 1000)}:R>\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📋 YOUR ACTIVE TRADES')
            .setDescription('All your pending trade offers')
            .addFields(
                { name: '📊 Active Trades', value: tradesList, inline: false },
                { name: '💡 Actions', value: 'Use `/trade accept`, `/trade decline`, or `/trade cancel` with the Trade ID', inline: false }
            )
            .setFooter({ text: 'Trade offers expire after 1 hour' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async handleTradeHistory(interaction, game, rebel) {
        const userHistory = game.tradeHistory
            .filter(trade => trade.initiator === rebel.userId || trade.target === rebel.userId)
            .slice(-10); // Last 10 trades

        if (userHistory.length === 0) {
            await interaction.editReply({
                content: '📭 No trading history found!',
                components: []
            });
            return;
        }

        let historyText = '';
        userHistory.forEach((trade, index) => {
            const isInitiator = trade.initiator === rebel.userId;
            const otherUserId = isInitiator ? trade.target : trade.initiator;
            const otherUser = game.rebels.get(otherUserId);
            const role = isInitiator ? 'Traded with' : 'Traded with';

            historyText += `**${index + 1}.** ${role} ${otherUser?.username || 'Unknown'}\n`;
            historyText += `   Completed: <t:${Math.floor(trade.completedAt.getTime() / 1000)}:R>\n\n`;
        });

        const reputation = game.tradingReputation.get(rebel.userId);
        const repText = reputation ?
            `Completed: ${reputation.completed} | Cancelled: ${reputation.cancelled} | Score: ${reputation.reputation}` :
            'No reputation data';

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📈 TRADING HISTORY')
            .setDescription(`Recent trading activity for **${rebel.username}**`)
            .addFields(
                { name: '📊 Recent Trades', value: historyText, inline: false },
                { name: '🏆 Trading Reputation', value: repText, inline: false }
            )
            .setFooter({ text: 'Showing last 10 completed trades' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
};
