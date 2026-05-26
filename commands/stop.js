const { SlashCommandBuilder } = require('discord.js');
const pterodactyl = require('../utils/pterodactyl');
const { isAdmin } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop a running Discord bot instance')
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Select the bot to stop')
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

        await interaction.deferReply({ ephemeral: true });

        const serverUuid = interaction.options.getString('bot');
        const serverData = database.servers[serverUuid];

        if (!serverData) {
            await interaction.editReply('❌ Bot not found in database.');
            return;
        }

        try {
            await interaction.editReply('⏹️ Stopping bot instance...');

            await pterodactyl.stopServer(serverUuid);

            await interaction.editReply({
                content: `✅ Bot instance stopped successfully!\n\n` +
                    `**Bot Name:** ${serverData.botName}\n` +
                    `**Server Name:** ${serverData.pterodactylName}\n` +
                    `**Status:** Stopped`
            });

        } catch (error) {
            console.error('Error stopping bot:', error);
            await interaction.editReply({
                content: `❌ Failed to stop bot instance: ${error.message}`
            });
        }
    }
};