const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all active Discord bot instances'),

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        const servers = Object.values(database.servers);
        const queueLength = database.queue ? database.queue.length : 0;

        if (servers.length === 0 && queueLength === 0) {
            await interaction.reply({
                content: '📋 No bot instances found.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🤖 Active Bot Instances')
            .setColor(0x5865F2)
            .setTimestamp();

        for (const server of servers) {
            const status = server.suspended ? '🔴 Suspended' : '🟢 Active';
            const deleteInfo = server.deleteAt
                ? `\nDeletes: <t:${Math.floor(server.deleteAt / 1000)}:R>`
                : '';

            embed.addFields({
                name: `${server.botName}`,
                value: `**Server:** ${server.pterodactylName}\n` +
                    `**Status:** ${status}\n` +
                    `**Client ID:** ${server.clientId}\n` +
                    `**Created:** <t:${Math.floor(server.createdAt / 1000)}:R>` +
                    deleteInfo,
                inline: false
            });
        }

        let footerText = `Total: ${servers.length} bot(s)`;
        if (queueLength > 0) {
            footerText += ` | Queue: ${queueLength} pending`;
        }
        embed.setFooter({ text: footerText });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};