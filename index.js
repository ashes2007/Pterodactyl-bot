const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();
const database = loadDatabase();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    
    const commands = [];
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }

    setupScheduledDeletions();
    setupGiveawayChecks();
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction, database);
        return;
    }

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
            await command.autocomplete(interaction, database);
        } catch (error) {
            console.error('Error in autocomplete:', error);
        }
        return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'addBotModal') {
            try {
                const addCommand = client.commands.get('add');
                await addCommand.handleModal(interaction, database);
            } catch (error) {
                console.error('Error handling modal:', error);
                const reply = { content: 'There was an error processing your submission!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, database);
    } catch (error) {
        console.error('Error executing command:', error);
        const reply = { content: 'There was an error executing this command!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

function setupScheduledDeletions() {
    cron.schedule('*/30 * * * *', async () => {
        console.log('Checking for servers to delete...');
        const now = Date.now();
        const pterodactyl = require('./utils/pterodactyl');

        for (const [serverId, data] of Object.entries(database.servers)) {
            if (data.deleteAt && now >= data.deleteAt) {
                try {
                    await pterodactyl.deleteServer(data.pterodactylId);
                    delete database.servers[serverId];
                    saveDatabase(database);
                    console.log(`Deleted server: ${data.botName}`);
                    
                    await processQueue(client, database);
                } catch (error) {
                    console.error(`Failed to delete server ${serverId}:`, error.message);
                }
            }
        }
    });
}

function setupGiveawayChecks() {
    cron.schedule('*/1 * * * *', async () => {
        if (!database.giveaways) return;
        
        const now = Date.now();
        for (const [gwId, giveaway] of Object.entries(database.giveaways)) {
            if (giveaway.active && now >= giveaway.endsAt) {
                try {
                    const channel = await client.channels.fetch(giveaway.channelId);
                    const message = await channel.messages.fetch(giveaway.messageId);
                    
                    const giveawayCommand = client.commands.get('giveaway');
                    if (giveawayCommand && giveawayCommand.endGiveaway) {
                        await giveawayCommand.endGiveaway(client, database, gwId, message);
                    }
                } catch (error) {
                    console.error(`Error ending giveaway ${gwId}:`, error.message);
                }
            }
        }
    });
}

function loadDatabase() {
    const dbPath = path.join(__dirname, 'database.json');
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    }
    return { servers: {} };
}

function saveDatabase(data) {
    const dbPath = path.join(__dirname, 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function processQueue(client, database) {
    if (!database.queue || database.queue.length === 0) {
        return;
    }

    console.log(`Processing queue... ${database.queue.length} entries pending`);

    try {
        const pterodactyl = require('./utils/pterodactyl');
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
                `\
\ u2705 Your bot instance has been created from the queue!\\n\\n` +
                `**Bot Name:** ${botName}\\n` +
                `**Client ID:** ${queueEntry.clientId}\\n` +
                `**Server Name:** ${serverName}\\n\\n` +
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

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

async function handleButtonInteraction(interaction, database) {
    const pterodactyl = require('./utils/pterodactyl');
    const { isAdmin } = require('./utils/permissions');
    
    if (interaction.customId.startsWith('power_')) {
        const [, action, serverUuid] = interaction.customId.split('_');
        
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({ content: '❌ Only admins can use these controls.', ephemeral: true });
            return;
        }
        
        const serverData = database.servers[serverUuid];
        if (!serverData) {
            await interaction.reply({ content: '❌ Bot not found.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            if (action === 'start') {
                await pterodactyl.startServer(serverUuid);
                await interaction.editReply(`✅ Started ${serverData.botName}`);
            } else if (action === 'stop') {
                await pterodactyl.stopServer(serverUuid);
                await interaction.editReply(`✅ Stopped ${serverData.botName}`);
            } else if (action === 'restart') {
                await pterodactyl.restartServer(serverUuid);
                await interaction.editReply(`✅ Restarted ${serverData.botName}`);
            }
        } catch (error) {
            await interaction.editReply(`❌ Failed: ${error.message}`);
        }
    } else if (interaction.customId === 'confirm_mass_restart') {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({ content: '❌ Only admins can use this.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        let restarted = 0;
        let failed = 0;
        
        for (const [uuid, data] of Object.entries(database.servers)) {
            if (!data.suspended) {
                try {
                    await pterodactyl.restartServer(uuid);
                    restarted++;
                } catch (error) {
                    console.error(`Failed to restart ${uuid}:`, error.message);
                    failed++;
                }
            }
        }
        
        await interaction.editReply(`✅ Mass restart complete!\n✅ Restarted: ${restarted}\n❌ Failed: ${failed}`);
        await interaction.message.delete();
    } else if (interaction.customId === 'cancel_mass_restart') {
        await interaction.update({ content: '❌ Mass restart cancelled.', components: [] });
        setTimeout(() => interaction.message.delete(), 3000);
    } else if (interaction.customId.startsWith('confirm_remove_')) {
        const serverUuid = interaction.customId.replace('confirm_remove_', '');
        
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({ content: '❌ Only admins can use this.', ephemeral: true });
            return;
        }
        
        const serverData = database.servers[serverUuid];
        if (!serverData) {
            await interaction.reply({ content: '❌ Bot not found.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            await pterodactyl.deleteServer(serverData.pterodactylId);
            delete database.servers[serverUuid];
            saveDatabase(database);
            await interaction.editReply(`✅ Deleted ${serverData.botName}`);
            await interaction.message.delete();
        } catch (error) {
            await interaction.editReply(`❌ Failed: ${error.message}`);
        }
    } else if (interaction.customId.startsWith('cancel_remove_')) {
        await interaction.update({ content: '❌ Removal cancelled.', components: [] });
        setTimeout(() => interaction.message.delete(), 3000);
    } else if (interaction.customId.startsWith('giveaway_enter_')) {
        const giveawayId = interaction.customId.replace('giveaway_enter_', '');
        
        if (!database.giveaways) database.giveaways = {};
        const giveaway = database.giveaways[giveawayId];
        
        if (!giveaway || !giveaway.active) {
            await interaction.reply({ content: '❌ This giveaway is no longer active.', ephemeral: true });
            return;
        }
        
        if (giveaway.paused) {
            await interaction.reply({ content: '❌ This giveaway is currently paused.', ephemeral: true });
            return;
        }
        
        if (!giveaway.entries) giveaway.entries = [];
        if (!database.giveawayBlacklist) database.giveawayBlacklist = [];
        
        if (database.giveawayBlacklist.includes(interaction.user.id)) {
            await interaction.reply({ content: '❌ You are blacklisted from entering giveaways.', ephemeral: true });
            return;
        }
        
        if (giveaway.entries.includes(interaction.user.id)) {
            await interaction.reply({ content: '❌ You are already entered in this giveaway!', ephemeral: true });
            return;
        }
        
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) {
            await interaction.reply({ content: '❌ Could not verify your server membership.', ephemeral: true });
            return;
        }
        
        if (giveaway.requirements) {
            const req = giveaway.requirements;
            
            if (req.requiredRole) {
                if (!member.roles.cache.has(req.requiredRole)) {
                    await interaction.reply({ 
                        content: `❌ You need the <@&${req.requiredRole}> role to enter this giveaway!`, 
                        ephemeral: true 
                    });
                    return;
                }
            }
            
            if (req.minAccountAge) {
                const accountAge = Date.now() - interaction.user.createdTimestamp;
                const requiredAge = req.minAccountAge * 24 * 60 * 60 * 1000;
                if (accountAge < requiredAge) {
                    await interaction.reply({ 
                        content: `❌ Your account must be at least ${req.minAccountAge} days old to enter!`, 
                        ephemeral: true 
                    });
                    return;
                }
            }
            
            if (req.minServerAge) {
                const serverAge = Date.now() - member.joinedTimestamp;
                const requiredAge = req.minServerAge * 24 * 60 * 60 * 1000;
                if (serverAge < requiredAge) {
                    await interaction.reply({ 
                        content: `❌ You must be in the server for at least ${req.minServerAge} days to enter!`, 
                        ephemeral: true 
                    });
                    return;
                }
            }
        }
        
        let entriesCount = 1;
        
        if (giveaway.bonusEntries && member.premiumSince) {
            entriesCount += giveaway.bonusEntries;
        }
        
        for (let i = 0; i < entriesCount; i++) {
            giveaway.entries.push(interaction.user.id);
        }
        saveDatabase(database);
        
        const entryMsg = entriesCount > 1 
            ? `✅ You have been entered with ${entriesCount} entries (Booster Bonus)! Total entries: ${giveaway.entries.length}`
            : `✅ You have been entered into the giveaway! Total entries: ${giveaway.entries.length}`;
        
        await interaction.reply({ content: entryMsg, ephemeral: true });
    } else if (interaction.customId.startsWith('giveaway_drop_')) {
        const giveawayId = interaction.customId.replace('giveaway_drop_', '');
        
        if (!database.giveaways) database.giveaways = {};
        const giveaway = database.giveaways[giveawayId];
        
        if (!giveaway || !giveaway.active || !giveaway.dropGiveaway) {
            await interaction.reply({ content: '❌ This drop giveaway is no longer active.', ephemeral: true });
            return;
        }
        
        if (!giveaway.entries) giveaway.entries = [];
        if (!database.giveawayBlacklist) database.giveawayBlacklist = [];
        
        if (database.giveawayBlacklist.includes(interaction.user.id)) {
            await interaction.reply({ content: '❌ You are blacklisted from entering giveaways.', ephemeral: true });
            return;
        }
        
        if (giveaway.entries.includes(interaction.user.id)) {
            await interaction.reply({ content: '❌ You already claimed this drop!', ephemeral: true });
            return;
        }
        
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) {
            await interaction.reply({ content: '❌ Could not verify your server membership.', ephemeral: true });
            return;
        }
        
        if (giveaway.requirements) {
            const req = giveaway.requirements;
            
            if (req.requiredRole && !member.roles.cache.has(req.requiredRole)) {
                await interaction.reply({ 
                    content: `❌ You need the <@&${req.requiredRole}> role to claim this!`, 
                    ephemeral: true 
                });
                return;
            }
        }
        
        giveaway.entries.push(interaction.user.id);
        
        if (giveaway.entries.length >= giveaway.winners) {
            giveaway.active = false;
            giveaway.selectedWinners = [...giveaway.entries];
            giveaway.endedAt = Date.now();
            
            try {
                const channel = await interaction.client.channels.fetch(giveaway.channelId);
                const message = await channel.messages.fetch(giveaway.messageId);
                
                const winnerMentions = giveaway.selectedWinners.map(id => `<@${id}>`).join(', ');
                
                const { EmbedBuilder } = require('discord.js');
                const winnerEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎉 DROP GIVEAWAY COMPLETE 🎉')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):** ${winnerMentions}`)
                    .setFooter({ text: `Giveaway ID: ${giveawayId}` })
                    .setTimestamp();
                
                await message.edit({ embeds: [winnerEmbed], components: [] });
                await message.reply(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
            } catch (error) {
                console.error('Error ending drop giveaway:', error);
            }
            
            saveDatabase(database);
            await interaction.reply({ content: `🎉 Congratulations! You are one of the ${giveaway.winners} winners!`, ephemeral: true });
        } else {
            saveDatabase(database);
            const remaining = giveaway.winners - giveaway.entries.length;
            await interaction.reply({ 
                content: `✅ You claimed the drop! ${remaining} spot(s) remaining!`, 
                ephemeral: true 
            });
        }
    } else if (interaction.customId.startsWith('giveaway_pause_confirm_')) {
        const giveawayId = interaction.customId.replace('giveaway_pause_confirm_', '');
        
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({ content: '❌ Only admins can use this.', ephemeral: true });
            return;
        }
        
        const giveaway = database.giveaways[giveawayId];
        if (!giveaway) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }
        
        giveaway.paused = true;
        giveaway.pausedAt = Date.now();
        saveDatabase(database);
        
        await interaction.update({ content: `✅ Giveaway **${giveawayId}** has been paused.`, components: [] });
        setTimeout(() => interaction.message.delete(), 3000);
    } else if (interaction.customId.startsWith('giveaway_pause_cancel_')) {
        await interaction.update({ content: '❌ Pause cancelled.', components: [] });
        setTimeout(() => interaction.message.delete(), 3000);
    } else if (interaction.customId.startsWith('giveaway_delete_confirm_')) {
        const giveawayId = interaction.customId.replace('giveaway_delete_confirm_', '');
        
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({ content: '❌ Only admins can use this.', ephemeral: true });
            return;
        }
        
        const giveaway = database.giveaways[giveawayId];
        if (!giveaway) {
            await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
            return;
        }
        
        try {
            const channel = await interaction.client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);
            await message.delete();
        } catch (error) {
            console.log('Could not delete giveaway message:', error.message);
        }
        
        delete database.giveaways[giveawayId];
        saveDatabase(database);
        
        await interaction.update({ content: `✅ Giveaway **${giveawayId}** has been permanently deleted.`, components: [] });
        setTimeout(() => interaction.message.delete(), 3000);
    } else if (interaction.customId.startsWith('giveaway_delete_cancel_')) {
        await interaction.update({ content: '❌ Deletion cancelled.', components: [] });
        setTimeout(() => interaction.message.delete(), 3000);
    }
}

client.login(process.env.DISCORD_TOKEN);