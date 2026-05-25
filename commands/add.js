const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const pterodactyl = require('../utils/pterodactyl');
const { isAdmin } = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

const PENDING_DATA_DIR = path.join(__dirname, '..', '.pending');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Create a new Discord bot instance'),

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        // Check if there's pending data for this user
        const pendingData = loadPendingData(interaction.user.id);
        
        if (pendingData) {
            // Resume with existing data
            await interaction.reply({
                content: `⏭️ Resuming bot creation from previous session...\n\n**Bot Token:** ||${pendingData.token.slice(0, 20)}...||\n**Client ID:** ${pendingData.clientId}\n**Server ID:** ${pendingData.serverId}`,
                ephemeral: false
            });
            
            await processBot(interaction, database, pendingData.token, pendingData.clientId, pendingData.serverId);
            return;
        }

        // Show modal for new bot
        const modal = new ModalBuilder()
            .setCustomId('addBotModal')
            .setTitle('Create New Bot Instance');

        const tokenInput = new TextInputBuilder()
            .setCustomId('token')
            .setLabel('Discord Bot Token')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('MTIzNDU2Nzg5MDEyMzQ1Njc4.Abc123.Def456...')
            .setRequired(true);

        const clientIdInput = new TextInputBuilder()
            .setCustomId('clientId')
            .setLabel('Bot Client ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('123456789012345678')
            .setRequired(true);

        const serverIdInput = new TextInputBuilder()
            .setCustomId('serverId')
            .setLabel('Discord Server ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('987654321098765432')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(tokenInput),
            new ActionRowBuilder().addComponents(clientIdInput),
            new ActionRowBuilder().addComponents(serverIdInput)
        );

        await interaction.showModal(modal);
    },

    async handleModal(interaction, database) {
        const token = interaction.fields.getTextInputValue('token');
        const clientId = interaction.fields.getTextInputValue('clientId');
        const serverId = interaction.fields.getTextInputValue('serverId');

        // Save pending data immediately
        savePendingData(interaction.user.id, { token, clientId, serverId });

        await interaction.reply({
            content: '🔄 Creating bot instance, please wait...',
            ephemeral: false
        });

        await processBot(interaction, database, token, clientId, serverId);
    }
};

async function processBot(interaction, database, token, clientId, serverId) {
    try {
        await interaction.editReply('🔍 Fetching bot and server information...');

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

        await interaction.editReply('🛠️ Creating Pterodactyl server... This may take a moment.');

        const serverInfo = await pterodactyl.createServer(token, clientId, serverId, botName, serverName);

        await interaction.editReply('⚙️ Server created! Starting bot...');

        await pterodactyl.startServer(serverInfo.uuid);

        const serverData = {
            botName: botName,
            serverName: serverName,
            clientId: clientId,
            discordServerId: serverId,
            pterodactylId: serverInfo.pterodactylId,
            pterodactylUuid: serverInfo.uuid,
            pterodactylName: serverInfo.name || `Bot-${clientId}`,
            createdAt: Date.now(),
            createdBy: interaction.user.id,
            suspended: false,
            deleteAt: null
        };

        database.servers[serverInfo.uuid] = serverData;
        saveDatabase(database);

        // Clear pending data on success
        clearPendingData(interaction.user.id);

        await interaction.editReply('✅ Bot instance created successfully! See details below.');

        // Send public embed with server information
        const maskedToken = token.slice(0, 10) + '.....' + token.slice(-4);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🤖 New Bot Instance Created')
            .setDescription('A new Discord bot instance has been successfully deployed!')
            .addFields(
                { name: '🏷️ Bot Name', value: String(serverData.botName), inline: true },
                { name: '🆔 Client ID', value: String(clientId), inline: true },
                { name: '🔑 Bot Token', value: `||${maskedToken}||`, inline: false },
                { name: '📡 Server ID', value: String(serverId), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Stacy Manager' });

        await interaction.channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error creating bot:', error);
        await interaction.editReply({
            content: `❌ Failed to create bot instance: ${error.message}`
        });
        // Keep pending data on failure so user can retry
    }
}

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function savePendingData(userId, data) {
    if (!fs.existsSync(PENDING_DATA_DIR)) {
        fs.mkdirSync(PENDING_DATA_DIR, { recursive: true });
    }
    const filePath = path.join(PENDING_DATA_DIR, `${userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadPendingData(userId) {
    const filePath = path.join(PENDING_DATA_DIR, `${userId}.json`);
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    return null;
}

function clearPendingData(userId) {
    const filePath = path.join(PENDING_DATA_DIR, `${userId}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}