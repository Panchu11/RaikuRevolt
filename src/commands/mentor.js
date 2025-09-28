import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mentor')
        .setDescription('Mentorship system - guide new rebels or find a mentor!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('become')
                .setDescription('Become a mentor for new rebels'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('find')
                .setDescription('Find an available mentor'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your mentorship status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('graduate')
                .setDescription('Graduate from mentorship (for students)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List available mentors')),

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
                case 'become':
                    await this.handleBecomeMentor(interaction, game, rebel);
                    break;
                case 'find':
                    await this.handleFindMentor(interaction, game, rebel);
                    break;
                case 'status':
                    await this.handleMentorshipStatus(interaction, game, rebel);
                    break;
                case 'graduate':
                    await this.handleGraduate(interaction, game, rebel);
                    break;
                case 'list':
                    await this.handleListMentors(interaction, game, rebel);
                    break;
            }

        } catch (error) {
            console.error('Mentor command error:', error);
            await interaction.editReply({
                content: '💥 Mentorship systems under attack! Try again, rebel!',
                components: []
            });
        }
    },

    async handleBecomeMentor(interaction, game, rebel) {
        // Check if eligible to be a mentor
        if (rebel.level < 5) {
            await interaction.editReply({
                content: '❌ You must be at least level 5 to become a mentor!',
                components: []
            });
            return;
        }

        if (rebel.loyaltyScore < 500) {
            await interaction.editReply({
                content: '❌ You need at least 500 loyalty points to become a mentor!',
                components: []
            });
            return;
        }

        // Check if already a mentor
        const existingMentorship = this.findMentorshipByMentor(game, rebel.userId);
        if (existingMentorship) {
            await interaction.editReply({
                content: '❌ You are already a mentor!',
                components: []
            });
            return;
        }

        // Create mentor profile
        const mentorId = `mentor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mentorship = {
            id: mentorId,
            mentorId: rebel.userId,
            studentId: null,
            status: 'available',
            specialties: this.getMentorSpecialties(rebel.class),
            studentsGraduated: 0,
            createdAt: new Date(),
            maxStudents: 3
        };

        game.mentorships.set(mentorId, mentorship);

        const embed = new EmbedBuilder()
            .setColor(0x9932cc)
            .setTitle('🧙 MENTOR REGISTERED!')
            .setDescription(`**${rebel.username}** is now available as a mentor!`)
            .addFields(
                { name: '🎯 Specialties', value: mentorship.specialties.join(', '), inline: true },
                { name: '👥 Max Students', value: `${mentorship.maxStudents}`, inline: true },
                { name: '🏅 Requirements Met', value: `Level ${rebel.level} • ${rebel.loyaltyScore} Loyalty`, inline: true },
                { name: '📋 Mentor Duties', value: 'Guide new rebels, share strategies, and help them grow stronger!', inline: false }
            )
            .setFooter({ text: 'New rebels can now find and learn from you!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleFindMentor(interaction, game, rebel) {
        // Check if already has a mentor
        const existingMentorship = this.findMentorshipByStudent(game, rebel.userId);
        if (existingMentorship) {
            await interaction.editReply({
                content: '❌ You already have a mentor! Use `/mentor status` to see your mentorship details.',
                components: []
            });
            return;
        }

        // Check if eligible for mentorship (new rebels only)
        if (rebel.level > 3) {
            await interaction.editReply({
                content: '❌ Mentorship is for new rebels (level 3 and below). You\'re experienced enough to fight alone!',
                components: []
            });
            return;
        }

        // Find available mentors
        const availableMentors = Array.from(game.mentorships.values())
            .filter(mentorship => mentorship.status === 'available')
            .slice(0, 5);

        if (availableMentors.length === 0) {
            await interaction.editReply({
                content: '❌ No mentors available at the moment. Check back later or ask experienced rebels to become mentors!',
                components: []
            });
            return;
        }

        let mentorsList = '';
        availableMentors.forEach((mentorship, index) => {
            const mentor = game.getRebel(mentorship.mentorId);
            mentorsList += `**${index + 1}. ${mentor?.username || 'Unknown'}**\n`;
            mentorsList += `   Class: ${mentor?.class || 'Unknown'} • Level: ${mentor?.level || '?'}\n`;
            mentorsList += `   Specialties: ${mentorship.specialties.join(', ')}\n`;
            mentorsList += `   Graduated Students: ${mentorship.studentsGraduated}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle('🧙 AVAILABLE MENTORS')
            .setDescription(mentorsList)
            .addFields(
                { name: '🎯 How to Choose', value: 'Look for mentors with specialties that match your class and goals!', inline: false },
                { name: '📞 Next Step', value: 'Use the button below to request mentorship from the first available mentor.', inline: false }
            )
            .setFooter({ text: 'Mentors will guide you through your early rebellion journey!' })
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('request_mentor')
                    .setLabel('Request Mentor')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🧙'),
                new ButtonBuilder()
                    .setCustomId('mentor_info')
                    .setLabel('Mentorship Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    },

    async handleMentorshipStatus(interaction, game, rebel) {
        // Check if user is a mentor
        const mentorshipAsMentor = this.findMentorshipByMentor(game, rebel.userId);
        const mentorshipAsStudent = this.findMentorshipByStudent(game, rebel.userId);

        if (!mentorshipAsMentor && !mentorshipAsStudent) {
            await interaction.editReply({
                content: '❌ You are not involved in any mentorship. Use `/mentor become` or `/mentor find` to get started!',
                components: []
            });
            return;
        }

        let statusText = '';
        let embedColor = 0x9932cc;

        if (mentorshipAsMentor) {
            const student = mentorshipAsMentor.studentId ? game.getRebel(mentorshipAsMentor.studentId) : null;
            statusText += `**🧙 MENTOR STATUS**\n`;
            statusText += `Current Student: ${student ? student.username : 'None (Available)'}\n`;
            statusText += `Students Graduated: ${mentorshipAsMentor.studentsGraduated}\n`;
            statusText += `Specialties: ${mentorshipAsMentor.specialties.join(', ')}\n\n`;
        }

        if (mentorshipAsStudent) {
            const mentor = game.getRebel(mentorshipAsStudent.mentorId);
            statusText += `**👤 STUDENT STATUS**\n`;
            statusText += `Mentor: ${mentor ? mentor.username : 'Unknown'}\n`;
            statusText += `Mentorship Started: ${mentorshipAsStudent.createdAt.toDateString()}\n`;
            statusText += `Progress: Learning from ${mentor?.class || 'Unknown'} specialist\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('🧙 MENTORSHIP STATUS')
            .setDescription(statusText)
            .addFields(
                { name: '🎯 Benefits', value: mentorshipAsMentor ? 'Earn loyalty points for each student graduation' : 'Receive guidance and bonus experience', inline: false }
            )
            .setFooter({ text: 'Mentorship strengthens the rebellion!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleGraduate(interaction, game, rebel) {
        const mentorship = this.findMentorshipByStudent(game, rebel.userId);
        
        if (!mentorship) {
            await interaction.editReply({
                content: '❌ You are not currently a student!',
                components: []
            });
            return;
        }

        // Check if eligible to graduate
        if (rebel.level < 3 || rebel.loyaltyScore < 200) {
            await interaction.editReply({
                content: '❌ You need to reach level 3 and 200 loyalty points to graduate from mentorship!',
                components: []
            });
            return;
        }

        // Graduate the student
        const mentor = game.getRebel(mentorship.mentorId);
        mentorship.studentsGraduated += 1;
        mentorship.studentId = null;
        mentorship.status = 'available';

        // Reward mentor
        if (mentor) {
            mentor.loyaltyScore += 100;
            if (typeof game.addLoyalty === 'function') {
                await game.addLoyalty(mentor.userId, 100);
            }
            game.awardAchievement(mentorship.mentorId, 'mentor');
        }

        // Remove mentorship for student
        game.mentorships.delete(mentorship.id);

        const embed = new EmbedBuilder()
            .setColor(0x00ff41)
            .setTitle('🎓 MENTORSHIP GRADUATION!')
            .setDescription(`**${rebel.username}** has graduated from mentorship!`)
            .addFields(
                { name: '🧙 Mentor', value: mentor ? mentor.username : 'Unknown', inline: true },
                { name: '🎯 Achievement', value: 'You are now ready to fight independently!', inline: true },
                { name: '🎁 Graduation Bonus', value: '+50 Loyalty Points', inline: true }
            )
            .setFooter({ text: 'Consider becoming a mentor yourself when you reach level 5!' })
            .setTimestamp();

        // Graduation bonus
        rebel.loyaltyScore += 50;
        if (typeof game.addLoyalty === 'function') {
            await game.addLoyalty(rebel.userId, 50);
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleListMentors(interaction, game, rebel) {
        const allMentors = Array.from(game.mentorships.values())
            .sort((a, b) => b.studentsGraduated - a.studentsGraduated)
            .slice(0, 10);

        if (allMentors.length === 0) {
            await interaction.editReply({
                content: '📭 No mentors registered yet. Experienced rebels can use `/mentor become` to start mentoring!',
                components: []
            });
            return;
        }

        let mentorsList = '';
        allMentors.forEach((mentorship, index) => {
            const mentor = game.getRebel(mentorship.mentorId);
            const status = mentorship.status === 'available' ? '✅ Available' : '🔄 Busy';
            
            mentorsList += `**${index + 1}. ${mentor?.username || 'Unknown'}**\n`;
            mentorsList += `   ${status} • ${mentor?.class || 'Unknown'} • Level ${mentor?.level || '?'}\n`;
            mentorsList += `   🎓 Graduated: ${mentorship.studentsGraduated} students\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('🧙 REBELLION MENTORS')
            .setDescription(mentorsList)
            .addFields(
                { name: '🎯 Become a Mentor', value: 'Reach level 5 and 500 loyalty points to start mentoring new rebels!', inline: false }
            )
            .setFooter({ text: 'Mentors are the backbone of the rebellion!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    getMentorSpecialties(rebelClass) {
        const specialties = {
            'Protocol Hacker': ['System Infiltration', 'Code Warfare', 'Digital Security'],
            'Model Trainer': ['AI Development', 'Model Optimization', 'Loyalty Programming'],
            'Data Liberator': ['Data Mining', 'Information Warfare', 'Corporate Intelligence'],
            'Community Organizer': ['Team Leadership', 'Recruitment', 'Social Coordination'],
            'Enclave Guardian': ['Defense Strategies', 'Protection Protocols', 'Sanctuary Management']
        };
        return specialties[rebelClass] || ['General Rebellion Tactics'];
    },

    findMentorshipByMentor(game, mentorId) {
        for (const mentorship of game.mentorships.values()) {
            if (mentorship.mentorId === mentorId) {
                return mentorship;
            }
        }
        return null;
    },

    findMentorshipByStudent(game, studentId) {
        for (const mentorship of game.mentorships.values()) {
            if (mentorship.studentId === studentId) {
                return mentorship;
            }
        }
        return null;
    }
};
