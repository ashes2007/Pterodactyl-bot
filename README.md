# Pterodactyl Bot Manager

A Discord bot that automates deployment and management of custom Discord bots using Pterodactyl panel.

## Features

### Bot Management
- `/add` - Create new bot instances with automatic GitHub deployment
- `/remove` - Suspend and schedule bot deletion (or delete immediately)
- `/cancel` - Cancel scheduled deletion and restart suspended bots
- `/list` - View all active bot deployments
- `/start` - Start a stopped bot instance
- `/stop` - Stop a running bot instance
- `/restart` - Restart a bot instance
- `/power` - Interactive control panel with Start/Stop/Restart buttons
- `/mass-restart` - Restart all active bots at once (with confirmation)
- `/faq` - View frequently asked questions

### Giveaway System
- `/giveaway start` - Create a new giveaway with prize, duration, winner count, and channel
  - Optional role requirements
  - Optional account age requirements
  - Optional server age requirements
  - Bonus entries for server boosters
- `/giveaway end` - Manually end a giveaway early
- `/giveaway reroll [winners]` - Reroll the giveaway to pick new winners (optional: specify how many)
- `/giveaway list [filter]` - View all active/ended/paused giveaways
- `/giveaway pause` - Pause an active giveaway (with confirmation)
- `/giveaway resume` - Resume a paused giveaway
- `/giveaway edit` - Edit giveaway details (prize, duration, winners, requirements)
- `/giveaway participants` - View all participants in a giveaway
- `/giveaway delete` - Permanently delete a giveaway (with confirmation)
- `/giveaway stats` - View overall giveaway statistics
- `/giveaway drop` - Create an instant drop giveaway (first X people to click win)
- `/giveaway announce` - Repost/announce a giveaway in a different channel
- `/giveaway history [limit]` - View detailed history of past giveaways
- `/giveaway requirements` - Set role, account age, and server age requirements
- `/giveaway bonus [entries]` - Set bonus entries for server boosters
- `/giveaway blacklist` - Blacklist a user from entering giveaways
- `/giveaway unblacklist` - Remove a user from the blacklist
- Button-based entry system for users
- Automatic entry validation (requirements, blacklist, duplicates)
- Drop giveaway support (instant winners)

### Invoice & Payment Management
- `/invoice create` - Create new invoices with Stripe integration (USD/GBP support)
- `/invoice status` - Update invoice payment status (paid/unpaid/partial)
- `/invoice view` - View detailed invoice information
- `/invoice list` - List all invoices with optional filters (status, user)
- Automatic Stripe payment intent creation
- Transaction history tracking

### Security
- **Admin-only commands** - Only Discord users listed in `admins.conf` can use management commands
- **Confirmation prompts** - Dangerous actions like mass-restart and delete require confirmation
- Permission validation on all critical operations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```env
DISCORD_TOKEN=your_bot_token_here
PTERODACTYL_URL=https://panel.yourdomain.com
PTERODACTYL_API_KEY=your_pterodactyl_api_key
GITHUB_TOKEN=your_github_token_here
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

3. Create `admins.conf` with Discord user IDs (one per line):
```
123456789012345678
987654321098765432
```

4. Start the bot:
```bash
npm start
```

## Requirements

- Node.js 16+
- Pterodactyl Panel with API access
- Discord bot with application commands enabled
- Stripe account (for invoice/payment features)

## Database Structure

The bot uses `database.json` to store:
- `servers` - All deployed bot instances
- `queue` - Pending bot deployments
- `giveaways` - Active and past giveaways with full entry data
- `invoices` - Payment transactions and invoices
- `giveawayBlacklist` - Users blacklisted from entering giveaways

## Scheduled Tasks

- **Every 30 minutes** - Check for suspended servers to delete
- **Every minute** - Check for giveaways that need to be ended

## Command Permissions

All management commands require admin permissions. Add Discord user IDs to `admins.conf`:
```
123456789012345678
987654321098765432
```