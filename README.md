# Pterodactyl Bot Manager

A Discord bot that automates deployment and management of custom Discord bots using Pterodactyl panel.

## Features

- `/add` - Create new bot instances with automatic GitHub deployment
- `/remove` - Suspend and schedule bot deletion
- `/list` - View all active bot deployments

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
```

3. Start the bot:
```bash
npm start
```

## Requirements

- Node.js 16+
- Pterodactyl Panel with API access
- Discord bot with application commands enabled