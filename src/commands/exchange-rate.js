import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('exchange-rate')
        .setDescription('Check current market prices and trading trends!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .setDescription('View current market prices for items'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trends')
                .setDescription('View price trends and market analysis'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('item')
                .setDescription('Check price history for a specific item')
                .addStringOption(option =>
                    option.setName('item_name')
                        .setDescription('Name of the item to check')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('calculator')
                .setDescription('Calculate trade values and taxes')
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Item price in credits')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Item category for tax calculation')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Weapons & Tools', value: 'weapons' },
                            { name: 'Data & Intelligence', value: 'data' },
                            { name: 'Resources & Materials', value: 'resources' },
                            { name: 'Defensive Items', value: 'defensive' },
                            { name: 'Rare & Legendary', value: 'rare' }
                        ))),

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
                case 'current':
                    await this.handleCurrentPrices(interaction, game, rebel);
                    break;
                case 'trends':
                    await this.handleMarketTrends(interaction, game, rebel);
                    break;
                case 'item':
                    await this.handleItemPrice(interaction, game, rebel);
                    break;
                case 'calculator':
                    await this.handleTradeCalculator(interaction, game, rebel);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Exchange rate command error:', error);
            await interaction.editReply({
                content: '💥 Market analysis systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCurrentPrices(interaction, game, rebel) {
        // Analyze current marketplace and auction prices
        const marketData = this.analyzeCurrentMarket(game);
        
        let priceData = '';
        for (const [category, data] of Object.entries(marketData.categories)) {
            const categoryInfo = game.tradeCategories.get(category);
            priceData += `**${categoryInfo?.name || category}**\n`;
            priceData += `   📊 Listings: ${data.listings}\n`;
            priceData += `   💰 Avg Price: ${data.avgPrice} credits\n`;
            priceData += `   📈 Range: ${data.minPrice} - ${data.maxPrice}\n`;
            priceData += `   🏷️ Tax Rate: ${Math.round((categoryInfo?.tax || 0) * 100)}%\n\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('💹 CURRENT MARKET PRICES')
            .setDescription('Real-time pricing data from the rebellion marketplace')
            .addFields(
                { name: '📊 Market Overview', value: `${marketData.totalListings} active listings\n${marketData.totalAuctions} active auctions`, inline: true },
                { name: '💰 Market Volume', value: `${marketData.totalValue} credits`, inline: true },
                { name: '📈 Activity Level', value: this.getMarketActivity(marketData), inline: true },
                { name: '🏷️ Category Breakdown', value: priceData || 'No market data available', inline: false },
                { name: '💡 Market Tips', value: this.getMarketTips(marketData), inline: false }
            )
            .setFooter({ text: 'Prices updated in real-time based on active listings' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_refresh_prices')
                    .setLabel('Refresh Prices')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('market_trends')
                    .setLabel('View Trends')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('trade_calculator')
                    .setLabel('Trade Calculator')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🧮')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    analyzeCurrentMarket(game) {
        const marketListings = Array.from(game.marketplace.values())
            .filter(listing => listing.status === 'active');
        
        const auctions = Array.from(game.auctions.values())
            .filter(auction => auction.status === 'active');

        const categories = {};
        let totalValue = 0;

        // Analyze marketplace listings
        marketListings.forEach(listing => {
            const category = listing.category;
            if (!categories[category]) {
                categories[category] = {
                    listings: 0,
                    prices: [],
                    avgPrice: 0,
                    minPrice: Infinity,
                    maxPrice: 0
                };
            }

            categories[category].listings++;
            categories[category].prices.push(listing.price);
            categories[category].minPrice = Math.min(categories[category].minPrice, listing.price);
            categories[category].maxPrice = Math.max(categories[category].maxPrice, listing.price);
            totalValue += listing.price;
        });

        // Calculate averages
        for (const category of Object.keys(categories)) {
            const data = categories[category];
            data.avgPrice = Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length);
            if (data.minPrice === Infinity) data.minPrice = 0;
        }

        return {
            totalListings: marketListings.length,
            totalAuctions: auctions.length,
            totalValue: totalValue,
            categories: categories
        };
    },

    getMarketActivity(marketData) {
        const total = marketData.totalListings + marketData.totalAuctions;
        if (total > 50) return '🔥 Very High';
        if (total > 25) return '📈 High';
        if (total > 10) return '📊 Moderate';
        if (total > 0) return '📉 Low';
        return '💤 Inactive';
    },

    getMarketTips(marketData) {
        const tips = [];
        
        if (marketData.totalListings < 5) {
            tips.push('🎯 Low supply - good time to sell items');
        }
        
        if (marketData.totalAuctions > marketData.totalListings) {
            tips.push('🔨 More auctions than fixed prices - consider bidding');
        }
        
        // Find most active category
        let mostActive = null;
        let maxListings = 0;
        for (const [category, data] of Object.entries(marketData.categories)) {
            if (data.listings > maxListings) {
                maxListings = data.listings;
                mostActive = category;
            }
        }
        
        if (mostActive) {
            tips.push(`📊 Most active category: ${mostActive}`);
        }

        return tips.join('\n') || '💡 Market is quiet - good time to list items';
    },

    async handleMarketTrends(interaction, game, rebel) {
        // Analyze trade history for trends
        const trends = this.analyzeTrends(game);
        
        let trendData = '';
        trends.recentTrades.forEach((trade, index) => {
            const timeAgo = Math.floor((Date.now() - trade.completedAt.getTime()) / 60000);
            trendData += `${index + 1}. **${trade.item?.name || 'Unknown'}** - ${trade.price || trade.finalBid} credits (${timeAgo}m ago)\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('📈 MARKET TRENDS & ANALYSIS')
            .setDescription('Historical trading data and market insights')
            .addFields(
                { name: '📊 Trading Volume', value: `${trends.totalTrades} completed trades\n${trends.totalVolume} credits traded`, inline: true },
                { name: '📈 Price Movement', value: trends.priceDirection, inline: true },
                { name: '🔥 Hot Items', value: trends.popularItems.join('\n') || 'No data', inline: true },
                { name: '🕐 Recent Trades', value: trendData || 'No recent trades', inline: false },
                { name: '💡 Market Insights', value: this.getMarketInsights(trends), inline: false }
            )
            .setFooter({ text: 'Based on last 24 hours of trading activity' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    analyzeTrends(game) {
        const oneDayAgo = new Date(Date.now() - 86400000); // 24 hours ago
        const recentTrades = game.tradeHistory
            .filter(trade => trade.completedAt > oneDayAgo)
            .slice(-10); // Last 10 trades

        const itemCounts = {};
        let totalVolume = 0;

        recentTrades.forEach(trade => {
            const itemName = trade.item?.name || 'Unknown';
            itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
            totalVolume += trade.price || trade.finalBid || 0;
        });

        const popularItems = Object.entries(itemCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([item, count]) => `${item} (${count}x)`);

        return {
            totalTrades: recentTrades.length,
            totalVolume: totalVolume,
            recentTrades: recentTrades,
            popularItems: popularItems,
            priceDirection: this.calculatePriceDirection(recentTrades)
        };
    },

    calculatePriceDirection(trades) {
        if (trades.length < 2) return '➡️ Stable';
        
        const recent = trades.slice(-3);
        const older = trades.slice(-6, -3);
        
        const recentAvg = recent.reduce((sum, trade) => sum + (trade.price || trade.finalBid || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, trade) => sum + (trade.price || trade.finalBid || 0), 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) return '📈 Rising';
        if (recentAvg < olderAvg * 0.9) return '📉 Falling';
        return '➡️ Stable';
    },

    getMarketInsights(trends) {
        const insights = [];
        
        if (trends.totalTrades > 20) {
            insights.push('🔥 High trading activity - active market');
        } else if (trends.totalTrades < 5) {
            insights.push('💤 Low trading activity - opportunity for arbitrage');
        }
        
        if (trends.popularItems.length > 0) {
            insights.push(`🎯 High demand for: ${trends.popularItems[0].split(' ')[0]}`);
        }
        
        if (trends.priceDirection.includes('Rising')) {
            insights.push('📈 Prices trending upward - good time to sell');
        } else if (trends.priceDirection.includes('Falling')) {
            insights.push('📉 Prices trending downward - good time to buy');
        }

        return insights.join('\n') || '📊 Market data insufficient for insights';
    },

    async handleTradeCalculator(interaction, game, rebel) {
        const price = interaction.options.getInteger('price');
        const category = interaction.options.getString('category') || 'weapons';
        
        const categoryInfo = game.tradeCategories.get(category);
        const tax = categoryInfo?.tax || 0.05;
        const marketplaceFee = game.tradeOfferTypes.get('marketplace').fee;
        const auctionFee = game.tradeOfferTypes.get('auction').fee;
        
        const netMarketplace = Math.floor(price * (1 - tax)) - marketplaceFee;
        const netAuction = Math.floor(price * (1 - 0.10)) - auctionFee; // 10% auction house fee
        
        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('🧮 TRADE VALUE CALCULATOR')
            .setDescription(`Calculating returns for **${price} credits** in **${categoryInfo?.name || 'Unknown'}** category`)
            .addFields(
                { name: '💰 Selling Price', value: `${price} credits`, inline: true },
                { name: '🏷️ Category', value: categoryInfo?.name || 'Unknown', inline: true },
                { name: '📊 Tax Rate', value: `${Math.round(tax * 100)}%`, inline: true },
                { name: '🏪 Marketplace Sale', value: `**Net: ${netMarketplace} credits**\n- Listing Fee: ${marketplaceFee}\n- Tax: ${Math.floor(price * tax)}`, inline: true },
                { name: '🔨 Auction Sale', value: `**Net: ${netAuction} credits**\n- Listing Fee: ${auctionFee}\n- House Fee: ${Math.floor(price * 0.10)}`, inline: true },
                { name: '💡 Recommendation', value: netMarketplace > netAuction ? '🏪 Marketplace is better' : '🔨 Auction is better', inline: true },
                { name: '📈 Break-even Analysis', value: `Minimum price to profit:\n• Marketplace: ${Math.ceil((marketplaceFee) / (1 - tax))} credits\n• Auction: ${Math.ceil(auctionFee / 0.9)} credits`, inline: false }
            )
            .setFooter({ text: 'Calculations based on current fees and tax rates' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
};
