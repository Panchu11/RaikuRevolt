import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('resistance-cell')
        .setDescription('Manage your resistance cell - form teams and coordinate attacks!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new resistance cell')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name for your resistance cell')
                        .setRequired(true)
                        .setMaxLength(50))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of your cell\'s mission')
                        .setRequired(false)
                        .setMaxLength(200)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an existing resistance cell')
                .addStringOption(option =>
                    option.setName('cell_id')
                        .setDescription('ID of the cell to join')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View information about your resistance cell'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current resistance cell'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active resistance cells')),

    async execute(interaction, game) {
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();

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
                    await this.handleCreateCell(interaction, game, rebel);
                    break;
                case 'join':
                    await this.handleJoinCell(interaction, game, rebel);
                    break;
                case 'info':
                    await this.handleCellInfo(interaction, game, rebel);
                    break;
                case 'leave':
                    await this.handleLeaveCell(interaction, game, rebel);
                    break;
                case 'list':
                    await this.handleListCells(interaction, game, rebel);
                    break;
            }

        } catch (error) {
            console.error('Resistance cell command error:', error);
            await interaction.editReply({
                content: '💥 Resistance cell communications under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleCreateCell(interaction, game, rebel) {
        const cellName = interaction.options.getString('name');
        const cellDescription = interaction.options.getString('description') || 'A secret resistance cell fighting corporate AI control.';

        // Check if user is already in a cell
        const existingCell = this.findUserCell(game, rebel.userId);
        if (existingCell) {
            await interaction.editReply({
                content: '❌ You are already a member of a resistance cell! Leave your current cell first.',
                components: []
            });
            return;
        }

        // Create new cell
        const cellId = `cell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const cell = {
            id: cellId,
            name: cellName,
            description: cellDescription,
            leader: rebel.userId,
            members: [rebel.userId],
            createdAt: new Date(),
            totalDamage: 0,
            totalRaids: 0,
            level: 1,
            maxMembers: 5
        };

        game.resistanceCells.set(cellId, cell);

        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle('🎉 RESISTANCE CELL CREATED!')
            .setDescription(`**${cellName}** has been established!`)
            .addFields(
                { name: '👑 Leader', value: rebel.username, inline: true },
                { name: '👥 Members', value: '1/5', inline: true },
                { name: '🆔 Cell ID', value: `\`${cellId}\``, inline: true },
                { name: '📋 Mission', value: cellDescription, inline: false },
                { name: '🎯 Next Steps', value: 'Share your Cell ID with other rebels to recruit them!', inline: false }
            )
            .setFooter({ text: 'The resistance grows stronger!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleJoinCell(interaction, game, rebel) {
        const cellId = interaction.options.getString('cell_id');
        const cell = game.resistanceCells.get(cellId);

        if (!cell) {
            await interaction.editReply({
                content: '❌ Resistance cell not found! Check the Cell ID and try again.',
                components: []
            });
            return;
        }

        // Check if user is already in a cell
        const existingCell = this.findUserCell(game, rebel.userId);
        if (existingCell) {
            await interaction.editReply({
                content: '❌ You are already a member of a resistance cell! Leave your current cell first.',
                components: []
            });
            return;
        }

        // Check if cell is full
        if (cell.members.length >= cell.maxMembers) {
            await interaction.editReply({
                content: '❌ This resistance cell is at maximum capacity!',
                components: []
            });
            return;
        }

        // Join the cell
        cell.members.push(rebel.userId);

        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle('🎉 JOINED RESISTANCE CELL!')
            .setDescription(`Welcome to **${cell.name}**!`)
            .addFields(
                { name: '👥 Members', value: `${cell.members.length}/${cell.maxMembers}`, inline: true },
                { name: '📊 Cell Stats', value: `💥 Total Damage: ${cell.totalDamage}\n⚔️ Total Raids: ${cell.totalRaids}`, inline: true },
                { name: '📋 Mission', value: cell.description, inline: false }
            )
            .setFooter({ text: 'Coordinate with your cell for maximum impact!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleCellInfo(interaction, game, rebel) {
        const cell = this.findUserCell(game, rebel.userId);
        
        if (!cell) {
            await interaction.editReply({
                content: '❌ You are not a member of any resistance cell! Use `/resistance-cell create` or `/resistance-cell join` to get started.',
                components: []
            });
            return;
        }

        // Get member details
        const memberDetails = cell.members.map(memberId => {
            const memberRebel = game.getRebel(memberId);
            const isLeader = memberId === cell.leader;
            return `${isLeader ? '👑' : '👤'} ${memberRebel?.username || 'Unknown'} (${memberRebel?.class || 'Unknown'})`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle(`🏴 ${cell.name}`)
            .setDescription(cell.description)
            .addFields(
                { name: '👥 Members', value: memberDetails, inline: false },
                { name: '📊 Cell Statistics', value: `💥 Total Damage: ${cell.totalDamage}\n⚔️ Total Raids: ${cell.totalRaids}\n📈 Cell Level: ${cell.level}`, inline: true },
                { name: '🆔 Cell Info', value: `ID: \`${cell.id}\`\nCreated: ${cell.createdAt.toDateString()}`, inline: true }
            )
            .setFooter({ text: 'Strength through unity!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('cell_raid')
                    .setLabel('Coordinate Raid')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💥'),
                new ButtonBuilder()
                    .setCustomId('cell_recruit')
                    .setLabel('Recruit Members')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId('cell_leave')
                    .setLabel('Leave Cell')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚪')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleLeaveCell(interaction, game, rebel) {
        const cell = this.findUserCell(game, rebel.userId);
        
        if (!cell) {
            await interaction.editReply({
                content: '❌ You are not a member of any resistance cell!',
                components: []
            });
            return;
        }

        // Remove user from cell
        cell.members = cell.members.filter(memberId => memberId !== rebel.userId);

        // If leader left and there are still members, assign new leader
        if (cell.leader === rebel.userId && cell.members.length > 0) {
            cell.leader = cell.members[0];
        }

        // If no members left, delete the cell
        if (cell.members.length === 0) {
            game.resistanceCells.delete(cell.id);
        }

        await interaction.editReply({
            content: `✅ You have left the resistance cell **${cell.name}**. The fight continues!`,
            components: []
        });
    },

    async handleListCells(interaction, game, rebel) {
        const cells = Array.from(game.resistanceCells.values())
            .filter(cell => cell.members.length < cell.maxMembers)
            .sort((a, b) => b.totalDamage - a.totalDamage)
            .slice(0, 10);

        if (cells.length === 0) {
            await interaction.editReply({
                content: '📭 No resistance cells are currently recruiting. Create your own with `/resistance-cell create`!',
                components: []
            });
            return;
        }

        let cellsList = '';
        cells.forEach((cell, index) => {
            cellsList += `**${index + 1}. ${cell.name}**\n`;
            cellsList += `   👥 ${cell.members.length}/${cell.maxMembers} members • 💥 ${cell.totalDamage} damage\n`;
            cellsList += `   ID: \`${cell.id}\`\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle('🏴 ACTIVE RESISTANCE CELLS')
            .setDescription(cellsList)
            .addFields(
                { name: '🎯 How to Join', value: 'Use `/resistance-cell join <cell_id>` with the Cell ID to join a resistance cell!', inline: false }
            )
            .setFooter({ text: 'Unite with fellow rebels!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    findUserCell(game, userId) {
        for (const cell of game.resistanceCells.values()) {
            if (cell.members.includes(userId)) {
                return cell;
            }
        }
        return null;
    }
};
