# mit-dining-mcp

An [MCP server](https://modelcontextprotocol.io) that provides real-time MIT dining hall menus from all 6 Bon Appétit locations. Ask Claude what's for dinner, filter by dietary needs, plan your meals for the week, or whether if the menus are mid.

[![Demo](https://asciinema.org/a/yQV3A6ai2U4tvSTu.svg)](https://asciinema.org/a/yQV3A6ai2U4tvSTu)

## Install

Pick whichever runtime you have:

**Bun**
```bash
claude mcp add mit-dining -- bunx mit-dining-mcp
```

**Node.js**
```bash
claude mcp add mit-dining -- npx mit-dining-mcp
```

**Deno**
```bash
claude mcp add mit-dining -- deno run -A npm:mit-dining-mcp
```

### From source

```bash
git clone https://github.com/hongnoul/mit-dining-mcp.git
cd mit-dining-mcp
npm install  # or bun install
claude mcp add mit-dining -- npx tsx src/index.ts
```

## Tools

| Tool | Description | Example prompt |
|------|-------------|----------------|
| `get_todays_menus` | All 6 halls, today's menus | "What's for dinner at MIT tonight?" |
| `get_hall_menu` | Single hall, optional date | "What's on the menu at Maseeh tomorrow?" |
| `get_weekly_menus` | 7-day lookahead for one hall | "What's the menu at Simmons this week?" |
| `filter_menus_by_diet` | Filter by dietary preference | "Find vegan options at Next House" |

### Parameters

**`get_hall_menu`**
- `hall` (required): `baker`, `maseeh`, `mccormick`, `new-vassar`, `next-house`, `simmons`
- `date` (optional): `YYYY-MM-DD` format

**`get_weekly_menus`**
- `hall` (required): same as above

**`filter_menus_by_diet`**
- `diet` (required): `vegetarian`, `vegan`, `halal`, `kosher`, `gluten-free`
- `hall` (optional): limit to one hall
- `date` (optional): `YYYY-MM-DD` format

## Dining halls

| Key | Name |
|-----|------|
| `baker` | Baker Dining |
| `maseeh` | The Howard Dining Hall at Maseeh |
| `mccormick` | McCormick Dining |
| `new-vassar` | New Vassar Dining |
| `next-house` | Next Dining |
| `simmons` | Simmons Dining |

## How it works

MIT's dining is run by Bon Appétit, whose website embeds structured menu data (`Bamco.menu_items` and `Bamco.dayparts`) as JSON in `<script>` tags. This server scrapes and parses that data — no API key needed.

Menus are cached in-memory for 1 hour to avoid repeated requests.

## Requirements

One of:
- [Node.js](https://nodejs.org) 18+
- [Bun](https://bun.sh)
- [Deno](https://deno.land) 2+

## License

MIT
