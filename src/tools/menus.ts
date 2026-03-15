import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchCafeMenu, fetchAllHallMenus } from "../scraper.js";
import { HALLS, DIET_FILTERS, DIET_TO_COR_ID } from "../constants.js";
import type { CafeMenu, MenuItem } from "../types.js";

const hallEnum = z
  .enum(Object.keys(HALLS) as [string, ...string[]])
  .describe("Dining hall key: baker, maseeh, mccormick, new-vassar, next-house, simmons");

const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("Date in YYYY-MM-DD format (defaults to today)");

function formatMenu(menu: CafeMenu): string {
  const lines: string[] = [`## ${menu.hallName} — ${menu.date}`];

  if (menu.dayparts.length === 0) {
    lines.push("*No meals available (hall may be closed)*");
    return lines.join("\n");
  }

  for (const dp of menu.dayparts) {
    lines.push(`\n### ${dp.label} (${dp.startTime} – ${dp.endTime})`);
    for (const station of dp.stations) {
      lines.push(`\n**${station.name}**`);
      for (const item of station.items) {
        const tags = [...item.diets].map((d) => `[${d}]`).join(" ");
        lines.push(`- ${item.label}${tags ? " " + tags : ""}`);
      }
    }
  }

  return lines.join("\n");
}

function filterItemsByDiet(
  menu: CafeMenu,
  diet: string
): { daypart: string; station: string; item: MenuItem }[] {
  const results: { daypart: string; station: string; item: MenuItem }[] = [];

  for (const dp of menu.dayparts) {
    for (const station of dp.stations) {
      for (const item of station.items) {
        let matches = false;

        if (diet === "gluten-free") {
          // Gluten-free = item does NOT have Wheat/Gluten allergen
          matches = !item.allergens.includes("Wheat/Gluten");
        } else {
          const corId = DIET_TO_COR_ID[diet];
          if (corId) {
            const label =
              diet === "vegetarian"
                ? "Vegetarian"
                : diet === "vegan"
                  ? "Vegan"
                  : diet === "halal"
                    ? "Halal"
                    : "Kosher";
            matches = item.diets.includes(label);
          }
        }

        if (matches) {
          results.push({ daypart: dp.label, station: station.name, item });
        }
      }
    }
  }

  return results;
}

export function registerMenuTools(server: McpServer) {
  server.tool(
    "get_todays_menus",
    "Get today's menus across all 6 MIT dining halls",
    {},
    async () => {
      const menus = await fetchAllHallMenus();
      const text = menus.map(formatMenu).join("\n\n---\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_hall_menu",
    "Get the menu for a specific MIT dining hall, optionally on a specific date",
    {
      hall: hallEnum,
      date: dateParam,
    },
    async ({ hall, date }) => {
      const menu = await fetchCafeMenu(hall, date);
      return { content: [{ type: "text", text: formatMenu(menu) }] };
    }
  );

  server.tool(
    "get_weekly_menus",
    "Get the next 7 days of menus for a specific MIT dining hall",
    {
      hall: hallEnum,
    },
    async ({ hall }) => {
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }

      const results = await Promise.allSettled(
        dates.map((date) => fetchCafeMenu(hall, date))
      );

      const menus = results
        .filter(
          (r): r is PromiseFulfilledResult<CafeMenu> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value);

      const text = menus.map(formatMenu).join("\n\n---\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "filter_menus_by_diet",
    "Filter MIT dining menus by dietary preference (vegetarian, vegan, halal, kosher, gluten-free)",
    {
      diet: z
        .enum(DIET_FILTERS)
        .describe("Dietary filter to apply"),
      hall: hallEnum.optional().describe("Optional: limit to a specific hall"),
      date: dateParam,
    },
    async ({ diet, hall, date }) => {
      let menus: CafeMenu[];
      if (hall) {
        menus = [await fetchCafeMenu(hall, date)];
      } else {
        menus = await fetchAllHallMenus(date);
      }

      const lines: string[] = [
        `# ${diet.charAt(0).toUpperCase() + diet.slice(1)} Options${hall ? ` at ${menus[0]?.hallName}` : ""} — ${date || new Date().toISOString().slice(0, 10)}`,
      ];

      for (const menu of menus) {
        const filtered = filterItemsByDiet(menu, diet);
        if (filtered.length === 0) continue;

        lines.push(`\n## ${menu.hallName}`);

        // Group by daypart
        const byDaypart = new Map<string, typeof filtered>();
        for (const entry of filtered) {
          const existing = byDaypart.get(entry.daypart) ?? [];
          existing.push(entry);
          byDaypart.set(entry.daypart, existing);
        }

        for (const [daypart, entries] of byDaypart) {
          lines.push(`\n### ${daypart}`);
          for (const entry of entries) {
            const tags = entry.item.diets.map((d) => `[${d}]`).join(" ");
            lines.push(`- ${entry.item.label} *(${entry.station})*${tags ? " " + tags : ""}`);
          }
        }
      }

      if (lines.length === 1) {
        lines.push(`\nNo ${diet} options found.`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}
