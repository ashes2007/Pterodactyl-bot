const { SlashCommandBuilder } = require('discord.js');
const pterodactyl = require('../utils/pterodactyl');
const { isAdmin } = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Cancel scheduled deletion and restart a suspended bot')
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Select the bot to cancel deletion for')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction, database) {
        const focusedValue = interaction.options.getFocused();
        const choices = [];

        for (const [uuid, data] of Object.entries(database.servers)) {
            if (data.suspended && data.deleteAt) {
                choices.push({
                    name: `${data.botName} | ${data.serverName}`,
                    value: uuid
                });
            }
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

        if (!serverData.suspended || !serverData.deleteAt) {
            await interaction.editReply('❌ This bot is not scheduled for deletion.');
            return;
        }

        try {
            await interaction.editReply('Unsuspending server and canceling deletion...');

            await pterodactyl.unsuspendServer(serverData.pterodactylId);

            serverData.suspended = false;
            serverData.deleteAt = null;
            serverData.canceledBy = interaction.user.id;
            serverData.canceledAt = Date.now();
            delete serverData.suspendedBy;
            delete serverData.suspendedAt;

            database.servers[serverUuid] = serverData;
            saveDatabase(database);

            await interaction.editReply('Starting server...');

            await pterodactyl.startServer(serverData.pterodactylUuid);

            await interaction.editReply({
                content: `✅ Bot instance restored successfully!\n\n` +
                    `**Bot Name:** ${serverData.botName}\n` +
                    `**Server Name:** ${serverData.serverName}\n` +
                    `**Pterodactyl Server:** ${serverData.pterodactylName}\n` +
                    `**Status:** Active\n\n` +
                    `The scheduled deletion has been canceled and the bot is starting up!`
            });

        } catch (error) {
            console.error('Error canceling deletion:', error);
            await interaction.editReply({
                content: `❌ Failed to cancel deletion: ${error.message}`
            });
        }
    }
};

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}