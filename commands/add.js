const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pterodactyl = require('../utils/pterodactyl');
const { isAdmin } = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Create a new Discord bot instance')
        .addStringOption(option =>
            option.setName('token')
                .setDescription('Discord bot token')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('clientid')
                .setDescription('Bot client ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('serverid')
                .setDescription('Discord server ID where the bot will be used')
                .setRequired(true)),

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const token = interaction.options.getString('token');
        const clientId = interaction.options.getString('clientid');
        const serverId = interaction.options.getString('serverid');

        try {
            await interaction.editReply('Fetching bot and server information...');

            let botName = `Bot-${clientId}`;
            let serverName = `Server-${serverId}`;

            try {
                const { Client, GatewayIntentBits } = require('discord.js');
                const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] });
                
                await tempClient.login(token);
                botName = tempClient.user.username;
                
                try {
                    const guild = await tempClient.guilds.fetch(serverId);
                    serverName = guild.name;
                } catch (err) {
                    console.log('Could not fetch server name:', err.message);
                }
                
                await tempClient.destroy();
            } catch (err) {
                console.log('Could not fetch bot information:', err.message);
            }

            await interaction.editReply('Creating Pterodactyl server... This may take a moment.');

            const serverInfo = await pterodactyl.createServer(token, clientId, serverId, botName, serverName);

            await interaction.editReply('Server created! Starting bot...');

            await pterodactyl.startServer(serverInfo.uuid);

            const serverData = {
                botName: botName,
                serverName: serverName,
                clientId: clientId,
                discordServerId: serverId,
                pterodactylId: serverInfo.pterodactylId,
                pterodactylUuid: serverInfo.uuid,
                pterodactylName: serverInfo.name,
                createdAt: Date.now(),
                createdBy: interaction.user.id,
                suspended: false,
                deleteAt: null
            };

            database.servers[serverInfo.uuid] = serverData;
            saveDatabase(database);

            await interaction.editReply({
                content: `✅ Bot instance created successfully! See details below.`
            });

            // Send public embed with server information
            const maskedToken = token.slice(0, 20) + '••••••••••••••••••••' + token.slice(-4);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🤖 New Bot Instance Created')
                .setDescription('A new Discord bot instance has been successfully deployed!')
                .addFields(
                    { name: '🏷️ Bot Name', value: serverData.botName, inline: true },
                    { name: '🆔 Client ID', value: clientId, inline: true },
                    { name: '🔑 Bot Token', value: `||${maskedToken}||`, inline: false },
                    { name: '🌐 Discord Server', value: serverData.serverName, inline: true },
                    { name: '📡 Server ID', value: serverId, inline: true },
                    { name: '🖥️ Pterodactyl Server', value: serverInfo.name, inline: false },
                    { name: '🔢 Pterodactyl ID', value: serverInfo.pterodactylId.toString(), inline: true },
                    { name: '🆔 Server UUID', value: serverInfo.uuid, inline: false },
                    { name: '✅ Status', value: 'Starting...', inline: true },
                    { name: '👤 Created By', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Bot Instance Manager' });

            await interaction.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error creating bot:', error);
            await interaction.editReply({
                content: `❌ Failed to create bot instance: ${error.message}`
            });
        }
    }
};

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}