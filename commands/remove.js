const { SlashCommandBuilder } = require('discord.js');
const pterodactyl = require('../utils/pterodactyl');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a Discord bot instance')
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Select the bot to remove')
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
        await interaction.deferReply({ ephemeral: true });

        const serverUuid = interaction.options.getString('bot');
        const serverData = database.servers[serverUuid];

        if (!serverData) {
            await interaction.editReply('❌ Bot not found in database.');
            return;
        }

        try {
            await interaction.editReply('Suspending server...');

            await pterodactyl.suspendServer(serverData.pterodactylId);

            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            serverData.suspended = true;
            serverData.deleteAt = Date.now() + oneWeek;
            serverData.suspendedBy = interaction.user.id;
            serverData.suspendedAt = Date.now();

            database.servers[serverUuid] = serverData;
            saveDatabase(database);

            const deleteDate = new Date(serverData.deleteAt);

            await interaction.editReply({
                content: `✅ Bot instance suspended successfully!\n\n` +
                    `**Bot Name:** ${serverData.botName}\n` +
                    `**Server Name:** ${serverData.pterodactylName}\n` +
                    `**Status:** Suspended\n` +
                    `**Scheduled Deletion:** ${deleteDate.toLocaleString()}\n\n` +
                    `The server will be automatically deleted in 7 days.`
            });

        } catch (error) {
            console.error('Error removing bot:', error);
            await interaction.editReply({
                content: `❌ Failed to suspend bot instance: ${error.message}`
            });
        }
    }
};

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}