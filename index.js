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
});

client.on('interactionCreate', async interaction => {
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
                } catch (error) {
                    console.error(`Failed to delete server ${serverId}:`, error.message);
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

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);