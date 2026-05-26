# Stripe Webhook Setup Guide

This bot uses Stripe webhooks to automatically detect payment status changes. Follow these steps to set up webhooks:

## Prerequisites
- Stripe account with API keys
- A server with a public IP address
- Port forwarding configured (default port: 3000)

## Environment Variables

Add these to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
WEBHOOK_PORT=3000
```

## Setting Up the Webhook Endpoint

### 1. Start Your Bot
The bot will automatically start a webhook server on the configured port (default: 3000).

You should see:
```
Webhook server listening on port 3000
Bot is ready! Logged in as YourBot#1234
```

### 2. Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL: `http://YOUR_IP:3000/webhook` or `https://yourdomain.com/webhook`
4. Select the following events to listen to:
   - `checkout.session.completed` (Payment successful)
   - `checkout.session.expired` (Session expired without payment)
   - `payment_intent.payment_failed` (Payment failed)
5. Click **"Add endpoint"**

### 3. Get Your Webhook Secret

1. After creating the endpoint, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`
5. Restart your bot

## How It Works

When a payment event occurs:

1. Stripe sends a webhook event to your server
2. The bot verifies the signature using your webhook secret
3. The invoice status is automatically updated in the database
4. Notifications are sent to:
   - **Log Channel** (ID: `1508754578399690874`)
   - **Customer** (via DM)

## Supported Events

| Event | Description | Invoice Status |
|-------|-------------|----------------|
| `checkout.session.completed` | Payment successful | `paid` |
| `checkout.session.expired` | Session expired without payment | `canceled` |
| `payment_intent.payment_failed` | Payment attempt failed | `canceled` |

## Testing Webhooks

### Using Stripe CLI (Recommended for Development)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/webhook
   ```
4. Copy the webhook signing secret shown in the terminal
5. Update your `.env` with this secret
6. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Testing in Production

1. Create a test invoice using `/invoice create`
2. Click the payment link
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
4. Complete or cancel the payment
5. Check the log channel for automatic updates

## Troubleshooting

### Webhook Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches the one from Stripe Dashboard
- Check that you've restarted the bot after updating `.env`

### No Events Received
- Verify your server's IP/domain is accessible from the internet
- Check firewall/port forwarding settings
- Ensure the webhook endpoint URL is correct in Stripe Dashboard

### Invoice Not Found
- The invoice ID is passed via `metadata.invoiceId` in the checkout session
- Ensure older invoices created before webhook setup include this metadata

## Security Notes

- Always use HTTPS in production (use a reverse proxy like Nginx)
- Never expose your webhook secret
- Webhook signature verification is mandatory (already implemented)
- The bot only processes events with valid signatures

## Support

For issues:
1. Check bot logs for error messages
2. Verify Stripe webhook logs in Dashboard
3. Test with Stripe CLI for debugging