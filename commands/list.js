const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all active Discord bot instances'),

    async execute(interaction, database) {
        const servers = Object.values(database.servers);

        if (servers.length === 0) {
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

        embed.setFooter({ text: `Total: ${servers.length} bot(s)` });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};