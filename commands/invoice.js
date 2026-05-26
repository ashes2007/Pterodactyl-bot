const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invoice')
        .setDescription('Manage invoices and payments')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new invoice')
                .addNumberOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to charge')
                        .setRequired(true)
                        .setMinValue(0.5))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to invoice')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('currency')
                        .setDescription('Currency')
                        .setRequired(true)
                        .addChoices(
                            { name: 'USD ($)', value: 'usd' },
                            { name: 'GBP (£)', value: 'gbp' }
                        ))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Invoice description')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Update invoice payment status')
                .addStringOption(option =>
                    option.setName('transaction_id')
                        .setDescription('Transaction/Invoice ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Payment status')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Paid', value: 'paid' },
                            { name: 'Unpaid', value: 'unpaid' },
                            { name: 'Partial Paid', value: 'partial' },
                            { name: 'Canceled', value: 'canceled' }
                        ))
                .addNumberOption(option =>
                    option.setName('partial_amount')
                        .setDescription('Amount paid (for partial payments only)')
                        .setRequired(false)
                        .setMinValue(0.01)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View invoice details')
                .addStringOption(option =>
                    option.setName('transaction_id')
                        .setDescription('Transaction/Invoice ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all invoices')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Paid', value: 'paid' },
                            { name: 'Unpaid', value: 'unpaid' },
                            { name: 'Partial Paid', value: 'partial' },
                            { name: 'Canceled', value: 'canceled' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Filter by user')
                        .setRequired(false))),

    async execute(interaction, database) {
        if (!isAdmin(interaction.user.id)) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            await this.createInvoice(interaction, database);
        } else if (subcommand === 'status') {
            await this.updateStatus(interaction, database);
        } else if (subcommand === 'view') {
            await this.viewInvoice(interaction, database);
        } else if (subcommand === 'list') {
            await this.listInvoices(interaction, database);
        }
    },

    async createInvoice(interaction, database) {
        const amount = interaction.options.getNumber('amount');
        const user = interaction.options.getUser('user');
        const currency = interaction.options.getString('currency');
        const customDescription = interaction.options.getString('description') || 'Stacy Bot Payment';

        await interaction.deferReply({ ephemeral: true });

        if (!database.invoices) database.invoices = {};

        try {
            const amountInCents = Math.round(amount * 100);

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency,
                            product_data: {
                                name: customDescription,
                                description: `Invoice for ${user.tag}`,
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                metadata: {
                    invoiceId: `inv_${Date.now()}`,
                    user_id: user.id,
                    user_tag: user.tag
                },
                success_url: 'https://example.com/success',
                cancel_url: 'https://example.com/cancel',
            });

            const invoiceId = session.metadata.invoiceId;

            database.invoices[invoiceId] = {
                id: invoiceId,
                userId: user.id,
                userTag: user.tag,
                amount: amountInCents,
                currency: currency.toUpperCase(),
                description: customDescription,
                status: 'unpaid',
                stripeSessionId: session.id,
                paymentUrl: session.url,
                createdBy: interaction.user.id,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            saveDatabase(database);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Invoice Created')
                .setDescription(`Invoice created successfully for ${user}`)
                .addFields(
                    { name: '🆔 Invoice ID', value: invoiceId, inline: true },
                    { name: '💰 Amount', value: `${(amountInCents / 100).toFixed(2)} ${currency.toUpperCase()}`, inline: true },
                    { name: '👤 User', value: user.tag, inline: true },
                    { name: '📝 Description', value: customDescription, inline: false },
                    { name: '🔗 Payment Link', value: `[Click here to pay](${session.url})`, inline: false },
                    { name: '📊 Status', value: '🟡 Unpaid', inline: true }
                )
                .setFooter({ text: 'Use /invoice view to see details' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            const publicEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('💳 New Invoice Created')
                .setDescription('Please visit the payment link below and complete your payment. Once payment is successful, send us the Order/Invoice ID along with a screenshot showing the payment went through for verification.')
                .addFields(
                    { name: 'ud83dudcb0 Amount Due', value: `**${(amountInCents / 100).toFixed(2)} ${currency.toUpperCase()}**`, inline: true },
                    { name: '👤 Customer', value: user.toString(), inline: true },
                    { name: '🔗 Payment', value: `[Click here to pay](${session.url})`, inline: false }
                )
                .setFooter({ text: `Invoice ID: ${invoiceId}` })
                .setTimestamp();

            await interaction.channel.send({ embeds: [publicEmbed] });

            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('💳 New Invoice')
                    .setDescription(`You have a new invoice from ${interaction.guild.name}`)
                    .addFields(
                        { name: '💰 Amount', value: `${(amountInCents / 100).toFixed(2)} ${currency.toUpperCase()}`, inline: true },
                        { name: '📝 Description', value: customDescription, inline: false },
                        { name: '🆔 Invoice ID', value: invoiceId, inline: false },
                        { name: '🔗 Pay Now', value: `[Click here to pay](${session.url})`, inline: false }
                    )
                    .setFooter({ text: 'Please complete payment at your earliest convenience' })
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not DM user:', error.message);
            }

        } catch (error) {
            console.error('Error creating invoice:', error);
            await interaction.editReply({
                content: `❌ Failed to create invoice: ${error.message}`
            });
        }
    },

    async updateStatus(interaction, database) {
        const transactionId = interaction.options.getString('transaction_id');
        const status = interaction.options.getString('status');
        const partialAmount = interaction.options.getNumber('partial_amount');

        if (!database.invoices || !database.invoices[transactionId]) {
            await interaction.reply({
                content: '❌ Invoice not found.',
                ephemeral: true
            });
            return;
        }

        const invoice = database.invoices[transactionId];

        if (status === 'partial' && !partialAmount) {
            await interaction.reply({
                content: '❌ You must specify the partial amount paid.',
                ephemeral: true
            });
            return;
        }

        if (status === 'partial' && partialAmount >= invoice.amount / 100) {
            await interaction.reply({
                content: '❌ Partial amount cannot be equal to or greater than the total amount. Use "paid" status instead.',
                ephemeral: true
            });
            return;
        }

        invoice.status = status;
        invoice.updatedAt = Date.now();
        invoice.updatedBy = interaction.user.id;

        if (status === 'partial') {
            invoice.partialAmount = Math.round(partialAmount * 100);
            invoice.remainingAmount = invoice.amount - invoice.partialAmount;
        } else if (status === 'paid') {
            invoice.paidAt = Date.now();
            delete invoice.partialAmount;
            delete invoice.remainingAmount;
        }

        saveDatabase(database);

        await this.logPaymentStatus(interaction, invoice, status);

        const statusEmoji = {
            paid: '✅',
            unpaid: '🟡',
            partial: '🟠',
            canceled: '❌'
        };

        const statusText = {
            paid: 'Paid',
            unpaid: 'Unpaid',
            partial: 'Partial Paid',
            canceled: 'Canceled'
        };

        const embed = new EmbedBuilder()
            .setColor(status === 'paid' ? '#00FF00' : status === 'partial' ? '#FF8800' : '#FFFF00')
            .setTitle('✅ Invoice Status Updated')
            .setDescription(`Invoice **${transactionId}** status updated`)
            .addFields(
                { name: '📊 New Status', value: `${statusEmoji[status]} ${statusText[status]}`, inline: true },
                { name: '💰 Amount', value: `${(invoice.amount / 100).toFixed(2)} ${invoice.currency}`, inline: true }
            );

        if (status === 'partial') {
            embed.addFields(
                { name: '💵 Paid Amount', value: `${partialAmount} ${invoice.currency}`, inline: true },
                { name: '💸 Remaining', value: `${(invoice.remainingAmount / 100).toFixed(2)} ${invoice.currency}`, inline: true }
            );
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        try {
            const user = await interaction.client.users.fetch(invoice.userId);
            const userEmbed = new EmbedBuilder()
                .setColor(status === 'paid' ? '#00FF00' : '#FF8800')
                .setTitle('💳 Invoice Status Update')
                .setDescription(`Your invoice **${transactionId}** has been updated`)
                .addFields(
                    { name: '📊 Status', value: `${statusEmoji[status]} ${statusText[status]}`, inline: false }
                )
                .setTimestamp();

            if (status === 'partial') {
                userEmbed.addFields(
                    { name: '💵 Paid', value: `${partialAmount} ${invoice.currency}`, inline: true },
                    { name: '💸 Remaining', value: `${(invoice.remainingAmount / 100).toFixed(2)} ${invoice.currency}`, inline: true }
                );
            }

            await user.send({ embeds: [userEmbed] });
        } catch (error) {
            console.log('Could not DM user:', error.message);
        }
    },

    async viewInvoice(interaction, database) {
        const transactionId = interaction.options.getString('transaction_id');

        if (!database.invoices || !database.invoices[transactionId]) {
            await interaction.reply({
                content: '❌ Invoice not found.',
                ephemeral: true
            });
            return;
        }

        const invoice = database.invoices[transactionId];

        const statusEmoji = {
            paid: '✅',
            unpaid: '🟡',
            partial: '🟠'
        };

        const statusText = {
            paid: 'Paid',
            unpaid: 'Unpaid',
            partial: 'Partial Paid'
        };

        const embed = new EmbedBuilder()
            .setColor(invoice.status === 'paid' ? '#00FF00' : invoice.status === 'partial' ? '#FF8800' : invoice.status === 'canceled' ? '#FF0000' : '#FFFF00')
            .setTitle('📄 Invoice Details')
            .setDescription(`Details for invoice **${transactionId}**`)
            .addFields(
                { name: '🆔 Invoice ID', value: invoice.id, inline: true },
                { name: '👤 User', value: `<@${invoice.userId}> (${invoice.userTag})`, inline: true },
                { name: '💰 Amount', value: `${(invoice.amount / 100).toFixed(2)} ${invoice.currency}`, inline: true },
                { name: '📝 Description', value: invoice.description, inline: false },
                { name: '📊 Status', value: `${statusEmoji[invoice.status]} ${statusText[invoice.status]}`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(invoice.createdAt / 1000)}:F>`, inline: false }
            );

        if (invoice.paymentUrl && invoice.status === 'unpaid') {
            embed.addFields(
                { name: '🔗 Payment Link', value: `[Click here to pay](${invoice.paymentUrl})`, inline: false }
            );
        }

        if (invoice.status === 'partial') {
            embed.addFields(
                { name: '💵 Paid Amount', value: `${(invoice.partialAmount / 100).toFixed(2)} ${invoice.currency}`, inline: true },
                { name: '💸 Remaining', value: `${(invoice.remainingAmount / 100).toFixed(2)} ${invoice.currency}`, inline: true }
            );
        }

        if (invoice.status === 'paid' && invoice.paidAt) {
            embed.addFields(
                { name: '✅ Paid At', value: `<t:${Math.floor(invoice.paidAt / 1000)}:F>`, inline: false }
            );
        }

        if (invoice.stripeSessionId) {
            embed.addFields(
                { name: '🔗 Stripe Session ID', value: invoice.stripeSessionId, inline: false }
            );
        }

        embed.setFooter({ text: `Created by ${interaction.guild.members.cache.get(invoice.createdBy)?.user.tag || 'Unknown'}` })
            .setTimestamp(invoice.updatedAt);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async listInvoices(interaction, database) {
        const statusFilter = interaction.options.getString('status');
        const userFilter = interaction.options.getUser('user');

        if (!database.invoices) database.invoices = {};

        let invoices = Object.values(database.invoices);

        if (statusFilter) {
            invoices = invoices.filter(inv => inv.status === statusFilter);
        }

        if (userFilter) {
            invoices = invoices.filter(inv => inv.userId === userFilter.id);
        }

        if (invoices.length === 0) {
            await interaction.reply({
                content: '❌ No invoices found with the specified filters.',
                ephemeral: true
            });
            return;
        }

        invoices.sort((a, b) => b.createdAt - a.createdAt);

        const statusEmoji = {
            paid: '✅',
            unpaid: '🟡',
            partial: '🟠'
        };

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📋 Invoice List')
            .setDescription(`Found ${invoices.length} invoice(s)`)
            .setTimestamp();

        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
        const partialInvoices = invoices.filter(inv => inv.status === 'partial');
        const canceledInvoices = invoices.filter(inv => inv.status === 'canceled');

        const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0) / 100;
        const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0) / 100;
        const totalPartial = partialInvoices.reduce((sum, inv) => sum + (inv.partialAmount || 0), 0) / 100;

        embed.addFields(
            { name: '✅ Paid', value: `${paidInvoices.length} invoices`, inline: true },
            { name: '🟡 Unpaid', value: `${unpaidInvoices.length} invoices`, inline: true },
            { name: '🟠 Partial', value: `${partialInvoices.length} invoices`, inline: true },
            { name: '❌ Canceled', value: `${canceledInvoices.length} invoices`, inline: true }
        );

        const invoiceList = invoices.slice(0, 15).map(inv => {
            let line = `${statusEmoji[inv.status]} **${inv.id}** - ${(inv.amount / 100).toFixed(2)} ${inv.currency} - <@${inv.userId}>`;
            if (inv.status === 'partial') {
                line += ` (${(inv.partialAmount / 100).toFixed(2)}/${(inv.amount / 100).toFixed(2)} paid)`;
            }
            return line;
        }).join('\n');

        if (invoiceList) {
            embed.addFields({ name: '📄 Recent Invoices', value: invoiceList, inline: false });
        }

        if (invoices.length > 15) {
            embed.setFooter({ text: `Showing 15 of ${invoices.length} invoices` });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async logPaymentStatus(interaction, invoice, status) {
        const logChannelId = '1508754578399690874';
        
        try {
            const logChannel = await interaction.client.channels.fetch(logChannelId);
            if (!logChannel) return;

            const statusColors = {
                paid: '#00FF00',
                canceled: '#FF0000',
                unpaid: '#FFA500'
            };

            const statusEmojis = {
                paid: '✅',
                canceled: '❌',
                unpaid: '⚠️'
            };

            if (status === 'paid' || status === 'canceled') {
                const logEmbed = new EmbedBuilder()
                    .setColor(statusColors[status])
                    .setTitle(`${statusEmojis[status]} Payment ${status === 'paid' ? 'Successful' : 'Canceled'}`)
                    .addFields(
                        { name: '🆔 Invoice ID', value: invoice.id, inline: true },
                        { name: '👤 Customer', value: `<@${invoice.userId}>`, inline: true },
                        { name: '💰 Amount', value: `${(invoice.amount / 100).toFixed(2)} ${invoice.currency}`, inline: true },
                        { name: '📝 Description', value: invoice.description.substring(0, 100), inline: false },
                        { name: '📊 Status', value: status === 'paid' ? '✅ Paid' : '❌ Canceled', inline: true },
                        { name: '👤 Updated By', value: `<@${invoice.updatedBy}>`, inline: true }
                    )
                    .setTimestamp();

                if (status === 'paid' && invoice.paidAt) {
                    logEmbed.addFields({ name: '⏰ Paid At', value: `<t:${Math.floor(invoice.paidAt / 1000)}:F>`, inline: false });
                }

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Error logging payment status:', error);
        }
    }
};

function saveDatabase(data) {
    const dbPath = path.join(__dirname, '..', 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}