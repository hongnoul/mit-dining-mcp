/**
 * Google Calendar sync for MIT Dining menus.
 *
 * Fetches 7 days of menus for a given dining hall and creates/updates
 * Google Calendar events for each meal period.
 *
 * Usage:
 *   GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json \
 *   GOOGLE_CALENDAR_ID=abc123@group.calendar.google.com \
 *   bun run sync.ts maseeh
 */

import { google } from "googleapis";
import { fetchCafeMenu } from "../../src/scraper.js";
import { HALLS, HALL_NAMES } from "../../src/constants.js";
import type { CafeMenu, DaypartMenu, StationMenu } from "../../src/types.js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const hallArg = process.argv[2];
if (!hallArg || !HALLS[hallArg]) {
  console.error(
    `Usage: bun run sync.ts <hall>\nValid halls: ${Object.keys(HALLS).join(", ")}`
  );
  process.exit(1);
}
const hallKey: string = hallArg;
const hallName: string = HALL_NAMES[hallKey] ?? hallKey;

const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const calendarId = process.env.GOOGLE_CALENDAR_ID;

if (!keyPath) {
  console.error("Missing GOOGLE_SERVICE_ACCOUNT_KEY env var (path to service account JSON)");
  process.exit(1);
}
if (!calendarId) {
  console.error("Missing GOOGLE_CALENDAR_ID env var");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const keyFile = JSON.parse(readFileSync(keyPath, "utf-8"));

const auth = new google.auth.GoogleAuth({
  credentials: keyFile,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a deterministic event ID from hall + date + daypart label.
 *  Google Calendar event IDs must be 5-1024 chars, lowercase a-v and 0-9. */
function makeEventId(hall: string, date: string, daypart: string): string {
  const raw = `${hall}:${date}:${daypart}`;
  // SHA-256 hex, then replace any chars outside [a-v0-9] with base-32-ish encoding
  const hash = createHash("sha256").update(raw).digest("hex");
  // Hex uses 0-9a-f which is a subset of the allowed charset, so it's valid as-is.
  return hash.slice(0, 64);
}

/** Format a daypart's stations into a readable plain-text description. */
function formatDescription(daypart: DaypartMenu): string {
  const lines: string[] = [];

  for (const station of daypart.stations) {
    lines.push(`--- ${station.name} ---`);
    for (const item of station.items.slice(0, 12)) {
      const tags: string[] = [];
      if (item.diets.length > 0) tags.push(item.diets.join(", "));
      const suffix = tags.length > 0 ? `  (${tags.join("; ")})` : "";
      lines.push(`  ${item.label}${suffix}`);
    }
    if (station.items.length > 12) {
      lines.push(`  ... and ${station.items.length - 12} more`);
    }
    lines.push("");
  }

  lines.push("Synced by mit-dining-mcp/examples/gcal-sync");
  return lines.join("\n");
}

/** Parse a time string like "7:30 AM" or "5:00 PM" and combine with a date
 *  string "YYYY-MM-DD" to produce an ISO 8601 datetime in America/New_York. */
function toDateTimeObject(date: string, timeStr: string) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    // Fallback: return just the date (all-day style) — shouldn't happen
    return { date };
  }

  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  const ampm = match[3]!.toUpperCase();

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");

  return {
    dateTime: `${date}T${hh}:${mm}:00`,
    timeZone: "America/New_York",
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function syncDay(date: string): Promise<number> {
  let menu: CafeMenu;
  try {
    menu = await fetchCafeMenu(hallKey, date);
  } catch (err: any) {
    console.warn(`  Skipping ${date}: ${err.message}`);
    return 0;
  }

  let synced = 0;

  for (const daypart of menu.dayparts) {
    if (daypart.stations.length === 0) continue;

    const eventId = makeEventId(hallKey, date, daypart.label);
    const title = `${daypart.label} at ${hallName}`;
    const description = formatDescription(daypart);

    const start = toDateTimeObject(date, daypart.startTime);
    const end = toDateTimeObject(date, daypart.endTime);

    const eventBody = {
      summary: title,
      location: hallName,
      description,
      start,
      end,
    };

    try {
      // Try to update an existing event first (idempotent)
      await calendar.events.update({
        calendarId,
        eventId,
        requestBody: { id: eventId, ...eventBody },
      });
      console.log(`  Updated: ${title} (${date})`);
    } catch (err: any) {
      if (err.code === 404) {
        // Event doesn't exist yet — create it
        await calendar.events.insert({
          calendarId,
          requestBody: { id: eventId, ...eventBody },
        });
        console.log(`  Created: ${title} (${date})`);
      } else {
        console.error(`  Failed: ${title} (${date}) — ${err.message}`);
      }
    }

    synced++;
  }

  return synced;
}

async function main() {
  console.log(`Syncing ${hallName} menus to Google Calendar...`);
  console.log(`Calendar: ${calendarId}\n`);

  const today = new Date();
  let totalSynced = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    console.log(`Day ${i + 1}: ${dateStr}`);
    totalSynced += await syncDay(dateStr);
  }

  console.log(`\nDone. Synced ${totalSynced} meal events.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
