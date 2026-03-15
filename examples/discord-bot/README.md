# MIT Dining Discord Bot

A Discord bot that serves MIT dining hall menus via slash commands, powered by the `mit-dining-mcp` scraper.

## Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Go to **Bot** → copy the token
3. Go to **OAuth2** → URL Generator → select `bot` + `applications.commands` scopes → invite to your server

4. Set environment variables:
```bash
export DISCORD_TOKEN="your-bot-token"
export DISCORD_CLIENT_ID="your-application-id"
```

5. Install and run:
```bash
cd examples/discord-bot
bun install
bun run index.ts
```

## Commands

| Command | Description |
|---------|-------------|
| `/dinner` | Tonight's dinner highlights across all halls |
| `/dinner hall:maseeh` | Dinner at a specific hall |
| `/menu hall:simmons` | Full menu for a hall |
| `/menu hall:baker date:2026-03-17 meal:lunch` | Specific meal on a specific date |
| `/diet diet:vegan` | Vegan options across all halls |
| `/diet diet:gluten-free hall:mccormick` | Gluten-free at a specific hall |
