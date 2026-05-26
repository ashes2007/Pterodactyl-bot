const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('power')
        .setDescription('Interactive power control panel for a bot')
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Select the bot to control')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction, database) {
        const focusedValue = interaction.options.getFocused();
        const choices = [];

        for (const [uuid, data] of Object.entries(database.servers)) {
            choices.push({
                name: `${data.botName} | ${data.serverName}`,
                value: uuid
            });
        }

        const filtered = choices.filter(choice =>
            choice.name.toLowerCase().includes(focusedValue.toLowerCase())
        );

        await interaction.respond(filtered.slice(0, 25));
    },

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        const serverUuid = interaction.options.getString('bot');
        const serverData = database.servers[serverUuid];

        if (!serverData) {
            await interaction.reply({
                content: '❌ Bot not found in database.',
                ephemeral: true
            });
            return;
        }

        if (serverData.suspended) {
            await interaction.reply({
                content: '❌ This bot is suspended. Please unsuspend it first using `/cancel`.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎮 Bot Power Control Panel')
            .setDescription(`Control **${serverData.botName}** on server **${serverData.serverName}**`)
            .addFields(
                { name: '🤖 Bot Name', value: serverData.botName, inline: true },
                { name: '🖥️ Server', value: serverData.serverName, inline: true },
                { name: '🆔 Client ID', value: serverData.clientId, inline: true }
            )
            .setFooter({ text: 'Use the buttons below to control this bot' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`power_start_${serverUuid}`)
                    .setLabel('Start')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`power_stop_${serverUuid}`)
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`power_restart_${serverUuid}`)
                    .setLabel('Restart')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};