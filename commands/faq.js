const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../utils/permissions');

const faqData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'faq.json'), 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('View frequently asked questions')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Select a specific FAQ topic')
                .setRequired(false)
                .addChoices(
                    ...faqData.faqs.map(faq => ({
                        name: faq.question,
                        value: faq.id
                    }))
                )),
    async execute(interaction) {
        if (!isAdmin(interaction.user.id)) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const topic = interaction.options.getString('topic');

        if (topic) {
            const faq = faqData.faqs.find(f => f.id === topic);
            
            if (!faq) {
                return interaction.reply({
                    content: '❌ FAQ topic not found.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`❓ ${faq.question}`)
                .setDescription(faq.answer)
                .setFooter({ text: 'Stacy Manager' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📚 Frequently Asked Questions')
            .setDescription('Select a topic from the dropdown menu or use `/faq <topic>` to view specific help.\n\n**Available Topics:**')
            .setFooter({ text: 'Stacy Manager' })
            .setTimestamp();

        faqData.faqs.forEach((faq, index) => {
            embed.addFields({
                name: `${index + 1}. ${faq.question}`,
                value: `Use: \`/faq topic:${faq.id}\``,
                inline: false
            });
        });

        return interaction.reply({ embeds: [embed] });
    },
};