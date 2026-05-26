const { SlashCommandBuilder } = require('discord.js');
const pterodactyl = require('../utils/pterodactyl');
const { isAdmin } = require('../utils/permissions');
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
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('delete_immediately')
                .setDescription('Delete immediately instead of suspending')
                .setRequired(false)
                .addChoices(
                    { name: 'Yes', value: 'yes' }
                )),

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
        const deleteImmediately = interaction.options.getString('delete_immediately');
        const serverData = database.servers[serverUuid];

        if (!serverData) {
            await interaction.editReply('❌ Bot not found in database.');
            return;
        }

        try {
            if (deleteImmediately === 'yes') {
                await interaction.editReply('Deleting server immediately...');

                await pterodactyl.deleteServer(serverData.pterodactylId);

                delete database.servers[serverUuid];
                saveDatabase(database);

                await interaction.editReply({
                    content: `✅ Bot instance deleted immediately!\n\n` +
                        `**Bot Name:** ${serverData.botName}\n` +
                        `**Server Name:** ${serverData.pterodactylName}\n` +
                        `**Status:** Deleted`
                });

                await processQueue(interaction.client, database);
            } else {
                await interaction.editReply('Suspending server...');

                await pterodactyl.stopServer(serverUuid);
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
            }

        } catch (error) {
            console.error('Error removing bot:', error);
            await interaction.editReply({
                content: `❌ Failed to ${deleteImmediately === 'yes' ? 'delete' : 'suspend'} bot instance: ${error.message}`
            });
        }
    }
};

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function processQueue(client, database) {
    if (!database.queue || database.queue.length === 0) {
        return;
    }

    console.log(`Processing queue... ${database.queue.length} entries pending`);

    try {
        const nodes = await pterodactyl.getNodes();
        if (nodes.length === 0) {
            console.log('No nodes available for queue processing');
            return;
        }

        const node = nodes[0];
        const allocations = await pterodactyl.getNodeAllocations(node.attributes.id);
        
        if (allocations.length === 0) {
            console.log('No allocations available for queue processing');
            return;
        }

        const queueEntry = database.queue.shift();
        saveDatabase(database);

        console.log(`Creating bot from queue for user ${queueEntry.userId}`);

        let botName = `Bot-${queueEntry.clientId}`;
        let serverName = `Server-${queueEntry.serverId}`;

        try {
            const { Client, GatewayIntentBits } = require('discord.js');
            const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] });
            
            await tempClient.login(queueEntry.token);
            botName = tempClient.user.username;
            
            try {
                const guild = await tempClient.guilds.fetch(queueEntry.serverId);
                serverName = guild.name;
            } catch (err) {
                console.log('Could not fetch server name:', err.message);
            }
            
            await tempClient.destroy();
        } catch (err) {
            console.log('Could not fetch bot information:', err.message);
        }

        const serverInfo = await pterodactyl.createServer(queueEntry.token, queueEntry.clientId, queueEntry.serverId, botName, serverName);
        await pterodactyl.startServer(serverInfo.uuid);

        const serverData = {
            botName: botName,
            serverName: serverName,
            clientId: queueEntry.clientId,
            discordServerId: queueEntry.serverId,
            pterodactylId: serverInfo.pterodactylId,
            pterodactylUuid: serverInfo.uuid,
            pterodactylName: serverInfo.name || `Bot-${queueEntry.clientId}`,
            createdAt: Date.now(),
            createdBy: queueEntry.userId,
            suspended: false,
            deleteAt: null,
            fromQueue: true
        };

        database.servers[serverInfo.uuid] = serverData;
        saveDatabase(database);

        try {
            const user = await client.users.fetch(queueEntry.userId);
            await user.send(
                `✅ Your bot instance has been created from the queue!\n\n` +
                `**Bot Name:** ${botName}\n` +
                `**Client ID:** ${queueEntry.clientId}\n` +
                `**Server Name:** ${serverName}\n\n` +
                `Your bot is now online!`
            );
        } catch (err) {
            console.error('Could not send DM to user:', err.message);
        }

        console.log('Queue entry processed successfully!');

    } catch (error) {
        console.error('Error processing queue:', error.message);
        database.queue.unshift(queueEntry);
        saveDatabase(database);
    }
}