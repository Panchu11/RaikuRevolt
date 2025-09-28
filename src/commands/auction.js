import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('Participate in the rebellion auction house!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create an auction for an item')
                .addStringOption(option =>
                    option.setName('item_id')
                        .setDescription('Item ID to auction (use /items list to see IDs)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('starting_bid')
                        .setDescription('Starting bid amount in credits')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Auction duration in hours (1-24)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(24)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bid')
                .setDescription('Place a bid on an auction')
                .addStringOption(option =>
                    option.setName('auction_id')
                        .setDescription('Auction ID to bid on')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Bid amount in credits')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse active auctions')
                .addStringOption(option =>
                    option.setName('sort')
                        .setDescription('Sort auctions by')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Ending Soon', value: 'ending' },
                            { name: 'Highest Bid', value: 'bid' },
                            { name: 'Recently Listed', value: 'recent' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check status of a specific auction')
                .addStringOption(option =>
                    option.setName('auction_id')
                        .setDescription('Auction ID to check')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('my-auctions')
                .setDescription('View your active auctions and bids'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel your auction (only if no bids)')
                .addStringOption(option =>
                    option.setName('auction_id')
                        .setDescription('Your auction ID to cancel')
                        .setRequired(true))),

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
                    await this.handleCreateAuction(interaction, game, rebel);
                    break;
                case 'bid':
                    await this.handlePlaceBid(interaction, game, rebel);
                    break;
                case 'browse':
                    await this.handleBrowseAuctions(interaction, game, rebel);
                    break;
                case 'status':
                    await this.handleAuctionStatus(interaction, game, rebel);
                    break;
                case 'my-auctions':
                    await this.handleMyAuctions(interaction, game, rebel);
                    break;
                case 'cancel':
                    await this.handleCancelAuction(interaction, game, rebel);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Auction command error:', error);
            await interaction.editReply({
                content: '💥 Auction house systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCreateAuction(interaction, game, rebel) {
        const itemId = interaction.options.getString('item_id');
        const startingBid = interaction.options.getInteger('starting_bid');
        const duration = interaction.options.getInteger('duration') || 12; // Default 12 hours

        const inventory = game.inventory.get(rebel.userId);
        if (!inventory) {
            await interaction.editReply({
                content: '❌ Inventory not found!',
                components: []
            });
            return;
        }

        // Find the item
        const item = inventory.items.find(i => i.id === itemId);
        if (!item) {
            await interaction.editReply({
                content: '❌ Item not found in your inventory! Use `/items list` to see your items with IDs.',
                components: []
            });
            return;
        }

        const auctionFee = game.tradeOfferTypes.get('auction').fee;

        // Check if user has enough credits for auction fee
        if (inventory.credits < auctionFee) {
            await interaction.editReply({
                content: `❌ Not enough credits for auction fee! Need ${auctionFee} credits.`,
                components: []
            });
            return;
        }

        // Create auction
        const auctionId = `AU_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const auction = {
            id: auctionId,
            sellerId: rebel.userId,
            item: item,
            startingBid: startingBid,
            currentBid: startingBid,
            highestBidder: null,
            bids: [],
            status: 'active',
            createdAt: new Date(),
            endsAt: new Date(Date.now() + (duration * 3600000)), // Convert hours to milliseconds
            watchers: []
        };

        // Remove item from inventory and deduct auction fee
        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        inventory.items.splice(itemIndex, 1);
        inventory.credits -= auctionFee;
        if (typeof game.addCredits === 'function') {
            await game.addCredits(rebel.userId, -auctionFee);
        }

        // Add to auctions
        game.auctions.set(auctionId, auction);

        const embed = new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle('🔨 AUCTION CREATED!')
            .setDescription(`**${item.name}** is now up for auction!`)
            .addFields(
                { name: '📦 Item', value: `${item.name} (${item.rarity})`, inline: true },
                { name: '💰 Starting Bid', value: `${startingBid} credits`, inline: true },
                { name: '⏰ Duration', value: `${duration} hours`, inline: true },
                { name: '🆔 Auction ID', value: `\`${auctionId}\``, inline: true },
                { name: '🏁 Ends At', value: '<t:' + Math.floor(auction.endsAt.getTime() / 1000) + ':F>', inline: true },
                { name: '💸 Auction Fee', value: `${auctionFee} credits`, inline: true },
                { name: '📊 Current Status', value: 'Waiting for first bid...', inline: false }
            )
            .setFooter({ text: 'Rebels can now place bids on your item!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`auction_status_${auctionId}`)
                    .setLabel('Auction Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`cancel_auction_${auctionId}`)
                    .setLabel('Cancel Auction')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('browse_auctions')
                    .setLabel('Browse Auctions')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔨')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });

        // Schedule auction end
        this.scheduleAuctionEnd(game, auction);
    },

    async handlePlaceBid(interaction, game, rebel) {
        const auctionId = interaction.options.getString('auction_id');
        const bidAmount = interaction.options.getInteger('amount');

        const auction = game.auctions.get(auctionId);
        if (!auction) {
            await interaction.editReply({
                content: '❌ Auction not found!',
                components: []
            });
            return;
        }

        if (auction.status !== 'active') {
            await interaction.editReply({
                content: '❌ This auction is no longer active!',
                components: []
            });
            return;
        }

        if (new Date() > auction.endsAt) {
            await interaction.editReply({
                content: '❌ This auction has ended!',
                components: []
            });
            return;
        }

        if (auction.sellerId === rebel.userId) {
            await interaction.editReply({
                content: '❌ You cannot bid on your own auction!',
                components: []
            });
            return;
        }

        const inventory = game.inventory.get(rebel.userId);
        if (!inventory) {
            await interaction.editReply({
                content: '❌ Inventory not found!',
                components: []
            });
            return;
        }

        // Check if bid is higher than current bid
        const minimumBid = auction.currentBid + Math.max(1, Math.floor(auction.currentBid * 0.05)); // 5% increment minimum
        if (bidAmount < minimumBid) {
            await interaction.editReply({
                content: `❌ Bid too low! Minimum bid is ${minimumBid} credits.`,
                components: []
            });
            return;
        }

        // Check if user has enough credits
        if (inventory.credits < bidAmount) {
            await interaction.editReply({
                content: `❌ Not enough credits! You need ${bidAmount} but only have ${inventory.credits}.`,
                components: []
            });
            return;
        }

        // Return credits to previous highest bidder
        if (auction.highestBidder) {
            const previousBidderInventory = game.inventory.get(auction.highestBidder);
            if (previousBidderInventory) {
                previousBidderInventory.credits += auction.currentBid;
                if (typeof game.addCredits === 'function') {
                    await game.addCredits(auction.highestBidder, auction.currentBid);
                }
            }
        }

        // Deduct credits from new bidder
        inventory.credits -= bidAmount;
        if (typeof game.addCredits === 'function') {
            await game.addCredits(rebel.userId, -bidAmount);
        }

        // Update auction
        auction.currentBid = bidAmount;
        auction.highestBidder = rebel.userId;
        auction.bids.push({
            bidderId: rebel.userId,
            amount: bidAmount,
            timestamp: new Date()
        });

        const seller = game.rebels.get(auction.sellerId);
        const timeRemaining = Math.ceil((auction.endsAt - new Date()) / 60000); // Minutes remaining

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ BID PLACED SUCCESSFULLY!')
            .setDescription(`You are now the highest bidder on **${auction.item.name}**!`)
            .addFields(
                { name: '📦 Item', value: `${auction.item.name} (${auction.item.rarity})`, inline: true },
                { name: '💰 Your Bid', value: `${bidAmount} credits`, inline: true },
                { name: '👤 Seller', value: seller?.username || 'Unknown', inline: true },
                { name: '🏆 Status', value: 'Highest Bidder', inline: true },
                { name: '⏰ Time Left', value: `${timeRemaining} minutes`, inline: true },
                { name: '📊 Total Bids', value: `${auction.bids.length}`, inline: true },
                { name: '💡 Next Steps', value: 'You will automatically win if no one outbids you before the auction ends!', inline: false }
            )
            .setFooter({ text: 'Your credits are held until the auction ends' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    scheduleAuctionEnd(game, auction) {
        const timeUntilEnd = auction.endsAt - new Date();
        
        if (timeUntilEnd > 0) {
            setTimeout(() => {
                this.endAuction(game, auction);
            }, timeUntilEnd);
        }
    },

    async endAuction(game, auction) {
        auction.status = 'ended';
        auction.endedAt = new Date();

        if (auction.highestBidder) {
            // Transfer item to winner
            const winnerInventory = game.inventory.get(auction.highestBidder);
            if (winnerInventory && winnerInventory.items.length < winnerInventory.capacity) {
                winnerInventory.items.push(auction.item);
            }

            // Transfer credits to seller (minus 10% auction house fee)
            const sellerInventory = game.inventory.get(auction.sellerId);
            if (sellerInventory) {
                const fee = Math.floor(auction.currentBid * 0.10);
                const sellerReceives = auction.currentBid - fee;
                sellerInventory.credits += sellerReceives;
                if (typeof game.addCredits === 'function') {
                    await game.addCredits(auction.sellerId, sellerReceives);
                }
            }

            // Add to trade history
            game.tradeHistory.push({
                type: 'auction',
                auctionId: auction.id,
                sellerId: auction.sellerId,
                buyerId: auction.highestBidder,
                item: auction.item,
                finalBid: auction.currentBid,
                completedAt: new Date()
            });
        } else {
            // No bids - return item to seller
            const sellerInventory = game.inventory.get(auction.sellerId);
            if (sellerInventory && sellerInventory.items.length < sellerInventory.capacity) {
                sellerInventory.items.push(auction.item);
            }
        }

        // Remove from active auctions
        game.auctions.delete(auction.id);

        game.logger.info(`🔨 Auction ${auction.id} ended. Winner: ${auction.highestBidder || 'No bids'}`);
    },

    async handleBrowseAuctions(interaction, game, rebel) {
        const sortBy = interaction.options.getString('sort') || 'ending';

        let auctions = Array.from(game.auctions.values())
            .filter(auction => auction.status === 'active' && new Date() < auction.endsAt);

        if (auctions.length === 0) {
            await interaction.editReply({
                content: '🔨 No active auctions found! Be the first to create one.',
                components: []
            });
            return;
        }

        // Sort auctions
        switch (sortBy) {
            case 'ending':
                auctions.sort((a, b) => a.endsAt - b.endsAt);
                break;
            case 'bid':
                auctions.sort((a, b) => b.currentBid - a.currentBid);
                break;
            case 'recent':
                auctions.sort((a, b) => b.createdAt - a.createdAt);
                break;
        }

        const displayAuctions = auctions.slice(0, 10);

        let auctionsText = '';
        displayAuctions.forEach((auction, index) => {
            const seller = game.rebels.get(auction.sellerId);
            const timeLeft = Math.ceil((auction.endsAt - new Date()) / 60000);
            const bidStatus = auction.highestBidder ?
                `${auction.bids.length} bids` :
                'No bids yet';

            auctionsText += `**${index + 1}. ${auction.item.name}**\n`;
            auctionsText += `   💰 Current Bid: ${auction.currentBid} credits\n`;
            auctionsText += `   📊 Status: ${bidStatus}\n`;
            auctionsText += `   👤 Seller: ${seller?.username || 'Unknown'}\n`;
            auctionsText += `   ⏰ Ends: ${timeLeft}m\n`;
            auctionsText += `   🆔 ID: \`${auction.id}\`\n\n`;
        });

        const sortLabels = {
            'ending': 'Ending Soon',
            'bid': 'Highest Bid',
            'recent': 'Recently Listed'
        };

        const embed = new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle('🔨 REBELLION AUCTION HOUSE')
            .setDescription(`Active auctions sorted by: **${sortLabels[sortBy]}**`)
            .addFields(
                { name: '📊 Auction Stats', value: `${auctions.length} active auctions`, inline: true },
                { name: '💰 Your Credits', value: `${game.inventory.get(rebel.userId)?.credits || 0}`, inline: true },
                { name: '🏆 Sort Order', value: sortLabels[sortBy], inline: true },
                { name: '🔨 Active Auctions', value: auctionsText, inline: false },
                { name: '💡 How to Bid', value: 'Use `/auction bid auction_id:<ID> amount:<credits>` to place a bid', inline: false }
            )
            .setFooter({ text: `Showing ${displayAuctions.length} of ${auctions.length} auctions` })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('auction_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('auction_sort_ending')
                    .setLabel('Ending Soon')
                    .setStyle(sortBy === 'ending' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('⏰'),
                new ButtonBuilder()
                    .setCustomId('auction_sort_bid')
                    .setLabel('Highest Bid')
                    .setStyle(sortBy === 'bid' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('my_auctions')
                    .setLabel('My Auctions')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📋')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleAuctionStatus(interaction, game, rebel) {
        const auctionId = interaction.options.getString('auction_id');
        const auction = game.auctions.get(auctionId);

        if (!auction) {
            await interaction.editReply({
                content: '❌ Auction not found!',
                components: []
            });
            return;
        }

        const seller = game.rebels.get(auction.sellerId);
        const highestBidder = auction.highestBidder ? game.rebels.get(auction.highestBidder) : null;
        const timeLeft = Math.max(0, Math.ceil((auction.endsAt - new Date()) / 60000));

        let bidHistory = '';
        if (auction.bids.length > 0) {
            const recentBids = auction.bids.slice(-5).reverse(); // Last 5 bids
            recentBids.forEach((bid, index) => {
                const bidder = game.rebels.get(bid.bidderId);
                bidHistory += `${index + 1}. **${bidder?.username || 'Unknown'}** - ${bid.amount} credits\n`;
            });
        } else {
            bidHistory = 'No bids yet';
        }

        const embed = new EmbedBuilder()
            .setColor(auction.status === 'active' ? 0xff8800 : 0x888888)
            .setTitle(`🔨 AUCTION STATUS - ${auction.id}`)
            .setDescription(`Detailed information for **${auction.item.name}**`)
            .addFields(
                { name: '📦 Item', value: `${auction.item.name} (${auction.item.rarity})`, inline: true },
                { name: '💰 Current Bid', value: `${auction.currentBid} credits`, inline: true },
                { name: '📊 Status', value: auction.status.toUpperCase(), inline: true },
                { name: '👤 Seller', value: seller?.username || 'Unknown', inline: true },
                { name: '🏆 Highest Bidder', value: highestBidder?.username || 'None', inline: true },
                { name: '⏰ Time Left', value: timeLeft > 0 ? `${timeLeft} minutes` : 'ENDED', inline: true },
                { name: '📈 Bid History', value: bidHistory, inline: false },
                { name: '🎯 Starting Bid', value: `${auction.startingBid} credits`, inline: true },
                { name: '📊 Total Bids', value: `${auction.bids.length}`, inline: true },
                { name: '🕐 Created', value: '<t:' + Math.floor(auction.createdAt.getTime() / 1000) + ':R>', inline: true }
            )
            .setFooter({ text: 'Auction details updated in real-time' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`place_bid_${auctionId}`)
                    .setLabel('Place Bid')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
                    .setDisabled(auction.status !== 'active' || auction.sellerId === rebel.userId || timeLeft <= 0),
                new ButtonBuilder()
                    .setCustomId(`watch_auction_${auctionId}`)
                    .setLabel('Watch Auction')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👀'),
                new ButtonBuilder()
                    .setCustomId('browse_auctions')
                    .setLabel('Browse Auctions')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔨')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleMyAuctions(interaction, game, rebel) {
        const userAuctions = Array.from(game.auctions.values())
            .filter(auction => auction.sellerId === rebel.userId);

        const userBids = Array.from(game.auctions.values())
            .filter(auction => auction.highestBidder === rebel.userId);

        if (userAuctions.length === 0 && userBids.length === 0) {
            await interaction.editReply({
                content: '📭 You have no active auctions or bids!',
                components: []
            });
            return;
        }

        let auctionsText = '';
        if (userAuctions.length > 0) {
            auctionsText = '**Your Auctions:**\n';
            userAuctions.forEach((auction, index) => {
                const timeLeft = Math.ceil((auction.endsAt - new Date()) / 60000);
                auctionsText += `${index + 1}. **${auction.item.name}** - ${auction.currentBid} credits (${timeLeft}m left)\n`;
            });
            auctionsText += '\n';
        }

        let bidsText = '';
        if (userBids.length > 0) {
            bidsText = '**Your Winning Bids:**\n';
            userBids.forEach((auction, index) => {
                const timeLeft = Math.ceil((auction.endsAt - new Date()) / 60000);
                bidsText += `${index + 1}. **${auction.item.name}** - ${auction.currentBid} credits (${timeLeft}m left)\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📋 YOUR AUCTION ACTIVITY')
            .setDescription(`Auction activity for **${rebel.username}**`)
            .addFields(
                { name: '🔨 Active Auctions', value: auctionsText || 'No active auctions', inline: false },
                { name: '🏆 Winning Bids', value: bidsText || 'No winning bids', inline: false }
            )
            .setFooter({ text: 'Monitor your auctions and bids' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async handleCancelAuction(interaction, game, rebel) {
        const auctionId = interaction.options.getString('auction_id');
        const auction = game.auctions.get(auctionId);

        if (!auction) {
            await interaction.editReply({
                content: '❌ Auction not found!',
                components: []
            });
            return;
        }

        if (auction.sellerId !== rebel.userId) {
            await interaction.editReply({
                content: '❌ You can only cancel your own auctions!',
                components: []
            });
            return;
        }

        if (auction.bids.length > 0) {
            await interaction.editReply({
                content: '❌ Cannot cancel auction with existing bids!',
                components: []
            });
            return;
        }

        if (auction.status !== 'active') {
            await interaction.editReply({
                content: '❌ This auction is no longer active!',
                components: []
            });
            return;
        }

        // Return item to inventory
        const inventory = game.inventory.get(rebel.userId);
        if (inventory && inventory.items.length < inventory.capacity) {
            inventory.items.push(auction.item);
        }

        // Remove auction
        game.auctions.delete(auctionId);

        await interaction.editReply({
            content: `✅ Auction cancelled! **${auction.item.name}** has been returned to your inventory.`,
            components: []
        });
    }
};
