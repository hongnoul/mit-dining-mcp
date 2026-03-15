# Google Calendar Sync for MIT Dining

Fetches 7 days of MIT dining hall menus and creates Google Calendar events for each meal period (breakfast, lunch, dinner), with station names and menu items in the event description.

## Prerequisites

1. A **Google Cloud project** with the **Google Calendar API** enabled.
2. A **service account** in that project.
3. A Google Calendar you want to populate with dining events.

## Setup

### 1. Create a service account

1. Go to [Google Cloud Console > IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Click **Create Service Account**, give it a name (e.g. `mit-dining-sync`), and click **Done**.
3. On the service account's page, go to the **Keys** tab, click **Add Key > Create new key**, choose **JSON**, and download the file.
4. Save the JSON key file somewhere secure (e.g. `./service-account.json` in this directory). Do not commit it to version control.

### 2. Enable the Calendar API

1. Go to [Google Cloud Console > APIs & Services > Library](https://console.cloud.google.com/apis/library).
2. Search for **Google Calendar API** and click **Enable**.

### 3. Share your calendar with the service account

1. Open [Google Calendar](https://calendar.google.com) in a browser.
2. Find or create the calendar you want to use. Go to its **Settings**.
3. Under **Share with specific people or groups**, add the service account's email address (it looks like `name@project-id.iam.gserviceaccount.com`).
4. Set the permission to **Make changes to events**.
5. Copy the **Calendar ID** from the settings page (it looks like `abc123@group.calendar.google.com`).

### 4. Set environment variables

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json
export GOOGLE_CALENDAR_ID=abc123@group.calendar.google.com
```

## Install dependencies

```bash
bun install
```

## Usage

```bash
bun run sync.ts maseeh
```

Valid hall keys: `baker`, `maseeh`, `mccormick`, `new-vassar`, `next-house`, `simmons`.

The script fetches the next 7 days of menus and creates or updates calendar events for each meal. Events are idempotent -- running the script again will update existing events rather than creating duplicates.

## Automate with cron

To sync every morning at 6 AM:

```
0 6 * * * cd /path/to/examples/gcal-sync && GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json GOOGLE_CALENDAR_ID=your-cal-id bun run sync.ts maseeh
```

## What the events look like

Each event appears on your calendar with:

- **Title**: "Lunch at The Howard Dining Hall at Maseeh"
- **Time**: the meal period's start and end time (e.g. 11:30 AM -- 2:00 PM)
- **Location**: the dining hall name
- **Description**: station names with their menu items, formatted as plain text:

```
--- Entree ---
  Grilled Chicken Breast  (Halal)
  Pasta Primavera  (Vegetarian)

--- Grill ---
  Cheeseburger
  Veggie Burger  (Vegan)

--- Salad Bar ---
  Mixed Greens  (Vegan)
  Caesar Salad  (Vegetarian)

Synced by mit-dining-mcp/examples/gcal-sync
```
