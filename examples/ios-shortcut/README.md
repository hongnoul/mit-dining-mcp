# iOS Shortcut: "What's for dinner at MIT?"

A tiny HTTP server that an iOS Shortcut can call to get MIT dining menus. Siri reads the response aloud.

## Running the server

```sh
cd examples/ios-shortcut
bun run server.ts
```

The server starts on port 3456 by default. Set the `PORT` env var to change it:

```sh
PORT=8080 bun run server.ts
```

## API routes

| Route | Description |
|---|---|
| `GET /dinner` | Tonight's dinner at all halls |
| `GET /dinner?hall=maseeh` | Dinner at a specific hall |
| `GET /menu?hall=maseeh&meal=lunch` | Specific meal at a hall |
| `GET /menu?hall=maseeh&meal=lunch&date=2026-03-15` | Specific date |
| `GET /diet?diet=vegan` | Vegan options across all halls |
| `GET /diet?diet=vegan&hall=maseeh` | Vegan options at one hall |

Valid halls: `baker`, `maseeh`, `mccormick`, `new-vassar`, `next-house`, `simmons`

Valid diets: `vegetarian`, `vegan`, `halal`, `kosher`, `gluten-free`

## Exposing the server to your phone

The server runs on your local machine. To reach it from your iPhone, you have two options:

**Option A: Tailscale (recommended)**
1. Install Tailscale on your Mac/PC and your iPhone.
2. Both devices join the same tailnet.
3. Use your machine's Tailscale IP, e.g. `http://100.x.y.z:3456/dinner`.

**Option B: ngrok**
1. Install ngrok: `brew install ngrok`
2. Run: `ngrok http 3456`
3. Copy the `https://xxxx.ngrok-free.app` URL.
4. Use that URL in your Shortcut, e.g. `https://xxxx.ngrok-free.app/dinner`.

## Creating the iOS Shortcut

1. Open the **Shortcuts** app on your iPhone.
2. Tap **+** to create a new Shortcut.
3. Tap **Add Action** and search for **"Get Contents of URL"**.
4. Set the URL to your server address, for example:
   - `http://100.x.y.z:3456/dinner` (Tailscale)
   - `https://xxxx.ngrok-free.app/dinner` (ngrok)
5. Add another action: search for **"Speak Text"** (or **"Show Result"** if you just want to read it).
6. Set it to speak/show the output from the previous step.
7. Tap the name at the top and rename it to something like **"MIT Dinner"**.

### Optional: Add a Siri phrase

1. Tap the **ⓘ** icon on your Shortcut.
2. Tap **Add to Siri**.
3. Record a phrase like **"What's for dinner at MIT?"**

Now you can say: **"Hey Siri, what's for dinner at MIT?"** and hear tonight's menu.

### Optional: Add to Home Screen

1. Tap the **ⓘ** icon on your Shortcut.
2. Tap **Add to Home Screen**.
3. Pick an icon and tap **Add**.

## Example responses

**`/dinner?hall=maseeh`**
```
Dinner at The Howard Dining Hall at Maseeh tonight. The Howard Dining Hall at Maseeh: Grill has Burgers and Grilled Chicken. Comfort has Pasta Pie and Mac and Cheese. Taj has Masala Chicken. Plant-Forward has Chipotle Lime Tofu.
```

**`/diet?diet=vegan&hall=simmons`**
```
vegan options for Dinner at MIT.

Simmons Dining: Chipotle Lime Tofu at Plant-Forward, Rice Bowl at Global.
```

## Advanced: Multiple shortcuts

You can create separate shortcuts for different queries:

- **"MIT Lunch"** → `/menu?hall=maseeh&meal=lunch`
- **"Vegan dinner"** → `/diet?diet=vegan`
- **"What's at Baker"** → `/dinner?hall=baker`

Each one is just a different URL in the "Get Contents of URL" action.
