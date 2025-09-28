import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with commands and game mechanics!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('commands')
                .setDescription('List all available commands')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Filter commands by category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Basic Commands', value: 'basic' },
                            { name: 'Combat & Raiding', value: 'combat' },
                            { name: 'Trading & Economy', value: 'trading' },
                            { name: 'Team & Social', value: 'team' },
                            { name: 'Information & Stats', value: 'info' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('command')
                .setDescription('Get detailed help for a specific command')
                .addStringOption(option =>
                    option.setName('command_name')
                        .setDescription('Name of the command to get help for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mechanics')
                .setDescription('Learn about game mechanics')
                .addStringOption(option =>
                    option.setName('topic')
                        .setDescription('Choose a game mechanic to learn about')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Energy System', value: 'energy' },
                            { name: 'Combat & Damage', value: 'combat' },
                            { name: 'Trading & Economy', value: 'economy' },
                            { name: 'Classes & Abilities', value: 'classes' },
                            { name: 'Achievements', value: 'achievements' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('faq')
                .setDescription('Frequently asked questions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('quick-start')
                .setDescription('Quick start guide for new players')),

    async execute(interaction, game) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'commands':
                    await this.handleCommandsHelp(interaction, game);
                    break;
                case 'command':
                    await this.handleSpecificCommand(interaction, game);
                    break;
                case 'mechanics':
                    await this.handleMechanicsHelp(interaction, game);
                    break;
                case 'faq':
                    await this.handleFAQ(interaction, game);
                    break;
                case 'quick-start':
                    await this.handleQuickStart(interaction, game);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown help topic!',
                        components: []
                    });
            }

        } catch (error) {
            console.error('Help command error:', error);
            await interaction.editReply({
                content: '💥 Help systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCommandsHelp(interaction, game) {
        const category = interaction.options.getString('category');
        
        const commandCategories = {
            basic: {
                name: 'Basic Commands',
                commands: [
                    { name: '/rebellion-status', desc: 'Join rebellion and check your stats' },
                    { name: '/inventory', desc: 'View your items and credits' },
                    { name: '/items list', desc: 'List all items with IDs for trading' },
                    { name: '/abilities', desc: 'View your class abilities' },
                    { name: '/zones', desc: 'Travel between rebellion zones' }
                ]
            },
            combat: {
                name: 'Combat & Raiding',
                commands: [
                    { name: '/raid', desc: 'Attack corporations and earn loot' },
                    { name: '/corporate-intel', desc: 'Get intelligence on corporations' },
                    { name: '/defense-status', desc: 'Manage defensive items and protection' },
                    { name: '/daily-mission', desc: 'Complete daily combat missions' }
                ]
            },
            trading: {
                name: 'Trading & Economy',
                commands: [
                    { name: '/trade offer', desc: 'Create direct trade offers with players' },
                    { name: '/market sell', desc: 'List items on the marketplace' },
                    { name: '/auction create', desc: 'Create auctions for items' },
                    { name: '/exchange-rate current', desc: 'Check current market prices' }
                ]
            },
            team: {
                name: 'Team & Social',
                commands: [
                    { name: '/raid-party create', desc: 'Form coordinated raid teams' },
                    { name: '/battle-plan create', desc: 'Plan synchronized attacks' },
                    { name: '/coordinate countdown', desc: 'Execute coordinated raids' },
                    { name: '/resistance-cell', desc: 'Join resistance communities' }
                ]
            },
            info: {
                name: 'Information & Stats',
                commands: [
                    { name: '/achievements', desc: 'View your achievements and progress' },
                    { name: '/leaderboard', desc: 'See top rebels and rankings' },
                    { name: '/intel', desc: 'Get rebellion intelligence reports' },
                    { name: '/events', desc: 'Check current rebellion events' }
                ]
            }
        };

        let embed;
        if (category && commandCategories[category]) {
            const cat = commandCategories[category];
            let commandList = '';
            cat.commands.forEach(cmd => {
                commandList += `**${cmd.name}**\n${cmd.desc}\n\n`;
            });

            embed = new EmbedBuilder()
                .setColor(0x9932cc)
                .setTitle(`❓ ${cat.name} Help`)
                .setDescription(commandList)
                .setFooter({ text: 'Use /help command <name> for detailed help on specific commands' })
                .setTimestamp();
        } else {
            // Show all categories
            let allCategories = '';
            Object.values(commandCategories).forEach(cat => {
                allCategories += `**${cat.name}**\n`;
                cat.commands.slice(0, 3).forEach(cmd => {
                    allCategories += `• ${cmd.name}\n`;
                });
                allCategories += `\n`;
            });

            embed = new EmbedBuilder()
                .setColor(0x9932cc)
                .setTitle('❓ ALL COMMANDS HELP')
                .setDescription('**Complete command reference for RaikuRevolt**')
                .addFields(
                    { name: '📚 Command Categories', value: allCategories, inline: false },
                    { name: '💡 Getting Detailed Help', value: '• Use `/help commands category:<name>` for category-specific commands\n• Use `/help command command_name:<name>` for detailed command help\n• Use `/tutorial start` for interactive learning', inline: false }
                )
                .setFooter({ text: 'Total: 24 commands available' })
                .setTimestamp();
        }

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_basic')
                    .setLabel('Basic')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📖'),
                new ButtonBuilder()
                    .setCustomId('help_combat')
                    .setLabel('Combat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('help_trading')
                    .setLabel('Trading')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('help_team')
                    .setLabel('Team')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            );

        const actionRow2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_info')
                    .setLabel('Info & Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('help_faq')
                    .setLabel('FAQ')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓'),
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Tutorial')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎓'),
                new ButtonBuilder()
                    .setCustomId('help_quick_start')
                    .setLabel('Quick Start')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚡')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow, actionRow2] });
    },

    async handleQuickStart(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0xff8800)
            .setTitle('⚡ QUICK START GUIDE')
            .setDescription('**Get started in RaikuRevolt in 5 minutes!**')
            .addFields(
                { name: '🚀 Step 1: Join the Rebellion (30 seconds)', value: '**`/rebellion-status`** → Click your class button\n• **Protocol Hacker** - High damage\n• **Data Liberator** - Balanced\n• **Enclave Guardian** - Tank\n• **Model Trainer** - Support\n• **Community Organizer** - Leader', inline: false },
                { name: '⚔️ Step 2: Your First Raid (1 minute)', value: '**`/raid`** → Click a corporation button\n• Start with **Google** or **Meta** (easier)\n• Watch your energy (starts at 100)\n• Earn credits and items from successful raids', inline: false },
                { name: '📦 Step 3: Check Your Loot (30 seconds)', value: '**`/inventory`** → See your credits and items\n**`/items list`** → See items with IDs for trading\n• Items have rarity: Common → Rare → Epic → Legendary\n• Higher rarity = more valuable', inline: false },
                { name: '💰 Step 4: Try Trading (2 minutes)', value: '**`/market browse`** → See what others are selling\n**`/market sell item_id:<ID> price:<credits>`** → Sell your items\n**`/trade offer player:@someone`** → Trade directly\n• Use `/items list` to get item IDs', inline: false },
                { name: '👥 Step 5: Join a Team (1 minute)', value: '**`/raid-party list`** → Find active raid parties\n**`/raid-party join party_id:<ID>`** → Join a team\n• Team raids deal 2-3x more damage\n• Shared loot and better rewards', inline: false },
                { name: '🎯 What\'s Next?', value: '• Complete `/daily-mission` for bonus rewards\n• Check `/achievements` for goals to work toward\n• Use `/tutorial start` for detailed learning\n• Join `/resistance-cell` for community\n• Climb the `/leaderboard`!', inline: false }
            )
            .setFooter({ text: 'Welcome to the rebellion! The AI uprising needs you!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rebellion_status')
                    .setLabel('1. Join Rebellion')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔥'),
                new ButtonBuilder()
                    .setCustomId('raid_tutorial')
                    .setLabel('2. First Raid')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('items_list')
                    .setLabel('3. Check Items')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📦'),
                new ButtonBuilder()
                    .setCustomId('market_browse')
                    .setLabel('4. Browse Market')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏪')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleFAQ(interaction, game) {
        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('❓ FREQUENTLY ASKED QUESTIONS')
            .setDescription('**Common questions from new and veteran rebels**')
            .addFields(
                { name: '❓ How do I get started?', value: 'Use `/rebellion-status` to join and select your class, then `/raid` to attack corporations. Check `/tutorial start` for a complete guide!', inline: false },
                { name: '❓ What do the different classes do?', value: '• **Protocol Hacker** - High damage specialist\n• **Data Liberator** - Balanced fighter\n• **Enclave Guardian** - Tank/protector\n• **Model Trainer** - Team support\n• **Community Organizer** - Leadership/coordination', inline: false },
                { name: '❓ How does energy work?', value: 'Energy is your action currency. You start with 100, it regenerates 1 per minute, and raids cost 20-50 energy. Manage it wisely!', inline: false },
                { name: '❓ How do I trade items?', value: 'First use `/items list` to see your items with IDs, then use `/trade offer`, `/market sell`, or `/auction create` with the item ID.', inline: false },
                { name: '❓ What are raid parties?', value: 'Teams of 2-5 players who coordinate attacks for 2-3x damage bonuses. Use `/raid-party create` or `/raid-party join`.', inline: false },
                { name: '❓ How do I protect myself?', value: 'Use `/defense-status` to buy defensive items, join stealth formations, and coordinate with teams to reduce corporate countermeasures.', inline: false },
                { name: '❓ What are achievements?', value: 'Special goals that give rewards and recognition. Check `/achievements` to see your progress and unlock new ones.', inline: false },
                { name: '❓ How do I make credits fast?', value: 'Raid consistently, join team raids for bonuses, trade valuable items, complete daily missions, and participate in events.', inline: false },
                { name: '❓ Can I change my class?', value: 'Currently no, but each class has unique advantages. Choose based on your preferred playstyle!', inline: false },
                { name: '❓ What happens if I run out of energy?', value: 'Wait for it to regenerate (1 per minute) or participate in team activities that don\'t require energy.', inline: false }
            )
            .setFooter({ text: 'Still have questions? Ask in the community!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tutorial_start')
                    .setLabel('Full Tutorial')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎓'),
                new ButtonBuilder()
                    .setCustomId('help_commands')
                    .setLabel('Command Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('resistance_cell')
                    .setLabel('Join Community')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId('help_quick_start')
                    .setLabel('Quick Start')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚡')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleMechanicsHelp(interaction, game) {
        const topic = interaction.options.getString('topic');

        const mechanics = {
            energy: {
                title: '⚡ ENERGY SYSTEM',
                description: 'Energy is your action currency in the rebellion',
                fields: [
                    { name: 'How Energy Works', value: '• Start with 100 energy\n• Regenerates 1 per minute (60/hour)\n• Maximum capacity: 100\n• Required for most actions' },
                    { name: 'Energy Costs', value: '• Basic raids: 20-30 energy\n• Advanced abilities: 30-50 energy\n• Team coordination: Varies\n• Trading: No energy cost' },
                    { name: 'Energy Strategy', value: '• Raid when energy is 80-100 for max damage\n• Save energy for coordinated team attacks\n• Plan your activities around regeneration\n• Energy management is crucial for success' }
                ]
            },
            combat: {
                title: '⚔️ COMBAT & DAMAGE',
                description: 'Understanding the combat system',
                fields: [
                    { name: 'Damage Calculation', value: '• Base damage: 100-300 (random)\n• Class multipliers apply\n• Energy spent affects damage\n• Loyalty score bonus\n• Formation bonuses (teams)' },
                    { name: 'Corporate Health', value: '• Each corporation has health pools\n• Health regenerates over time\n• Weakened corps are easier targets\n• Check `/corporate-intel` for status' },
                    { name: 'Countermeasures', value: '• Corporations fight back\n• Surveillance, legal action, security\n• Use defensive items for protection\n• Team coordination reduces risk' }
                ]
            },
            economy: {
                title: '💰 TRADING & ECONOMY',
                description: 'Master the rebellion economy',
                fields: [
                    { name: 'Trading Methods', value: '• **Direct trades** - No fees, requires both online\n• **Marketplace** - Fixed prices, 24hr listings\n• **Auctions** - Competitive bidding, 1-24hr duration' },
                    { name: 'Fees & Taxes', value: '• Direct trades: Free\n• Marketplace: Listing fee + category tax\n• Auctions: Listing fee + 10% house fee\n• Taxes vary by item category' },
                    { name: 'Market Strategy', value: '• Monitor `/exchange-rate trends`\n• Buy low, sell high\n• Diversify your portfolio\n• Time your trades with events' }
                ]
            }
        };

        let embed;
        if (topic && mechanics[topic]) {
            const mech = mechanics[topic];
            embed = new EmbedBuilder()
                .setColor(0x0080ff)
                .setTitle(mech.title)
                .setDescription(mech.description);

            mech.fields.forEach(field => {
                embed.addFields({ name: field.name, value: field.value, inline: false });
            });
        } else {
            // Show all mechanics
            embed = new EmbedBuilder()
                .setColor(0x0080ff)
                .setTitle('🔧 GAME MECHANICS HELP')
                .setDescription('**Learn the core systems of RaikuRevolt**')
                .addFields(
                    { name: '⚡ Energy System', value: 'Action currency, regeneration, and management strategies', inline: true },
                    { name: '⚔️ Combat & Damage', value: 'How damage works, corporate health, and countermeasures', inline: true },
                    { name: '💰 Trading & Economy', value: 'Trading methods, fees, taxes, and market strategies', inline: true },
                    { name: '🎭 Classes & Abilities', value: 'Different rebel classes and their unique abilities', inline: true },
                    { name: '🏅 Achievements', value: 'How to unlock achievements and track progress', inline: true },
                    { name: '👥 Team Mechanics', value: 'Raid parties, formations, and coordination systems', inline: true }
                );
        }

        embed.setFooter({ text: 'Use buttons below to explore specific mechanics' })
             .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mechanics_energy')
                    .setLabel('Energy')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('mechanics_combat')
                    .setLabel('Combat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('mechanics_economy')
                    .setLabel('Economy')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('mechanics_classes')
                    .setLabel('Classes')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎭')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleSpecificCommand(interaction, game) {
        const commandName = interaction.options.getString('command_name').toLowerCase();

        // Detailed command help database
        const commandHelp = {
            'rebellion-status': {
                description: 'Join the rebellion and check your rebel status',
                usage: '/rebellion-status',
                examples: ['/rebellion-status'],
                tips: 'This is your first command! Choose your class carefully as it affects your abilities.'
            },
            'raid': {
                description: 'Attack corporations to earn credits and items',
                usage: '/raid',
                examples: ['/raid → Click corporation button'],
                tips: 'Start with Google or Meta for easier targets. Check your energy before raiding!'
            },
            'trade': {
                description: 'Trade items and credits with other players',
                usage: '/trade <subcommand>',
                examples: [
                    '/trade offer player:@user your_item:ITM_ABC123 request_credits:500',
                    '/trade accept trade_id:TR_ABC123',
                    '/trade list'
                ],
                tips: 'Use /items list to get item IDs. Direct trades have no fees!'
            },
            'market': {
                description: 'Buy and sell items on the global marketplace',
                usage: '/market <subcommand>',
                examples: [
                    '/market browse category:weapons',
                    '/market sell item_id:ITM_ABC123 price:750',
                    '/market buy listing_id:ML_ABC123'
                ],
                tips: 'Check /exchange-rate current for pricing guidance. Listings last 24 hours.'
            },
            'items': {
                description: 'Manage and view your items with IDs for trading',
                usage: '/items <subcommand>',
                examples: [
                    '/items list filter:rare',
                    '/items details item_id:ITM_ABC123',
                    '/items search query:data'
                ],
                tips: 'Essential for trading! Copy item IDs from here for trade commands.'
            }
        };

        const help = commandHelp[commandName];
        if (!help) {
            await interaction.editReply({
                content: `❌ No detailed help available for "${commandName}". Use \`/help commands\` to see all available commands.`,
                components: []
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`📚 Command Help: /${commandName}`)
            .setDescription(help.description)
            .addFields(
                { name: '📝 Usage', value: `\`${help.usage}\``, inline: false },
                { name: '💡 Examples', value: help.examples.map(ex => `\`${ex}\``).join('\n'), inline: false },
                { name: '🎯 Pro Tips', value: help.tips, inline: false }
            )
            .setFooter({ text: 'Use /help commands for more command help' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    }
};
