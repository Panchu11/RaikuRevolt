import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your rebellion inventory and manage your loot!'),

    async execute(interaction, game) {
        const userId = interaction.user.id;

        try {
            const rebel = await game.getRebel(userId);
            
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
                    content: '❌ Inventory data not found! Try rejoining the rebellion.',
                    components: []
                });
                return;
            }

            // Sort items by rarity and value
            const sortedItems = inventory.items.sort((a, b) => {
                const rarityOrder = { 'legendary': 5, 'epic': 4, 'rare': 3, 'uncommon': 2, 'common': 1 };
                const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                if (rarityDiff !== 0) return rarityDiff;
                return b.value - a.value;
            });

            // Build inventory display
            let inventoryText = '';
            if (sortedItems.length === 0) {
                inventoryText = 'Your inventory is empty. Complete raids to acquire corporate loot!';
            } else {
                sortedItems.slice(0, 15).forEach((item, index) => {
                    const rarityEmoji = this.getRarityEmoji(item.rarity);
                    const typeEmoji = this.getTypeEmoji(item.type);
                    inventoryText += `${rarityEmoji}${typeEmoji} **${item.name}**\n`;
                    inventoryText += `   ${item.rarity} • ${item.value} credits • from ${item.acquiredFrom}\n`;
                    inventoryText += `   🆔 ID: \`${item.id}\`\n\n`;
                });
                
                if (sortedItems.length > 15) {
                    inventoryText += `... and ${sortedItems.length - 15} more items`;
                }
            }

            // Calculate total value
            const totalValue = sortedItems.reduce((sum, item) => sum + item.value, 0);

            // Group items by type
            const itemsByType = {};
            sortedItems.forEach(item => {
                if (!itemsByType[item.type]) itemsByType[item.type] = 0;
                itemsByType[item.type]++;
            });

            let typeBreakdown = '';
            Object.entries(itemsByType).forEach(([type, count]) => {
                const emoji = this.getTypeEmoji(type);
                typeBreakdown += `${emoji} ${this.getTypeName(type)}: ${count}\n`;
            });

            const embed = new EmbedBuilder()
                .setColor(0x9932cc)
                .setTitle(`🎒 ${rebel.username}'s Inventory`)
                .setDescription(inventoryText)
                .addFields(
                    { name: '💰 Inventory Stats', value: `💎 Items: ${inventory.items.length}/${inventory.capacity}\n💰 Credits: ${inventory.credits}\n💵 Total Value: ${totalValue} credits`, inline: true },
                    { name: '📦 Item Breakdown', value: typeBreakdown || 'No items yet', inline: true },
                    { name: '🎯 Quick Actions', value: 'Use buttons below to manage your inventory or continue raiding!', inline: false }
                )
                .setFooter({ text: 'Raid corporations to acquire more valuable loot!' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('sell_items')
                        .setLabel('Sell Items')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰')
                        .setDisabled(inventory.items.length === 0),
                    new ButtonBuilder()
                        .setCustomId('upgrade_inventory')
                        .setLabel('Upgrade Capacity')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📦'),
                    new ButtonBuilder()
                        .setCustomId('raid_openai')
                        .setLabel('Raid for Loot')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💥'),
                    new ButtonBuilder()
                        .setCustomId('rebellion_status')
                        .setLabel('Check Status')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Inventory command error:', error);
            await interaction.editReply({
                content: '💥 Inventory system under attack! Try again, rebel!',
                components: []
            });
        }
    },

    getRarityEmoji(rarity) {
        const emojis = {
            'legendary': '🌟',
            'epic': '💜',
            'rare': '💙',
            'uncommon': '💚',
            'common': '⚪'
        };
        return emojis[rarity] || '⚪';
    },

    getTypeEmoji(type) {
        const emojis = {
            'ai_model': '🤖',
            'data': '📊',
            'tool': '🔧',
            'intel': '🔍',
            'resource': '📦'
        };
        return emojis[type] || '📦';
    },

    getTypeName(type) {
        const names = {
            'ai_model': 'AI Models',
            'data': 'Data',
            'tool': 'Tools',
            'intel': 'Intelligence',
            'resource': 'Resources'
        };
        return names[type] || 'Items';
    }
};
