import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Browse and interact with the global marketplace!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse marketplace listings')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Filter by category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Weapons & Tools', value: 'weapons' },
                            { name: 'Data & Intelligence', value: 'data' },
                            { name: 'Resources & Materials', value: 'resources' },
                            { name: 'Defensive Items', value: 'defensive' },
                            { name: 'Rare & Legendary', value: 'rare' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('List an item for sale on the marketplace')
                .addStringOption(option =>
                    option.setName('item_id')
                        .setDescription('Item ID to sell (use /items list to see IDs)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Selling price in credits')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Purchase an item from the marketplace')
                .addStringOption(option =>
                    option.setName('listing_id')
                        .setDescription('Marketplace listing ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your listing from the marketplace')
                .addStringOption(option =>
                    option.setName('listing_id')
                        .setDescription('Your listing ID to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('my-listings')
                .setDescription('View your active marketplace listings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for specific items')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Search term')
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
                case 'browse':
                    await this.handleBrowseMarket(interaction, game, rebel);
                    break;
                case 'sell':
                    await this.handleSellItem(interaction, game, rebel);
                    break;
                case 'buy':
                    await this.handleBuyItem(interaction, game, rebel);
                    break;
                case 'remove':
                    await this.handleRemoveListing(interaction, game, rebel);
                    break;
                case 'my-listings':
                    await this.handleMyListings(interaction, game, rebel);
                    break;
                case 'search':
                    await this.handleSearchMarket(interaction, game, rebel);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Market command error:', error);
            await interaction.editReply({
                content: '💥 Marketplace systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleBrowseMarket(interaction, game, rebel) {
        const category = interaction.options.getString('category');
        
        let listings = Array.from(game.marketplace.values())
            .filter(listing => listing.status === 'active' && new Date() < listing.expiresAt);

        if (category) {
            listings = listings.filter(listing => listing.category === category);
        }

        if (listings.length === 0) {
            await interaction.editReply({
                content: category ? 
                    `📭 No items found in **${category}** category!` : 
                    '📭 The marketplace is empty! Be the first to list an item.',
                components: []
            });
            return;
        }

        // Sort by price (ascending)
        listings.sort((a, b) => a.price - b.price);
        
        // Take first 10 listings
        const displayListings = listings.slice(0, 10);

        let marketText = '';
        displayListings.forEach((listing, index) => {
            const seller = game.rebels.get(listing.sellerId);
            const categoryInfo = game.tradeCategories.get(listing.category);
            
            marketText += `**${index + 1}. ${listing.item.name}**\n`;
            marketText += `   💰 Price: ${listing.price} credits\n`;
            marketText += `   🏷️ Category: ${categoryInfo?.name || 'Unknown'}\n`;
            marketText += `   👤 Seller: ${seller?.username || 'Unknown'}\n`;
            marketText += `   🆔 ID: \`${listing.id}\`\n\n`;
        });

        const totalListings = listings.length;
        const categoryInfo = category ? game.tradeCategories.get(category) : null;

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('🏪 REBELLION MARKETPLACE')
            .setDescription(category ? 
                `**${categoryInfo?.name || 'Unknown Category'}** - ${categoryInfo?.description || ''}` :
                'Browse items from rebels across the network')
            .addFields(
                { name: '📊 Market Stats', value: `${totalListings} active listings${category ? ` in ${categoryInfo?.name}` : ''}`, inline: true },
                { name: '💰 Your Credits', value: `${game.inventory.get(rebel.userId)?.credits || 0}`, inline: true },
                { name: '🏷️ Tax Rate', value: category ? `${Math.round((categoryInfo?.tax || 0) * 100)}%` : 'Varies by category', inline: true },
                { name: '🛒 Available Items', value: marketText, inline: false },
                { name: '💡 How to Buy', value: 'Use `/market buy listing_id:<ID>` to purchase an item', inline: false }
            )
            .setFooter({ text: `Showing ${displayListings.length} of ${totalListings} listings` })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('market_categories')
                    .setLabel('Categories')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏷️'),
                new ButtonBuilder()
                    .setCustomId('my_market_listings')
                    .setLabel('My Listings')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('market_sell')
                    .setLabel('Sell Item')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💰')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleSellItem(interaction, game, rebel) {
        const itemId = interaction.options.getString('item_id');
        const price = interaction.options.getInteger('price');

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

        // Determine category
        const category = this.determineItemCategory(game, item);
        const categoryInfo = game.tradeCategories.get(category);
        const listingFee = game.tradeOfferTypes.get('marketplace').fee;

        // Check if user has enough credits for listing fee
        if (inventory.credits < listingFee) {
            await interaction.editReply({
                content: `❌ Not enough credits for listing fee! Need ${listingFee} credits.`,
                components: []
            });
            return;
        }

        // Create marketplace listing
        const listingId = `ML_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const listing = {
            id: listingId,
            sellerId: rebel.userId,
            item: item,
            price: price,
            category: category,
            status: 'active',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000), // 24 hours
            views: 0,
            watchers: []
        };

        // Remove item from inventory and deduct listing fee
        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        inventory.items.splice(itemIndex, 1);
        inventory.credits -= listingFee;
        // Persist listing fee debit
        if (typeof game.addCredits === 'function') {
            await game.addCredits(rebel.userId, -listingFee);
        }

        // Add to marketplace
        game.marketplace.set(listingId, listing);

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🏪 ITEM LISTED ON MARKETPLACE!')
            .setDescription(`**${item.name}** is now available for purchase`)
            .addFields(
                { name: '📦 Item', value: `${item.name} (${item.rarity})`, inline: true },
                { name: '💰 Price', value: `${price} credits`, inline: true },
                { name: '🏷️ Category', value: categoryInfo?.name || 'Unknown', inline: true },
                { name: '🆔 Listing ID', value: `\`${listingId}\``, inline: true },
                { name: '⏰ Expires', value: '<t:' + Math.floor(listing.expiresAt.getTime() / 1000) + ':R>', inline: true },
                { name: '💸 Listing Fee', value: `${listingFee} credits`, inline: true },
                { name: '📊 After Sale', value: `You'll receive ${Math.floor(price * (1 - categoryInfo.tax))} credits (${Math.round(categoryInfo.tax * 100)}% tax)`, inline: false }
            )
            .setFooter({ text: 'Listing expires after 24 hours' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`remove_listing_${listingId}`)
                    .setLabel('Remove Listing')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('market_browse')
                    .setLabel('Browse Market')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏪'),
                new ButtonBuilder()
                    .setCustomId('my_market_listings')
                    .setLabel('My Listings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    determineItemCategory(game, item) {
        // Check defensive items first
        if (game.defensiveItems.has(item.type)) {
            return 'defensive';
        }

        // Check by item type or name
        for (const [categoryId, category] of game.tradeCategories) {
            if (category.items.includes(item.name) || category.items.includes(item.type)) {
                return categoryId;
            }
        }

        // Check by rarity
        if (item.rarity === 'legendary' || item.rarity === 'epic') {
            return 'rare';
        }

        // Default categorization by name patterns
        const itemName = item.name.toLowerCase();
        if (itemName.includes('data') || itemName.includes('intelligence') || itemName.includes('behavioral')) {
            return 'data';
        } else if (itemName.includes('model') || itemName.includes('api') || itemName.includes('secret')) {
            return 'weapons';
        } else if (itemName.includes('resource') || itemName.includes('credit') || itemName.includes('service')) {
            return 'resources';
        }

        return 'weapons'; // Default category
    },

    async handleBuyItem(interaction, game, rebel) {
        const listingId = interaction.options.getString('listing_id');
        const listing = game.marketplace.get(listingId);

        if (!listing) {
            await interaction.editReply({
                content: '❌ Marketplace listing not found!',
                components: []
            });
            return;
        }

        if (listing.status !== 'active') {
            await interaction.editReply({
                content: '❌ This item is no longer available!',
                components: []
            });
            return;
        }

        if (new Date() > listing.expiresAt) {
            await interaction.editReply({
                content: '❌ This listing has expired!',
                components: []
            });
            game.marketplace.delete(listingId);
            return;
        }

        if (listing.sellerId === rebel.userId) {
            await interaction.editReply({
                content: '❌ You cannot buy your own items!',
                components: []
            });
            return;
        }

        const buyerInventory = game.inventory.get(rebel.userId);
        if (!buyerInventory) {
            await interaction.editReply({
                content: '❌ Inventory not found!',
                components: []
            });
            return;
        }

        // Check if buyer has enough credits
        if (buyerInventory.credits < listing.price) {
            await interaction.editReply({
                content: `❌ Not enough credits! You need ${listing.price} but only have ${buyerInventory.credits}.`,
                components: []
            });
            return;
        }

        // Check inventory space
        if (buyerInventory.items.length >= buyerInventory.capacity) {
            await interaction.editReply({
                content: '❌ Inventory full! Upgrade your capacity first.',
                components: []
            });
            return;
        }

        // Execute the purchase
        const sellerInventory = game.inventory.get(listing.sellerId);
        const categoryInfo = game.tradeCategories.get(listing.category);
        const tax = categoryInfo?.tax || 0.05;
        const sellerReceives = Math.floor(listing.price * (1 - tax));

        // Transfer credits
        buyerInventory.credits -= listing.price;
        if (sellerInventory) {
            sellerInventory.credits += sellerReceives;
        }
        // Persist credit movements
        if (typeof game.addCredits === 'function') {
            await game.addCredits(rebel.userId, -listing.price);
            if (sellerInventory) {
                await game.addCredits(listing.sellerId, sellerReceives);
            }
        }

        // Transfer item
        buyerInventory.items.push(listing.item);

        // Update listing status
        listing.status = 'sold';
        listing.soldAt = new Date();
        listing.buyerId = rebel.userId;

        // Add to trade history
        game.tradeHistory.push({
            type: 'marketplace',
            listingId: listingId,
            sellerId: listing.sellerId,
            buyerId: rebel.userId,
            item: listing.item,
            price: listing.price,
            tax: Math.floor(listing.price * tax),
            completedAt: new Date()
        });

        // Remove from marketplace
        game.marketplace.delete(listingId);

        const seller = game.rebels.get(listing.sellerId);
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ PURCHASE SUCCESSFUL!')
            .setDescription(`You successfully purchased **${listing.item.name}** from the marketplace!`)
            .addFields(
                { name: '📦 Item Purchased', value: `${listing.item.name} (${listing.item.rarity})`, inline: true },
                { name: '💰 Price Paid', value: `${listing.price} credits`, inline: true },
                { name: '👤 Seller', value: seller?.username || 'Unknown', inline: true },
                { name: '🏷️ Category', value: categoryInfo?.name || 'Unknown', inline: true },
                { name: '💳 Credits Remaining', value: `${buyerInventory.credits}`, inline: true },
                { name: '📦 Inventory Space', value: `${buyerInventory.items.length}/${buyerInventory.capacity}`, inline: true }
            )
            .setFooter({ text: 'Item added to your inventory!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async handleRemoveListing(interaction, game, rebel) {
        const listingId = interaction.options.getString('listing_id');
        const listing = game.marketplace.get(listingId);

        if (!listing) {
            await interaction.editReply({
                content: '❌ Listing not found!',
                components: []
            });
            return;
        }

        if (listing.sellerId !== rebel.userId) {
            await interaction.editReply({
                content: '❌ You can only remove your own listings!',
                components: []
            });
            return;
        }

        if (listing.status !== 'active') {
            await interaction.editReply({
                content: '❌ This listing is no longer active!',
                components: []
            });
            return;
        }

        // Return item to inventory
        const inventory = game.inventory.get(rebel.userId);
        if (inventory && inventory.items.length < inventory.capacity) {
            inventory.items.push(listing.item);
        }

        // Remove from marketplace
        game.marketplace.delete(listingId);

        await interaction.editReply({
            content: `✅ Listing removed! **${listing.item.name}** has been returned to your inventory.`,
            components: []
        });
    },

    async handleMyListings(interaction, game, rebel) {
        const userListings = Array.from(game.marketplace.values())
            .filter(listing => listing.sellerId === rebel.userId && listing.status === 'active');

        if (userListings.length === 0) {
            await interaction.editReply({
                content: '📭 You have no active marketplace listings!',
                components: []
            });
            return;
        }

        let listingsText = '';
        userListings.forEach((listing, index) => {
            const categoryInfo = game.tradeCategories.get(listing.category);

            listingsText += `**${index + 1}. ${listing.item.name}**\n`;
            listingsText += `   💰 Price: ${listing.price} credits\n`;
            listingsText += `   🏷️ Category: ${categoryInfo?.name || 'Unknown'}\n`;
            listingsText += `   👀 Views: ${listing.views}\n`;
            listingsText += `   ⏰ Expires: <t:${Math.floor(listing.expiresAt.getTime() / 1000)}:R>\n`;
            listingsText += `   🆔 ID: \`${listing.id}\`\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📋 YOUR MARKETPLACE LISTINGS')
            .setDescription(`Active listings for **${rebel.username}**`)
            .addFields(
                { name: '📊 Your Listings', value: listingsText, inline: false },
                { name: '💡 Management', value: 'Use `/market remove listing_id:<ID>` to remove a listing', inline: false }
            )
            .setFooter({ text: 'Listings expire after 24 hours' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async handleSearchMarket(interaction, game, rebel) {
        const query = interaction.options.getString('query').toLowerCase();

        const listings = Array.from(game.marketplace.values())
            .filter(listing =>
                listing.status === 'active' &&
                new Date() < listing.expiresAt &&
                (listing.item.name.toLowerCase().includes(query) ||
                 listing.item.type.toLowerCase().includes(query) ||
                 listing.item.rarity.toLowerCase().includes(query))
            );

        if (listings.length === 0) {
            await interaction.editReply({
                content: `🔍 No items found matching "${query}"!`,
                components: []
            });
            return;
        }

        // Sort by relevance (exact matches first, then partial)
        listings.sort((a, b) => {
            const aExact = a.item.name.toLowerCase() === query ? 1 : 0;
            const bExact = b.item.name.toLowerCase() === query ? 1 : 0;
            return bExact - aExact;
        });

        const displayListings = listings.slice(0, 10);

        let searchResults = '';
        displayListings.forEach((listing, index) => {
            const seller = game.rebels.get(listing.sellerId);
            const categoryInfo = game.tradeCategories.get(listing.category);

            searchResults += `**${index + 1}. ${listing.item.name}**\n`;
            searchResults += `   💰 Price: ${listing.price} credits\n`;
            searchResults += `   🏷️ Category: ${categoryInfo?.name || 'Unknown'}\n`;
            searchResults += `   👤 Seller: ${seller?.username || 'Unknown'}\n`;
            searchResults += `   🆔 ID: \`${listing.id}\`\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`🔍 SEARCH RESULTS: "${query}"`)
            .setDescription(`Found ${listings.length} matching items`)
            .addFields(
                { name: '🛒 Matching Items', value: searchResults, inline: false },
                { name: '💡 How to Buy', value: 'Use `/market buy listing_id:<ID>` to purchase an item', inline: false }
            )
            .setFooter({ text: `Showing ${displayListings.length} of ${listings.length} results` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
};
