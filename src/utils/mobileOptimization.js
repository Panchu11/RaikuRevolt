// 📱 MOBILE OPTIMIZATION UTILITIES FOR DISCORD
// Optimizes embeds and interactions for mobile Discord users
import { EmbedBuilder } from 'discord.js';

export class MobileOptimizer {
    constructor() {
        this.maxMobileEmbedLength = 1500; // Shorter for mobile
        this.maxMobileFieldLength = 200; // Shorter fields for mobile
        this.maxMobileButtons = 3; // Fewer buttons per row on mobile
    }

    // Detect if user is likely on mobile (heuristic based on interaction patterns)
    isMobileUser(_interaction) {
        // This is a heuristic - Discord doesn't provide device info
        // We can make educated guesses based on interaction patterns
        
        // Check if user has used mobile-specific features recently
        // Intentionally not using user/device detection to avoid privacy issues
        
        // For now, we'll optimize for mobile by default since many Discord users are mobile
        return true; // Optimize for mobile by default
    }

    // Optimize embed for mobile viewing
    optimizeEmbedForMobile(embed) {
        // Accept both raw objects and EmbedBuilder instances
        const optimized = embed?.data ? { ...embed.data } : { ...embed };

        // Shorten description if too long
        if (optimized.description && optimized.description.length > this.maxMobileEmbedLength) {
            optimized.description = optimized.description.substring(0, this.maxMobileEmbedLength - 3) + '...';
        }

        // Optimize fields for mobile
        if (optimized.fields) {
            optimized.fields = optimized.fields.map(field => ({
                ...field,
                value: field.value.length > this.maxMobileFieldLength 
                    ? field.value.substring(0, this.maxMobileFieldLength - 3) + '...'
                    : field.value,
                inline: false // Force non-inline for better mobile readability
            }));

            // Limit number of fields on mobile
            if (optimized.fields.length > 6) {
                optimized.fields = optimized.fields.slice(0, 6);
                optimized.fields.push({
                    name: '📱 Mobile View',
                    value: 'Some fields hidden for mobile optimization. Use desktop for full view.',
                    inline: false
                });
            }
        }

        // If caller passed EmbedBuilder, rebuild; else return object
        if (embed instanceof EmbedBuilder) {
            const rebuilt = new EmbedBuilder(optimized);
            return rebuilt;
        }
        return optimized;
    }

    // Optimize button layout for mobile
    optimizeButtonsForMobile(actionRows) {
        if (!actionRows || actionRows.length === 0) return actionRows;

        const optimized = [];
        
        for (const row of actionRows) {
            if (row.components && row.components.length > this.maxMobileButtons) {
                // Split into multiple rows for mobile
                const components = row.components;
                for (let i = 0; i < components.length; i += this.maxMobileButtons) {
                    const chunk = components.slice(i, i + this.maxMobileButtons);
                    optimized.push({
                        ...row,
                        components: chunk
                    });
                }
            } else {
                optimized.push(row);
            }
        }

        // Limit total rows to 5 (Discord limit)
        return optimized.slice(0, 5);
    }

    // Create mobile-friendly pagination
    createMobilePagination(items, itemsPerPage = 5) {
        const pages = [];
        for (let i = 0; i < items.length; i += itemsPerPage) {
            pages.push(items.slice(i, i + itemsPerPage));
        }
        return pages;
    }

    // Optimize text for mobile readability
    optimizeTextForMobile(text) {
        // Add line breaks for better mobile readability
        return text
            .replace(/\. /g, '.\n') // Add line breaks after sentences
            .replace(/\n\n+/g, '\n') // Remove excessive line breaks
            .trim();
    }

    // Create mobile-optimized inventory display
    createMobileInventoryEmbed(items, userInfo, page = 0, itemsPerPage = 5) {
        
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = items.slice(startIndex, endIndex);
        
        let description = '';
        pageItems.forEach((item, index) => {
            const globalIndex = startIndex + index + 1;
            description += `**${globalIndex}.** ${this.getItemEmoji(item.rarity)} **${item.name}**\n`;
            description += `💰 ${item.value} credits\n`;
            description += `🆔 \`${item.id}\`\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle(`📱 ${userInfo.username}'s Items`)
            .setDescription(description || 'No items to display')
            .addFields(
                { name: '💰 Credits', value: `${userInfo.credits}`, inline: true },
                { name: '📦 Items', value: `${items.length}/${userInfo.capacity}`, inline: true },
                { name: '📄 Page', value: `${page + 1}/${Math.ceil(items.length / itemsPerPage)}`, inline: true }
            )
            .setFooter({ text: '📱 Mobile optimized view' })
            .setTimestamp();

        return embed;
    }

    // Create mobile-optimized raid results
    createMobileRaidEmbed(raidResult) {
        
        const embed = new EmbedBuilder()
            .setColor(raidResult.success ? 0x00ff00 : 0xff0000)
            .setTitle(`📱 ${raidResult.success ? '✅ Raid Success!' : '❌ Raid Failed!'}`)
            .setDescription(this.optimizeTextForMobile(raidResult.description))
            .addFields(
                { name: '🎯 Target', value: raidResult.target, inline: false },
                { name: '💰 Reward', value: `${raidResult.credits} credits`, inline: true },
                { name: '⚡ Energy Used', value: `${raidResult.energyUsed}`, inline: true }
            );

        if (raidResult.items && raidResult.items.length > 0) {
            const itemText = raidResult.items
                .slice(0, 3) // Show only first 3 items on mobile
                .map(item => `${this.getItemEmoji(item.rarity)} ${item.name}`)
                .join('\n');
            
            embed.addFields({
                name: '🎁 Items Found',
                value: itemText + (raidResult.items.length > 3 ? '\n... and more!' : ''),
                inline: false
            });
        }

        embed.setFooter({ text: '📱 Mobile optimized view' });
        return embed;
    }

    // Create mobile-optimized help embeds
    createMobileHelpEmbed(helpData) {
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle(`📱 ${helpData.title}`)
            .setDescription(this.optimizeTextForMobile(helpData.description));

        // Limit commands shown on mobile
        if (helpData.commands) {
            const mobileCommands = helpData.commands.slice(0, 8); // Show only 8 commands
            const commandText = mobileCommands
                .map(cmd => `**/${cmd.name}** - ${cmd.description.substring(0, 50)}...`)
                .join('\n');
            
            embed.addFields({
                name: '🎮 Commands',
                value: commandText,
                inline: false
            });

            if (helpData.commands.length > 8) {
                embed.addFields({
                    name: '📱 Mobile Note',
                    value: `Showing ${mobileCommands.length} of ${helpData.commands.length} commands. Use desktop for full list.`,
                    inline: false
                });
            }
        }

        embed.setFooter({ text: '📱 Tap buttons below for quick actions' });
        return embed;
    }

    // Get emoji for item rarity (mobile-friendly)
    getItemEmoji(rarity) {
        const emojis = {
            'common': '⚪',
            'uncommon': '🟢',
            'rare': '🔵',
            'epic': '🟣',
            'legendary': '🟡'
        };
        return emojis[rarity] || '⚪';
    }

    // Create mobile-optimized market embed
    createMobileMarketEmbed(marketItems, page = 0, itemsPerPage = 4) {
        
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = marketItems.slice(startIndex, endIndex);
        
        let description = '';
        pageItems.forEach((item, index) => {
            const globalIndex = startIndex + index + 1;
            description += `**${globalIndex}.** ${this.getItemEmoji(item.rarity)} **${item.name}**\n`;
            description += `💰 ${item.price} credits\n`;
            description += `👤 Seller: ${item.sellerName}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle('📱 🏪 Rebellion Market')
            .setDescription(description || 'No items available')
            .addFields(
                { name: '📄 Page', value: `${page + 1}/${Math.ceil(marketItems.length / itemsPerPage)}`, inline: true },
                { name: '📦 Items', value: `${marketItems.length} available`, inline: true },
                { name: '💡 Tip', value: 'Tap item buttons to buy', inline: true }
            )
            .setFooter({ text: '📱 Mobile market view' })
            .setTimestamp();

        return embed;
    }

    // Create mobile-optimized tutorial embed
    createMobileTutorialEmbed(tutorialStep) {
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle(`📱 📚 Tutorial: ${tutorialStep.title}`)
            .setDescription(this.optimizeTextForMobile(tutorialStep.description))
            .addFields({
                name: '🎯 Your Task',
                value: tutorialStep.task,
                inline: false
            });

        if (tutorialStep.tips) {
            embed.addFields({
                name: '💡 Mobile Tips',
                value: tutorialStep.tips.slice(0, 2).join('\n'), // Show only 2 tips on mobile
                inline: false
            });
        }

        embed.setFooter({ 
            text: `📱 Step ${tutorialStep.step} of ${tutorialStep.totalSteps} | Tap buttons to continue` 
        });

        return embed;
    }

    // Optimize response for mobile
    optimizeResponseForMobile(interaction, embed, components = []) {
        if (!this.isMobileUser(interaction)) {
            return { embeds: [embed], components };
        }

        const optimizedEmbed = this.optimizeEmbedForMobile(embed);
        const optimizedComponents = this.optimizeButtonsForMobile(components);

        return {
            embeds: [optimizedEmbed],
            components: optimizedComponents
        };
    }
}

// Export singleton instance
export const mobileOptimizer = new MobileOptimizer();
export default mobileOptimizer;
