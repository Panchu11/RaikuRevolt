import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('items')
        .setDescription('List your items with IDs for trading and detailed management!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all items with their IDs')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter items by type or rarity')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Weapons & Tools', value: 'weapons' },
                            { name: 'Data & Intelligence', value: 'data' },
                            { name: 'Resources & Materials', value: 'resources' },
                            { name: 'Defensive Items', value: 'defensive' },
                            { name: 'Common Items', value: 'common' },
                            { name: 'Rare Items', value: 'rare' },
                            { name: 'Epic Items', value: 'epic' },
                            { name: 'Legendary Items', value: 'legendary' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('details')
                .setDescription('Get detailed information about a specific item')
                .addStringOption(option =>
                    option.setName('item_id')
                        .setDescription('Item ID to get details for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for items by name')
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

            const inventory = game.inventory.get(userId);
            if (!inventory) {
                await interaction.editReply({
                    content: '❌ Inventory not found!',
                    components: []
                });
                return;
            }

            switch (subcommand) {
                case 'list':
                    await this.handleListItems(interaction, game, rebel, inventory);
                    break;
                case 'details':
                    await this.handleItemDetails(interaction, game, rebel, inventory);
                    break;
                case 'search':
                    await this.handleSearchItems(interaction, game, rebel, inventory);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Items command error:', error);
            await interaction.editReply({
                content: '💥 Item management systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleListItems(interaction, game, rebel, inventory) {
        const filter = interaction.options.getString('filter');
        
        let items = [...inventory.items];
        
        // Apply filter
        if (filter) {
            if (['common', 'rare', 'epic', 'legendary'].includes(filter)) {
                items = items.filter(item => item.rarity === filter);
            } else {
                items = items.filter(item => this.getItemCategory(game, item) === filter);
            }
        }

        if (items.length === 0) {
            const filterText = filter ? ` matching "${filter}"` : '';
            await interaction.editReply({
                content: `📭 No items found${filterText}!`,
                components: []
            });
            return;
        }

        // Sort by rarity and value
        items.sort((a, b) => {
            const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
            const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
            if (rarityDiff !== 0) return rarityDiff;
            return b.value - a.value;
        });

        // Create paginated display
        const itemsPerPage = 10;
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const currentPage = 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = items.slice(startIndex, endIndex);

        let itemsList = '';
        pageItems.forEach((item, index) => {
            const rarityEmoji = this.getRarityEmoji(item.rarity);
            const typeEmoji = this.getTypeEmoji(item.type);
            
            itemsList += `${rarityEmoji}${typeEmoji} **${item.name}**\n`;
            itemsList += `   🆔 \`${item.id}\`\n`;
            itemsList += `   💎 ${item.rarity} • 💰 ${item.value} credits\n`;
            itemsList += `   📍 From: ${item.acquiredFrom}\n\n`;
        });

        const filterText = filter ? ` (${filter})` : '';
        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`📋 ${rebel.username}'s Items${filterText}`)
            .setDescription(itemsList)
            .addFields(
                { name: '📊 Summary', value: `${items.length} items total\nPage ${currentPage} of ${totalPages}`, inline: true },
                { name: '💰 Total Value', value: `${items.reduce((sum, item) => sum + item.value, 0)} credits`, inline: true },
                { name: '💡 Usage', value: 'Copy item IDs for trading with `/trade` or `/market` commands', inline: false }
            )
            .setFooter({ text: 'Use /items details item_id:<ID> for more information' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('items_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('items_filter_rare')
                    .setLabel('Rare+')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('trade_menu')
                    .setLabel('Trade Items')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💱'),
                new ButtonBuilder()
                    .setCustomId('market_sell_menu')
                    .setLabel('Sell on Market')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏪')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleItemDetails(interaction, game, rebel, inventory) {
        const itemId = interaction.options.getString('item_id');
        
        const item = inventory.items.find(i => i.id === itemId);
        if (!item) {
            await interaction.editReply({
                content: '❌ Item not found! Use `/items list` to see your items with IDs.',
                components: []
            });
            return;
        }

        const rarityEmoji = this.getRarityEmoji(item.rarity);
        const typeEmoji = this.getTypeEmoji(item.type);
        const category = this.getItemCategory(game, item);
        const categoryInfo = game.tradeCategories.get(category);

        // Calculate market value estimate
        const marketValue = Math.floor(item.value * 1.2); // 20% markup estimate
        const auctionEstimate = Math.floor(item.value * 1.4); // 40% markup for auctions

        const embed = new EmbedBuilder()
            .setColor(this.getRarityColor(item.rarity))
            .setTitle(`${rarityEmoji}${typeEmoji} ${item.name}`)
            .setDescription(`Detailed information for item **${item.id}**`)
            .addFields(
                { name: '🆔 Item ID', value: `\`${item.id}\``, inline: true },
                { name: '💎 Rarity', value: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1), inline: true },
                { name: '🏷️ Type', value: this.getTypeName(item.type), inline: true },
                { name: '💰 Base Value', value: `${item.value} credits`, inline: true },
                { name: '📊 Market Category', value: categoryInfo?.name || 'Unknown', inline: true },
                { name: '🏷️ Market Tax', value: `${Math.round((categoryInfo?.tax || 0) * 100)}%`, inline: true },
                { name: '📍 Acquired From', value: item.acquiredFrom, inline: true },
                { name: '📅 Acquired Date', value: `<t:${Math.floor(item.acquiredAt.getTime() / 1000)}:R>`, inline: true },
                { name: '💡 Trading Info', value: `Estimated market value: ${marketValue} credits\nEstimated auction value: ${auctionEstimate} credits`, inline: false }
            )
            .setFooter({ text: 'Use this ID for trading, selling, or auctioning' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`trade_item_${item.id}`)
                    .setLabel('Trade Item')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💱'),
                new ButtonBuilder()
                    .setCustomId(`market_sell_${item.id}`)
                    .setLabel('Sell on Market')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪'),
                new ButtonBuilder()
                    .setCustomId(`auction_item_${item.id}`)
                    .setLabel('Create Auction')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('items_list')
                    .setLabel('Back to List')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleSearchItems(interaction, game, rebel, inventory) {
        const query = interaction.options.getString('query').toLowerCase();
        
        const matchingItems = inventory.items.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query) ||
            item.rarity.toLowerCase().includes(query) ||
            item.acquiredFrom.toLowerCase().includes(query)
        );

        if (matchingItems.length === 0) {
            await interaction.editReply({
                content: `🔍 No items found matching "${query}"!`,
                components: []
            });
            return;
        }

        let searchResults = '';
        matchingItems.slice(0, 10).forEach((item, index) => {
            const rarityEmoji = this.getRarityEmoji(item.rarity);
            const typeEmoji = this.getTypeEmoji(item.type);
            
            searchResults += `${rarityEmoji}${typeEmoji} **${item.name}**\n`;
            searchResults += `   🆔 \`${item.id}\` • 💰 ${item.value} credits\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`🔍 Search Results: "${query}"`)
            .setDescription(searchResults)
            .addFields(
                { name: '📊 Results', value: `Found ${matchingItems.length} matching items`, inline: true },
                { name: '💡 Next Steps', value: 'Use `/items details item_id:<ID>` for more info', inline: true }
            )
            .setFooter({ text: 'Showing first 10 results' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    getItemCategory(game, item) {
        // Check defensive items first
        if (game.defensiveItems && game.defensiveItems.has(item.type)) {
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

    getRarityEmoji(rarity) {
        const emojis = {
            'common': '⚪',
            'rare': '🔵',
            'epic': '🟣',
            'legendary': '🟡'
        };
        return emojis[rarity] || '⚪';
    },

    getRarityColor(rarity) {
        const colors = {
            'common': 0x808080,
            'rare': 0x0080ff,
            'epic': 0x8000ff,
            'legendary': 0xffd700
        };
        return colors[rarity] || 0x808080;
    },

    getTypeEmoji(type) {
        const emojis = {
            'weapon': '⚔️',
            'data': '📊',
            'resource': '💎',
            'defensive': '🛡️',
            'tool': '🔧',
            'intelligence': '🕵️'
        };
        return emojis[type] || '📦';
    },

    getTypeName(type) {
        const names = {
            'weapon': 'Weapon',
            'data': 'Data',
            'resource': 'Resource',
            'defensive': 'Defensive',
            'tool': 'Tool',
            'intelligence': 'Intelligence'
        };
        return names[type] || 'Unknown';
    }
};
