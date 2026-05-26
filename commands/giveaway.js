const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Comprehensive giveaway management system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What is the prize?')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post giveaway (defaults to current)')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('required_role')
                        .setDescription('Required role to enter')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('min_account_age')
                        .setDescription('Minimum account age in days')
                        .setRequired(false)
                        .setMinValue(0))
                .addBooleanOption(option =>
                    option.setName('booster_bonus')
                        .setDescription('Give server boosters extra entries (default: false)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('drop')
                .setDescription('Start an instant drop giveaway (first X to click win)')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What is the prize?')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post giveaway (defaults to current)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll a giveaway to pick new winners')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of new winners (defaults to original)')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause an active giveaway')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume a paused giveaway')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an active giveaway')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('New prize')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('add_duration')
                        .setDescription('Add additional minutes to duration')
                        .setRequired(false)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('New winner count')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Permanently delete a giveaway')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all giveaways')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter giveaways')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Active', value: 'active' },
                            { name: 'Paused', value: 'paused' },
                            { name: 'Ended', value: 'ended' },
                            { name: 'Drop', value: 'drop' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('participants')
                .setDescription('View all participants in a giveaway')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View overall giveaway statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View detailed giveaway history')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of recent giveaways to show (default: 10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('announce')
                .setDescription('Announce/repost a giveaway in another channel')
                .addStringOption(option =>
                    option.setName('giveaway_id')
                        .setDescription('Giveaway ID')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to announce in')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist')
                .setDescription('Block a user from entering giveaways')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to blacklist')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for blacklist')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unblacklist')
                .setDescription('Unblock a user from entering giveaways')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to unblacklist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist-list')
                .setDescription('View all blacklisted users')),

    async autocomplete(interaction, database) {
        const focusedValue = interaction.options.getFocused();
        
        if (!database.giveaways) database.giveaways = {};
        
        const choices = Object.entries(database.giveaways)
            .map(([id, gw]) => ({
                name: `${id} - ${gw.prize} (${gw.active ? gw.paused ? 'Paused' : 'Active' : 'Ended'})`,
                value: id
            }))
            .filter(choice => 
                choice.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                choice.value.toLowerCase().includes(focusedValue.toLowerCase())
            )
            .slice(0, 25);
        
        await interaction.respond(choices);
    },

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'start':
                await this.startGiveaway(interaction, database);
                break;
            case 'drop':
                await this.startDropGiveaway(interaction, database);
                break;
            case 'end':
                await this.endGiveawayCommand(interaction, database);
                break;
            case 'reroll':
                await this.rerollGiveaway(interaction, database);
                break;
            case 'pause':
                await this.pauseGiveaway(interaction, database);
                break;
            case 'resume':
                await this.resumeGiveaway(interaction, database);
                break;
            case 'edit':
                await this.editGiveaway(interaction, database);
                break;
            case 'delete':
                await this.deleteGiveaway(interaction, database);
                break;
            case 'list':
                await this.listGiveaways(interaction, database);
                break;
            case 'participants':
                await this.showParticipants(interaction, database);
                break;
            case 'stats':
                await this.showStats(interaction, database);
                break;
            case 'history':
                await this.showHistory(interaction, database);
                break;
            case 'announce':
                await this.announceGiveaway(interaction, database);
                break;
            case 'blacklist':
                await this.blacklistUser(interaction, database);
                break;
            case 'unblacklist':
                await this.unblacklistUser(interaction, database);
                break;
            case 'blacklist-list':
                await this.showBlacklist(interaction, database);
                break;
        }
    },

    async startGiveaway(interaction, database) {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winners = interaction.options.getInteger('winners');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const requiredRole = interaction.options.getRole('required_role');
        const minAccountAge = interaction.options.getInteger('min_account_age');
        const boosterBonus = interaction.options.getBoolean('booster_bonus') || false;

        if (!database.giveaways) database.giveaways = {};

        const giveawayId = `gw_${Date.now()}`;
        const endsAt = Date.now() + (duration * 60 * 1000);

        let requirementsText = '';
        if (requiredRole || minAccountAge || boosterBonus) {
            requirementsText = '\n\n**Requirements:**\n';
            if (requiredRole) requirementsText += `• Must have ${requiredRole} role\n`;
            if (minAccountAge) requirementsText += `• Account must be ${minAccountAge}+ days old\n`;
            if (boosterBonus) requirementsText += `• 🎁 Server boosters get 2x entries!\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(`**Prize:** ${prize}\n\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>${requirementsText}`)
            .setFooter({ text: `Giveaway ID: ${giveawayId} | Click the button below to enter!` })
            .setTimestamp(endsAt);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_enter_${giveawayId}`)
                    .setLabel('Enter Giveaway')
                    .setEmoji('🎉')
                    .setStyle(ButtonStyle.Primary)
            );

        const message = await channel.send({
            embeds: [embed],
            components: [row]
        });

        database.giveaways[giveawayId] = {
            prize,
            winners,
            endsAt,
            channelId: channel.id,
            messageId: message.id,
            hostId: interaction.user.id,
            entries: [],
            bonusEntries: {},
            active: true,
            paused: false,
            createdAt: Date.now(),
            type: 'timed',
            requirements: {
                role: requiredRole ? requiredRole.id : null,
                minAccountAge: minAccountAge || null
            },
            boosterBonus: boosterBonus
        };

        saveDatabase(database);

        await interaction.reply({
            content: `✅ Giveaway started in ${channel}!\n**ID:** ${giveawayId}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>`,
            ephemeral: true
        });
    },

    async startDropGiveaway(interaction, database) {
        const prize = interaction.options.getString('prize');
        const winners = interaction.options.getInteger('winners');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (!database.giveaways) database.giveaways = {};

        const giveawayId = `gw_drop_${Date.now()}`;

        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('⚡ DROP GIVEAWAY ⚡')
            .setDescription(`**Prize:** ${prize}\n\n**First ${winners} to click win instantly!**\n\n🏃‍♂️ **BE FAST!**`)
            .setFooter({ text: `Drop Giveaway ID: ${giveawayId}` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_drop_${giveawayId}`)
                    .setLabel('CLAIM NOW!')
                    .setEmoji('⚡')
                    .setStyle(ButtonStyle.Danger)
            );

        const message = await channel.send({
            content: '@everyone 🚨 **DROP GIVEAWAY!** 🚨',
            embeds: [embed],
            components: [row]
        });

        database.giveaways[giveawayId] = {
            prize,
            winners,
            channelId: channel.id,
            messageId: message.id,
            hostId: interaction.user.id,
            entries: [],
            selectedWinners: [],
            active: true,
            createdAt: Date.now(),
            type: 'drop'
        };

        saveDatabase(database);

        await interaction.reply({
            content: `✅ Drop giveaway started in ${channel}!\n**ID:** ${giveawayId}\n**Winners needed:** ${winners}`,
            ephemeral: true
        });
    },

    async pauseGiveaway(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (!giveaway.active) {
            await interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
            return;
        }

        if (giveaway.paused) {
            await interaction.reply({ content: '❌ This giveaway is already paused.', ephemeral: true });
            return;
        }

        if (giveaway.type === 'drop') {
            await interaction.reply({ content: '❌ Cannot pause drop giveaways.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            giveaway.paused = true;
            giveaway.pausedAt = Date.now();
            giveaway.remainingTime = giveaway.endsAt - Date.now();

            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⏸️ GIVEAWAY PAUSED ⏸️')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winners:** ${giveaway.winners}\n**Status:** ⏸️ Paused by <@${interaction.user.id}>\n**Entries:** ${giveaway.entries.length}`)
                .setFooter({ text: `Giveaway ID: ${giveawayId} | Paused` })
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });

            saveDatabase(database);

            await interaction.editReply('✅ Giveaway paused successfully!');
        } catch (error) {
            console.error('Error pausing giveaway:', error);
            await interaction.editReply(`❌ Failed to pause: ${error.message}`);
        }
    },

    async resumeGiveaway(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (!giveaway.active) {
            await interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
            return;
        }

        if (!giveaway.paused) {
            await interaction.reply({ content: '❌ This giveaway is not paused.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            giveaway.paused = false;
            giveaway.endsAt = Date.now() + giveaway.remainingTime;
            delete giveaway.pausedAt;
            delete giveaway.remainingTime;

            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            let requirementsText = '';
            if (giveaway.requirements.role || giveaway.requirements.minAccountAge || giveaway.boosterBonus) {
                requirementsText = '\n\n**Requirements:**\n';
                if (giveaway.requirements.role) requirementsText += `• Must have <@&${giveaway.requirements.role}> role\n`;
                if (giveaway.requirements.minAccountAge) requirementsText += `• Account must be ${giveaway.requirements.minAccountAge}+ days old\n`;
                if (giveaway.boosterBonus) requirementsText += `• 🎁 Server boosters get 2x entries!\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winners:** ${giveaway.winners}\n**Ends:** <t:${Math.floor(giveaway.endsAt / 1000)}:R>${requirementsText}`)
                .setFooter({ text: `Giveaway ID: ${giveawayId} | Resumed!` })
                .setTimestamp(giveaway.endsAt);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`giveaway_enter_${giveawayId}`)
                        .setLabel('Enter Giveaway')
                        .setEmoji('🎉')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.edit({ embeds: [embed], components: [row] });

            saveDatabase(database);

            await interaction.editReply(`✅ Giveaway resumed! Ends <t:${Math.floor(giveaway.endsAt / 1000)}:R>`);
        } catch (error) {
            console.error('Error resuming giveaway:', error);
            await interaction.editReply(`❌ Failed to resume: ${error.message}`);
        }
    },

    async editGiveaway(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');
        const newPrize = interaction.options.getString('prize');
        const addDuration = interaction.options.getInteger('add_duration');
        const newWinners = interaction.options.getInteger('winners');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (!giveaway.active) {
            await interaction.reply({ content: '❌ Cannot edit an ended giveaway.', ephemeral: true });
            return;
        }

        if (!newPrize && !addDuration && !newWinners) {
            await interaction.reply({ content: '❌ Please specify at least one field to edit.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const changes = [];

            if (newPrize) {
                giveaway.prize = newPrize;
                changes.push(`Prize → ${newPrize}`);
            }

            if (addDuration) {
                giveaway.endsAt += (addDuration * 60 * 1000);
                changes.push(`Added ${addDuration} minutes`);
            }

            if (newWinners) {
                giveaway.winners = newWinners;
                changes.push(`Winners → ${newWinners}`);
            }

            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            let requirementsText = '';
            if (giveaway.requirements && (giveaway.requirements.role || giveaway.requirements.minAccountAge || giveaway.boosterBonus)) {
                requirementsText = '\n\n**Requirements:**\n';
                if (giveaway.requirements.role) requirementsText += `• Must have <@&${giveaway.requirements.role}> role\n`;
                if (giveaway.requirements.minAccountAge) requirementsText += `• Account must be ${giveaway.requirements.minAccountAge}+ days old\n`;
                if (giveaway.boosterBonus) requirementsText += `• 🎁 Server boosters get 2x entries!\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winners:** ${giveaway.winners}\n**Ends:** <t:${Math.floor(giveaway.endsAt / 1000)}:R>${requirementsText}\n\n_📝 Edited by <@${interaction.user.id}>_`)
                .setFooter({ text: `Giveaway ID: ${giveawayId}` })
                .setTimestamp(giveaway.endsAt);

            await message.edit({ embeds: [embed] });

            saveDatabase(database);

            await interaction.editReply(`✅ Giveaway edited!\n**Changes:**\n${changes.map(c => `• ${c}`).join('\n')}`);
        } catch (error) {
            console.error('Error editing giveaway:', error);
            await interaction.editReply(`❌ Failed to edit: ${error.message}`);
        }
    },

    async deleteGiveaway(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_delete_gw_${giveawayId}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`cancel_delete_gw_${giveawayId}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            content: `⚠️ **Are you sure you want to delete this giveaway?**\n\n**Prize:** ${giveaway.prize}\n**Entries:** ${giveaway.entries.length}\n\nThis cannot be undone!`,
            components: [confirmRow],
            ephemeral: true
        });
    },

    async showParticipants(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (giveaway.entries.length === 0) {
            await interaction.reply({ content: '❌ No participants yet.', ephemeral: true });
            return;
        }

        const totalEntries = giveaway.entries.length + Object.values(giveaway.bonusEntries || {}).reduce((a, b) => a + b, 0);

        const participantList = giveaway.entries
            .slice(0, 20)
            .map((userId, index) => {
                const bonus = (giveaway.bonusEntries && giveaway.bonusEntries[userId]) || 0;
                const totalUserEntries = 1 + bonus;
                return `${index + 1}. <@${userId}> (${totalUserEntries} ${totalUserEntries > 1 ? 'entries' : 'entry'})`;
            })
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👥 Giveaway Participants`)
            .setDescription(`**Prize:** ${giveaway.prize}\n**Status:** ${giveaway.active ? giveaway.paused ? '⏸️ Paused' : '✅ Active' : '🏁 Ended'}\n\n**Participants:**\n${participantList}`)
            .setFooter({ text: `Total unique participants: ${giveaway.entries.length} | Total entries: ${totalEntries}` })
            .setTimestamp();

        if (giveaway.entries.length > 20) {
            embed.addFields({ name: 'Note', value: `Showing first 20 of ${giveaway.entries.length} participants` });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showStats(interaction, database) {
        if (!database.giveaways) database.giveaways = {};

        const giveaways = Object.values(database.giveaways);

        if (giveaways.length === 0) {
            await interaction.reply({ content: '❌ No giveaway data available.', ephemeral: true });
            return;
        }

        const active = giveaways.filter(gw => gw.active && !gw.paused).length;
        const paused = giveaways.filter(gw => gw.active && gw.paused).length;
        const ended = giveaways.filter(gw => !gw.active).length;
        const drops = giveaways.filter(gw => gw.type === 'drop').length;

        const totalEntries = giveaways.reduce((sum, gw) => sum + gw.entries.length, 0);
        const totalWinners = giveaways.filter(gw => gw.selectedWinners).reduce((sum, gw) => sum + gw.selectedWinners.length, 0);

        const avgEntries = giveaways.length > 0 ? (totalEntries / giveaways.length).toFixed(1) : 0;

        const mostPopular = giveaways.reduce((max, gw) => 
            gw.entries.length > (max?.entries?.length || 0) ? gw : max, null
        );

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📊 Giveaway Statistics')
            .addFields(
                { name: '📈 Overview', value: `Total Giveaways: **${giveaways.length}**\nActive: **${active}**\nPaused: **${paused}**\nEnded: **${ended}**\nDrop: **${drops}**`, inline: true },
                { name: '👥 Participation', value: `Total Entries: **${totalEntries}**\nTotal Winners: **${totalWinners}**\nAvg Entries/Giveaway: **${avgEntries}**`, inline: true }
            )
            .setTimestamp();

        if (mostPopular) {
            embed.addFields({ 
                name: '🏆 Most Popular', 
                value: `Prize: **${mostPopular.prize}**\nEntries: **${mostPopular.entries.length}**` 
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showHistory(interaction, database) {
        if (!database.giveaways) database.giveaways = {};

        const limit = interaction.options.getInteger('limit') || 10;
        const endedGiveaways = Object.entries(database.giveaways)
            .filter(([, gw]) => !gw.active)
            .sort(([, a], [, b]) => (b.endedAt || 0) - (a.endedAt || 0))
            .slice(0, limit);

        if (endedGiveaways.length === 0) {
            await interaction.reply({ content: '❌ No ended giveaways found.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 Giveaway History')
            .setDescription(`Showing ${endedGiveaways.length} most recent ended giveaways`)
            .setTimestamp();

        for (const [id, gw] of endedGiveaways.slice(0, 10)) {
            const winners = gw.selectedWinners 
                ? gw.selectedWinners.map(wId => `<@${wId}>`).join(', ')
                : 'No winners';
            
            embed.addFields({
                name: `${gw.prize}`,
                value: `**ID:** ${id}\n**Entries:** ${gw.entries.length}\n**Winners:** ${winners}\n**Ended:** <t:${Math.floor((gw.endedAt || gw.createdAt) / 1000)}:R>`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async announceGiveaway(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');
        const targetChannel = interaction.options.getChannel('channel');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (!giveaway.active) {
            await interaction.reply({ content: '❌ Cannot announce an ended giveaway.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const originalChannel = await interaction.client.channels.fetch(giveaway.channelId);
            const originalMessage = await originalChannel.messages.fetch(giveaway.messageId);

            const announceEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎉 GIVEAWAY ANNOUNCEMENT 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n**Ends:** <t:${Math.floor(giveaway.endsAt / 1000)}:R>\n\n[**Click here to enter!**](${originalMessage.url})`)
                .setFooter({ text: `Giveaway ID: ${giveawayId}` })
                .setTimestamp();

            await targetChannel.send({ content: '🎉 **GIVEAWAY ALERT!** 🎉', embeds: [announceEmbed] });

            await interaction.editReply(`✅ Giveaway announced in ${targetChannel}!`);
        } catch (error) {
            console.error('Error announcing giveaway:', error);
            await interaction.editReply(`❌ Failed to announce: ${error.message}`);
        }
    },

    async blacklistUser(interaction, database) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!database.giveawayBlacklist) database.giveawayBlacklist = {};

        if (database.giveawayBlacklist[user.id]) {
            await interaction.reply({ content: `❌ ${user.tag} is already blacklisted.`, ephemeral: true });
            return;
        }

        database.giveawayBlacklist[user.id] = {
            blacklistedAt: Date.now(),
            blacklistedBy: interaction.user.id,
            reason: reason
        };

        saveDatabase(database);

        await interaction.reply({
            content: `✅ ${user.tag} has been blacklisted from all giveaways.\n**Reason:** ${reason}`,
            ephemeral: true
        });
    },

    async unblacklistUser(interaction, database) {
        const user = interaction.options.getUser('user');

        if (!database.giveawayBlacklist) database.giveawayBlacklist = {};

        if (!database.giveawayBlacklist[user.id]) {
            await interaction.reply({ content: `❌ ${user.tag} is not blacklisted.`, ephemeral: true });
            return;
        }

        delete database.giveawayBlacklist[user.id];
        saveDatabase(database);

        await interaction.reply({
            content: `✅ ${user.tag} has been removed from the giveaway blacklist.`,
            ephemeral: true
        });
    },

    async showBlacklist(interaction, database) {
        if (!database.giveawayBlacklist) database.giveawayBlacklist = {};

        const blacklisted = Object.entries(database.giveawayBlacklist);

        if (blacklisted.length === 0) {
            await interaction.reply({ content: '✅ No users are currently blacklisted.', ephemeral: true });
            return;
        }

        const list = blacklisted
            .slice(0, 20)
            .map(([userId, data], index) => 
                `${index + 1}. <@${userId}>\n   Reason: ${data.reason}\n   By: <@${data.blacklistedBy}>`
            )
            .join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚫 Giveaway Blacklist')
            .setDescription(list)
            .setFooter({ text: `Total blacklisted: ${blacklisted.length}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async endGiveawayCommand(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (!giveaway.active) {
            await interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
            return;
        }

        if (giveaway.type === 'drop') {
            await interaction.reply({ content: '❌ Drop giveaways end automatically.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            await this.endGiveaway(interaction.client, database, giveawayId, message);

            await interaction.editReply('✅ Giveaway ended successfully!');
        } catch (error) {
            console.error('Error ending giveaway:', error);
            await interaction.editReply(`❌ Failed to end giveaway: ${error.message}`);
        }
    },

    async endGiveaway(client, database, giveawayId, message) {
        const giveaway = database.giveaways[giveawayId];

        if (!giveaway.active) return;

        giveaway.active = false;

        if (giveaway.entries.length === 0) {
            const noWinnerEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🎉 GIVEAWAY ENDED 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n❌ No valid entries!`)
                .setFooter({ text: `Giveaway ID: ${giveawayId}` })
                .setTimestamp();

            await message.edit({ embeds: [noWinnerEmbed], components: [] });
            saveDatabase(database);
            return;
        }

        const winnersToSelect = Math.min(giveaway.winners, giveaway.entries.length);
        const selectedWinners = [];

        const entriesPool = [...giveaway.entries];
        if (giveaway.bonusEntries) {
            for (const [userId, bonus] of Object.entries(giveaway.bonusEntries)) {
                for (let i = 0; i < bonus; i++) {
                    entriesPool.push(userId);
                }
            }
        }

        const shuffled = [...entriesPool].sort(() => 0.5 - Math.random());
        const uniqueWinners = new Set();
        
        for (const userId of shuffled) {
            if (uniqueWinners.size >= winnersToSelect) break;
            uniqueWinners.add(userId);
        }

        giveaway.selectedWinners = Array.from(uniqueWinners);
        giveaway.endedAt = Date.now();

        const winnerMentions = giveaway.selectedWinners.map(id => `<@${id}>`).join(', ');

        const winnerEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎉 GIVEAWAY ENDED 🎉')
            .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entries.length}`)
            .setFooter({ text: `Giveaway ID: ${giveawayId}` })
            .setTimestamp();

        await message.edit({ embeds: [winnerEmbed], components: [] });
        await message.reply(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);

        saveDatabase(database);
    },

    async rerollGiveaway(interaction, database) {
        const giveawayId = interaction.options.getString('giveaway_id');
        const newWinnerCount = interaction.options.getInteger('winners');

        if (!database.giveaways || !database.giveaways[giveawayId]) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }

        const giveaway = database.giveaways[giveawayId];

        if (giveaway.active) {
            await interaction.reply({ content: '❌ Cannot reroll an active giveaway. End it first.', ephemeral: true });
            return;
        }

        if (!giveaway.entries || giveaway.entries.length === 0) {
            await interaction.reply({ content: '❌ No entries to reroll.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const winnersToSelect = Math.min(newWinnerCount || giveaway.winners, giveaway.entries.length);
            
            const entriesPool = [...giveaway.entries];
            if (giveaway.bonusEntries) {
                for (const [userId, bonus] of Object.entries(giveaway.bonusEntries)) {
                    for (let i = 0; i < bonus; i++) {
                        entriesPool.push(userId);
                    }
                }
            }

            const shuffled = [...entriesPool].sort(() => 0.5 - Math.random());
            const uniqueWinners = new Set();
            
            for (const userId of shuffled) {
                if (uniqueWinners.size >= winnersToSelect) break;
                uniqueWinners.add(userId);
            }

            giveaway.selectedWinners = Array.from(uniqueWinners);
            giveaway.rerolledAt = Date.now();

            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            const winnerMentions = giveaway.selectedWinners.map(id => `<@${id}>`).join(', ');

            const rerollEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 GIVEAWAY REROLLED 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**New Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entries.length}`)
                .setFooter({ text: `Giveaway ID: ${giveawayId} | Rerolled` })
                .setTimestamp();

            await message.edit({ embeds: [rerollEmbed] });
            await message.reply(`🎉 Rerolled! Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);

            saveDatabase(database);

            await interaction.editReply('✅ Giveaway rerolled successfully!');
        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            await interaction.editReply(`❌ Failed to reroll: ${error.message}`);
        }
    },

    async listGiveaways(interaction, database) {
        if (!database.giveaways) database.giveaways = {};

        const filter = interaction.options.getString('filter');
        let giveaways = Object.entries(database.giveaways);

        if (filter === 'active') {
            giveaways = giveaways.filter(([, gw]) => gw.active && !gw.paused);
        } else if (filter === 'paused') {
            giveaways = giveaways.filter(([, gw]) => gw.active && gw.paused);
        } else if (filter === 'ended') {
            giveaways = giveaways.filter(([, gw]) => !gw.active);
        } else if (filter === 'drop') {
            giveaways = giveaways.filter(([, gw]) => gw.type === 'drop');
        }

        if (giveaways.length === 0) {
            await interaction.reply({ content: '❌ No giveaways found with that filter.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🎉 Giveaways ${filter ? `(${filter})` : ''}`)
            .setDescription(`Showing ${giveaways.length} giveaway(s)`)
            .setTimestamp();

        for (const [id, gw] of giveaways.slice(0, 10)) {
            const status = gw.active ? (gw.paused ? '⏸️ Paused' : '✅ Active') : '🏁 Ended';
            const time = gw.active ? `Ends: <t:${Math.floor(gw.endsAt / 1000)}:R>` : `Ended: <t:${Math.floor((gw.endedAt || gw.createdAt) / 1000)}:R>`;
            
            embed.addFields({
                name: `${gw.prize} ${gw.type === 'drop' ? '⚡' : ''}`,
                value: `**ID:** ${id}\n**Status:** ${status}\n**Entries:** ${gw.entries.length}\n${time}`,
                inline: true
            });
        }

        if (giveaways.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${giveaways.length} giveaways` });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}