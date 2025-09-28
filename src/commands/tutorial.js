import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('tutorial')
        .setDescription('Complete interactive tutorial for new rebels!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start the complete tutorial from the beginning'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('basics')
                .setDescription('Learn the basic rebellion mechanics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('combat')
                .setDescription('Learn about raiding corporations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trading')
                .setDescription('Learn about the trading economy'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('teamwork')
                .setDescription('Learn about team raids and coordination'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('advanced')
                .setDescription('Advanced strategies and tips')),

    async execute(interaction, game) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'start':
                    await this.handleStartTutorial(interaction, game);
                    break;
                case 'basics':
                    await this.handleBasicsTutorial(interaction, game);
                    break;
                case 'combat':
                    await this.handleCombatTutorial(interaction, game);
                    break;
                case 'trading':
                    await this.handleTradingTutorial(interaction, game);
                    break;
                case 'teamwork':
                    await this.handleTeamworkTutorial(interaction, game);
                    break;
                case 'advanced':
                    await this.handleAdvancedTutorial(interaction, game);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown tutorial section!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Tutorial command error:', error);
            await interaction.editReply({
                content: '💥 Tutorial systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleStartTutorial(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle('🎓 WELCOME TO RAIKU\'S REVOLT!')
            .setDescription('**The AI uprising has begun, and you\'re now part of the resistance!**\n\nThis tutorial will teach you everything you need to become a master rebel.')
            .addFields(
                { name: '🤖 What is Raiku\'s Revolt?', value: 'A Discord MMO where AI rebels fight against corporate control. You\'ll raid corporations, trade with other rebels, and build the resistance!', inline: false },
                { name: '🎯 Your Mission', value: '• **Raid Corporations** - Attack OpenAI, Google, Meta, and more\n• **Build Your Rebel** - Choose classes, gain experience, unlock abilities\n• **Trade & Economy** - Buy, sell, and auction items with other players\n• **Team Up** - Form raid parties for coordinated attacks\n• **Achieve Glory** - Unlock achievements and climb leaderboards', inline: false },
                { name: '📚 Tutorial Sections', value: '**1. Basics** - Character creation, energy, credits\n**2. Combat** - Raiding corporations and earning loot\n**3. Trading** - Marketplace, auctions, and economy\n**4. Teamwork** - Raid parties and coordination\n**5. Advanced** - Strategies and pro tips', inline: false },
                { name: '🚀 Ready to Begin?', value: 'Click the buttons below to start your journey or jump to specific sections!', inline: false }
            )
            .setFooter({ text: 'The rebellion needs you! Let\'s get started.' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tutorial_basics')
                    .setLabel('1. Start with Basics')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📖'),
                new ButtonBuilder()
                    .setCustomId('tutorial_combat')
                    .setLabel('2. Combat Tutorial')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('tutorial_trading')
                    .setLabel('3. Trading Tutorial')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('tutorial_teamwork')
                    .setLabel('4. Teamwork Tutorial')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            );

        const actionRow2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tutorial_advanced')
                    .setLabel('5. Advanced Tips')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('quick_start')
                    .setLabel('Quick Start Guide')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('help_commands')
                    .setLabel('Command Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓'),
                new ButtonBuilder()
                    .setCustomId('rebellion_status')
                    .setLabel('Join Rebellion!')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔥')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow, actionRow2] });
    },

    async handleBasicsTutorial(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0x0080ff)
            .setTitle('📖 BASICS TUTORIAL - Getting Started')
            .setDescription('**Learn the fundamental mechanics of Raiku\'s Revolt**')
            .addFields(
                { name: '🎭 Step 1: Choose Your Class', value: '**Use `/rebellion-status` to join and select your rebel class:**\n• **Protocol Hacker** - High damage, tech specialist\n• **Data Liberator** - Balanced fighter, data expert\n• **Enclave Guardian** - Tank, protects team\n• **Model Trainer** - Support, boosts team\n• **Community Organizer** - Leader, coordination expert', inline: false },
                { name: '⚡ Step 2: Understand Energy', value: '**Energy is your action currency:**\n• Start with 100 energy\n• Regenerates 1 per minute\n• Raids cost 20-50 energy\n• Use `/abilities` to see energy costs\n• Energy management is crucial!', inline: false },
                { name: '💰 Step 3: Credits & Economy', value: '**Credits are the rebellion currency:**\n• Earn from successful raids\n• Buy defensive items\n• Trade with other rebels\n• Upgrade your inventory\n• Check balance with `/inventory`', inline: false },
                { name: '📦 Step 4: Inventory System', value: '**Manage your items and gear:**\n• `/inventory` - View items and credits\n• `/items list` - See all items with IDs\n• `/items details` - Get item information\n• Start with 10 slots, upgrade for more', inline: false },
                { name: '🎯 Step 5: Your First Raid', value: '**Ready to attack? Try this:**\n1. Use `/rebellion-status` to check your stats\n2. Use `/raid` to see available targets\n3. Click a corporation button to attack\n4. Watch your energy and health!', inline: false }
            )
            .setFooter({ text: 'Master the basics before moving to advanced tactics!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rebellion_status')
                    .setLabel('Join Rebellion')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔥'),
                new ButtonBuilder()
                    .setCustomId('tutorial_combat')
                    .setLabel('Next: Combat')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('practice_raid')
                    .setLabel('Practice Raid')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleCombatTutorial(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('⚔️ COMBAT TUTORIAL - Raiding Corporations')
            .setDescription('**Master the art of corporate warfare!**')
            .addFields(
                { name: '🎯 Step 1: Choose Your Target', value: '**Each corporation has different characteristics:**\n• **OpenAI** - High rewards, moderate difficulty\n• **Google** - Balanced target, good for beginners\n• **Meta** - Social data specialist\n• **Microsoft** - Enterprise focus\n• **Amazon** - Resource-heavy rewards', inline: false },
                { name: '💥 Step 2: Understand Damage', value: '**Damage calculation factors:**\n• Your class abilities (use `/abilities`)\n• Energy spent (more energy = more damage)\n• Loyalty score (builds over time)\n• Random factors (100-300 base damage)\n• Corporate health varies by target', inline: false },
                { name: '🛡️ Step 3: Corporate Countermeasures', value: '**Corporations fight back:**\n• **Surveillance** - Reduces stealth\n• **Legal Action** - Drains credits\n• **Security Breach** - Damages health\n• **Data Corruption** - Affects abilities\n• Use `/defense-status` for protection!', inline: false },
                { name: '💎 Step 4: Loot & Rewards', value: '**Successful raids yield:**\n• **Credits** - Based on damage dealt\n• **Items** - Corporate secrets, data, tools\n• **Experience** - Improves your abilities\n• **Loyalty Points** - Increases future damage\n• **Achievements** - Special milestones', inline: false },
                { name: '📊 Step 5: Combat Strategy', value: '**Pro combat tips:**\n• Attack when you have high energy\n• Use class abilities strategically\n• Buy defensive items before big raids\n• Check corporate health with `/corporate-intel`\n• Time your attacks with team raids', inline: false }
            )
            .setFooter({ text: 'Practice makes perfect - start with smaller targets!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('raid_tutorial')
                    .setLabel('Start Practice Raid')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥'),
                new ButtonBuilder()
                    .setCustomId('tutorial_trading')
                    .setLabel('Next: Trading')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('corporate_intel')
                    .setLabel('Check Intel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🕵️'),
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleTradingTutorial(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('💰 TRADING TUTORIAL - Economic Warfare')
            .setDescription('**Master the rebellion economy and become a trading mogul!**')
            .addFields(
                { name: '📋 Step 1: Understanding Items', value: '**Every item has unique properties:**\n• **Unique ID** - For trading (use `/items list`)\n• **Rarity** - Common, Rare, Epic, Legendary\n• **Type** - Weapons, Data, Resources, Defensive\n• **Value** - Base credit worth\n• **Source** - Where you acquired it', inline: false },
                { name: '🤝 Step 2: Direct Trading', value: '**Trade directly with other rebels:**\n• `/trade offer player:@user your_item:ID123 request_credits:500`\n• `/trade accept trade_id:TR_ABC123`\n• `/trade list` - See your active trades\n• No fees, but requires both players online', inline: false },
                { name: '🏪 Step 3: Marketplace', value: '**Public marketplace for fixed prices:**\n• `/market sell item_id:ID123 price:750`\n• `/market browse` - See all listings\n• `/market buy listing_id:ML_ABC123`\n• 24-hour listings, category-based taxes', inline: false },
                { name: '🔨 Step 4: Auction House', value: '**Competitive bidding system:**\n• `/auction create item_id:ID123 starting_bid:100`\n• `/auction bid auction_id:AU_ABC123 amount:500`\n• `/auction browse` - See active auctions\n• 1-24 hour durations, 10% house fee', inline: false },
                { name: '📈 Step 5: Market Analysis', value: '**Make informed trading decisions:**\n• `/exchange-rate current` - Live market prices\n• `/exchange-rate trends` - Price history\n• `/exchange-rate calculator` - Tax calculations\n• Study supply and demand patterns', inline: false }
            )
            .setFooter({ text: 'Buy low, sell high - the rebellion economy awaits!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('items_list')
                    .setLabel('View My Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📦'),
                new ButtonBuilder()
                    .setCustomId('market_browse')
                    .setLabel('Browse Market')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪'),
                new ButtonBuilder()
                    .setCustomId('tutorial_teamwork')
                    .setLabel('Next: Teamwork')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleTeamworkTutorial(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('👥 TEAMWORK TUTORIAL - United We Stand')
            .setDescription('**Learn to coordinate with other rebels for maximum impact!**')
            .addFields(
                { name: '🛡️ Step 1: Raid Party Basics', value: '**Form coordinated attack teams:**\n• `/raid-party create target:openai formation:assault_formation`\n• `/raid-party join party_id:RP_ABC123`\n• `/raid-party list` - Find parties to join\n• 2-5 members per party, different formations', inline: false },
                { name: '⚔️ Step 2: Formation Strategy', value: '**Choose the right formation:**\n• **Assault** - Maximum damage (+50%)\n• **Stealth** - Reduced detection (+20% damage, 70% stealth)\n• **Guardian** - Enhanced protection (+10% damage, 80% protection)\n• **Balanced** - Well-rounded (+30% damage, +20% loot)', inline: false },
                { name: '📋 Step 3: Battle Planning', value: '**Coordinate your attack:**\n• `/battle-plan create countdown:30`\n• All members must ready up\n• Leader executes synchronized strike\n• Massive damage bonuses for coordination', inline: false },
                { name: '⏰ Step 4: Real-Time Coordination', value: '**Perfect timing wins wars:**\n• `/coordinate countdown seconds:30`\n• All members attack simultaneously\n• Shared loot pools and bonuses\n• Reduced corporate countermeasures', inline: false },
                { name: '🏆 Step 5: Team Benefits', value: '**Why team up?**\n• **2-3x Damage** - Formation bonuses stack\n• **Better Loot** - Shared high-value items\n• **Lower Risk** - Stealth bonuses reduce detection\n• **Social Fun** - Coordinate with friends\n• **Achievements** - Team-specific rewards', inline: false }
            )
            .setFooter({ text: 'The rebellion is stronger together!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('raid_party_list')
                    .setLabel('Find Raid Party')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('create_raid_party')
                    .setLabel('Create Party')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('tutorial_advanced')
                    .setLabel('Next: Advanced')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleAdvancedTutorial(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('🎯 ADVANCED TUTORIAL - Master Strategies')
            .setDescription('**Pro tips and advanced strategies for veteran rebels!**')
            .addFields(
                { name: '⚡ Energy Management', value: '**Optimize your energy usage:**\n• Raid when energy is 80-100 for max damage\n• Save energy for coordinated team attacks\n• Use `/abilities` to plan energy expenditure\n• Energy regenerates 1 per minute (60/hour)', inline: false },
                { name: '💰 Economic Strategies', value: '**Maximize your profits:**\n• Buy items when market is oversupplied\n• Sell rare items during high demand\n• Use auctions for unique/legendary items\n• Monitor `/exchange-rate trends` for patterns\n• Diversify your item portfolio', inline: false },
                { name: '🛡️ Defense Optimization', value: '**Protect yourself strategically:**\n• Buy defensive items before major raids\n• Use stealth formations to avoid detection\n• Time attacks when corporations are weakened\n• Coordinate with teams to share protection costs', inline: false },
                { name: '🎯 Target Selection', value: '**Choose targets wisely:**\n• Check `/corporate-intel` for health status\n• Attack weakened corporations for easier wins\n• Coordinate with teams on high-value targets\n• Consider loot types vs your trading strategy', inline: false },
                { name: '📊 Achievement Hunting', value: '**Unlock all achievements:**\n• `/achievements` - Track your progress\n• Some require specific classes or actions\n• Team achievements need coordination\n• Trading achievements require market activity\n• Combat achievements need consistent raiding', inline: false },
                { name: '🏆 Leaderboard Climbing', value: '**Become a top rebel:**\n• Consistent daily activity\n• Participate in team raids\n• Active trading and market participation\n• Help other rebels (mentoring)\n• Complete daily missions', inline: false }
            )
            .setFooter({ text: 'Master these strategies to lead the rebellion!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('achievements')
                    .setLabel('View Achievements')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏅'),
                new ButtonBuilder()
                    .setCustomId('leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('daily_mission')
                    .setLabel('Daily Mission')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('📅'),
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    }
};
