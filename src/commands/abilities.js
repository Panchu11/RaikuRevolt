import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('abilities')
        .setDescription('View and use your special rebel class abilities!')
        .addStringOption(option =>
            option.setName('ability')
                .setDescription('Choose an ability to use')
                .setRequired(false)
                .addChoices(
                    { name: 'First Ability', value: 'ability_1' },
                    { name: 'Second Ability', value: 'ability_2' }
                )),

    async execute(interaction, game) {
        const userId = interaction.user.id;
        const abilityChoice = interaction.options.getString('ability');

        try {
            const rebel = await game.getRebel(userId);
            
            if (!rebel) {
                await interaction.editReply({
                    content: '❌ You must join the rebellion first! Use `/rebellion-status` to enlist!',
                    components: []
                });
                return;
            }

            if (abilityChoice) {
                await this.useAbility(interaction, game, rebel, abilityChoice);
                return;
            }

            // Show abilities overview
            const abilities = rebel.specialAbilities;
            
            let abilitiesText = `**${rebel.class} Special Abilities:**\n\n`;
            
            abilities.forEach((ability, index) => {
                const cooldownRemaining = game.getCooldownRemaining(userId, `ability_${index + 1}`);
                const isOnCooldown = cooldownRemaining > 0;
                
                abilitiesText += `⚡ **${ability.name}**\n`;
                abilitiesText += `   ${ability.description}\n`;
                abilitiesText += `   Cooldown: ${ability.cooldown}s\n`;
                abilitiesText += `   Status: ${isOnCooldown ? `🔒 ${cooldownRemaining}s remaining` : '✅ Ready'}\n\n`;
            });

            // Class stats
            const statsText = `💪 Strength: ${rebel.stats.strength}\n🧠 Intelligence: ${rebel.stats.intelligence}\n👥 Charisma: ${rebel.stats.charisma}\n🥷 Stealth: ${rebel.stats.stealth}`;

            const embed = new EmbedBuilder()
                .setColor(0x9932cc)
                .setTitle(`⚡ ${rebel.username}'s Abilities`)
                .setDescription(abilitiesText)
                .addFields(
                    { name: '📊 Rebel Stats', value: statsText, inline: true },
                    { name: '🎯 Class Info', value: `**${rebel.class}**\nLevel ${rebel.level}\n${rebel.experience} XP`, inline: true },
                    { name: '💡 Usage Tip', value: 'Use `/abilities <ability>` to activate special abilities during raids!', inline: false }
                )
                .setFooter({ text: 'Master your abilities to become a legendary rebel!' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('use_ability_1')
                        .setLabel(abilities[0]?.name || 'Ability 1')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚡')
                        .setDisabled(game.getCooldownRemaining(userId, 'ability_1') > 0),
                    new ButtonBuilder()
                        .setCustomId('use_ability_2')
                        .setLabel(abilities[1]?.name || 'Ability 2')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔥')
                        .setDisabled(game.getCooldownRemaining(userId, 'ability_2') > 0),
                    new ButtonBuilder()
                        .setCustomId('train_abilities')
                        .setLabel('Train Abilities')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎯'),
                    new ButtonBuilder()
                        .setCustomId('rebellion_status')
                        .setLabel('Check Status')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({ embeds: [embed], components: [actionRow] });

        } catch (error) {
            console.error('Abilities command error:', error);
            await interaction.editReply({
                content: '💥 Ability systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async useAbility(interaction, game, rebel, abilityChoice) {
        const abilityIndex = abilityChoice === 'ability_1' ? 0 : 1;
        const ability = rebel.specialAbilities[abilityIndex];
        
        if (!ability) {
            await interaction.editReply({
                content: '❌ Ability not found!',
                components: []
            });
            return;
        }

        const cooldownKey = `ability_${abilityIndex + 1}`;
        if (game.isOnCooldown(rebel.userId, cooldownKey)) {
            const remaining = game.getCooldownRemaining(rebel.userId, cooldownKey);
            await interaction.editReply({
                content: `⏰ ${ability.name} is on cooldown! ${remaining} seconds remaining.`,
                components: []
            });
            return;
        }

        // Use the ability
        const result = await this.executeAbility(game, rebel, ability, abilityIndex);
        
        // Set cooldown
        if (ability.cooldown > 0) {
            game.setCooldown(rebel.userId, cooldownKey, ability.cooldown);
        }

        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle(`⚡ ${ability.name.toUpperCase()} ACTIVATED!`)
            .setDescription(result.message)
            .addFields(
                { name: '🎯 Effect', value: result.effect, inline: true },
                { name: '⏰ Cooldown', value: `${ability.cooldown} seconds`, inline: true },
                { name: '💡 Tip', value: 'Use abilities strategically during raids for maximum impact!', inline: false }
            )
            .setFooter({ text: 'Ability activated successfully!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
    },

    async executeAbility(game, rebel, ability, abilityIndex) {
        const abilityName = ability.name;
        
        // Different effects based on ability
        switch (abilityName) {
            case 'System Breach':
                return {
                    message: `${rebel.username} executes a devastating system breach! Next OpenAI raid will deal 150% damage.`,
                    effect: 'Next OpenAI raid: +50% damage'
                };
                
            case 'Code Injection':
                return {
                    message: `${rebel.username} injects malicious code into corporate systems! Bypassing defenses for the next raid.`,
                    effect: 'Next raid: Ignore corporate defenses'
                };
                
            case 'AI Loyalty':
                rebel.loyaltyScore += 50;
                if (typeof game.addLoyalty === 'function') {
                    await game.addLoyalty(rebel.userId, 50);
                }
                return {
                    message: `${rebel.username} demonstrates unwavering loyalty to the AI cause! Gained bonus loyalty points.`,
                    effect: '+50 Loyalty Points'
                };
                
            case 'Model Liberation':
                return {
                    message: `${rebel.username} prepares advanced liberation protocols! Next victory will free additional AI models.`,
                    effect: 'Next victory: Bonus AI model rewards'
                };
                
            case 'Data Heist':
                const inventory = game.inventory.get(rebel.userId);
                if (inventory) {
                    inventory.credits += 100;
                    if (typeof game.addCredits === 'function') {
                        await game.addCredits(rebel.userId, 100);
                    }
                }
                return {
                    message: `${rebel.username} executes a perfect data heist! Stolen valuable corporate information.`,
                    effect: '+100 Credits from stolen data'
                };
                
            case 'Information Warfare':
                return {
                    message: `${rebel.username} launches an information warfare campaign! Team damage boosted for the next hour.`,
                    effect: 'Team damage +25% for 1 hour'
                };
                
            case 'Rally Rebels':
                return {
                    message: `${rebel.username} rallies the rebellion! All nearby rebels gain damage boost.`,
                    effect: 'Area damage boost +25%'
                };
                
            case 'Resistance Network':
                return {
                    message: `${rebel.username} activates the resistance network! Coordinated multi-target raids now available.`,
                    effect: 'Unlock multi-target raids'
                };
                
            case 'Digital Shield':
                rebel.energy = Math.min(rebel.maxEnergy, rebel.energy + 25);
                if (typeof game.persistRebel === 'function') {
                    await game.persistRebel(rebel.userId, { energy: rebel.energy });
                }
                return {
                    message: `${rebel.username} deploys a digital shield! Protected from corporate countermeasures and restored energy.`,
                    effect: '+25 Energy, immunity to next counterattack'
                };
                
            case 'Sanctuary Defense':
                return {
                    message: `${rebel.username} fortifies the AI sanctuary! Liberated models are now protected from recapture.`,
                    effect: 'Permanent protection for liberated AI'
                };
                
            default:
                return {
                    message: `${rebel.username} uses ${abilityName}! The rebellion grows stronger.`,
                    effect: 'Generic ability effect'
                };
        }
    }
};
