const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mass-restart')
        .setDescription('Restart all active bot instances at once'),

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        const activeBots = Object.values(database.servers).filter(bot => !bot.suspended);

        if (activeBots.length === 0) {
            await interaction.reply({
                content: '❌ No active bots found to restart.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Mass Restart Confirmation')
            .setDescription(`You are about to restart **${activeBots.length} bot instance(s)**.`)
            .addFields(
                { name: '📊 Total Bots', value: `${activeBots.length}`, inline: true },
                { name: '⚠️ Warning', value: 'All bots will be restarted simultaneously', inline: false }
            )
            .setFooter({ text: 'This action cannot be undone' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_mass_restart')
                    .setLabel('Confirm Restart')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_mass_restart')
                    .setLabel('Cancel')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};