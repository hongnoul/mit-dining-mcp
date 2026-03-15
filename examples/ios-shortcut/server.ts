import { fetchCafeMenu, fetchAllHallMenus } from "../../src/scraper.js";
import { HALLS, HALL_NAMES, DIET_FILTERS } from "../../src/constants.js";
import type { CafeMenu, DaypartMenu, StationMenu, MenuItem } from "../../src/types.js";

const PORT = Number(process.env.PORT) || 3456;

/**
 * Stations to skip in the Siri-friendly summary.
 * These are noise for a quick "what's for dinner" answer.
 */
const SKIP_STATIONS = new Set([
  "condiments",
  "beverages",
  "desserts",
  "dessert",
  "toppings",
  "ice cream",
  "cereal",
  "bread",
  "bakery",
  "salad bar",
  "fruit",
  "snacks",
]);

function shouldSkipStation(name: string): boolean {
  const lower = name.toLowerCase().trim();
  for (const skip of SKIP_STATIONS) {
    if (lower.includes(skip)) return true;
  }
  return false;
}

/** Pick the best matching daypart label for a meal name */
function findDaypart(menu: CafeMenu, meal: string): DaypartMenu | undefined {
  const lower = meal.toLowerCase();
  return menu.dayparts.find((dp) => dp.label.toLowerCase() === lower);
}

/** Guess current meal based on time of day */
function currentMeal(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Breakfast";
  if (hour < 15) return "Lunch";
  return "Dinner";
}

/** Format a single hall + daypart into a short Siri-friendly sentence */
function summarizeHallMeal(menu: CafeMenu, daypart: DaypartMenu): string {
  const stationSummaries: string[] = [];

  for (const station of daypart.stations) {
    if (shouldSkipStation(station.name)) continue;
    if (station.items.length === 0) continue;

    // Take the top 2-3 items per station to keep it brief
    const highlights = station.items.slice(0, 3).map((i) => i.label);
    stationSummaries.push(`${station.name} has ${highlights.join(" and ")}`);
  }

  if (stationSummaries.length === 0) {
    return `${menu.hallName}: No entrees listed right now.`;
  }

  return `${menu.hallName}: ${stationSummaries.join(". ")}.`;
}

/** Filter items by dietary preference */
function filterByDiet(items: MenuItem[], diet: string): MenuItem[] {
  const lower = diet.toLowerCase();
  if (lower === "gluten-free") {
    // Gluten-free means no Wheat/Gluten allergen
    return items.filter((i) => !i.allergens.some((a) => a.toLowerCase().includes("wheat") || a.toLowerCase().includes("gluten")));
  }
  return items.filter((i) =>
    i.diets.some((d) => d.toLowerCase() === lower)
  );
}

// ─── Routes ────────────────────────────────────────────────────────────

Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    try {
      // ── GET /dinner ───────────────────────────────────────────────
      if (url.pathname === "/dinner") {
        const hallParam = url.searchParams.get("hall");

        if (hallParam) {
          const menu = await fetchCafeMenu(hallParam);
          const dinner = findDaypart(menu, "Dinner");
          if (!dinner) {
            return text(`No dinner menu found at ${menu.hallName} today.`);
          }
          return text(`Dinner at ${menu.hallName} tonight. ${summarizeHallMeal(menu, dinner)}`);
        }

        // All halls
        const menus = await fetchAllHallMenus();
        const lines: string[] = [];
        for (const menu of menus) {
          const dinner = findDaypart(menu, "Dinner");
          if (!dinner) continue;
          lines.push(summarizeHallMeal(menu, dinner));
        }

        if (lines.length === 0) {
          return text("No dinner menus found at MIT dining halls tonight.");
        }

        return text(`Here's dinner at MIT tonight.\n\n${lines.join("\n\n")}`);
      }

      // ── GET /menu ─────────────────────────────────────────────────
      if (url.pathname === "/menu") {
        const hall = url.searchParams.get("hall");
        const meal = url.searchParams.get("meal") || currentMeal();
        const date = url.searchParams.get("date") || undefined;

        if (!hall) {
          return text("Please specify a hall, for example: /menu?hall=maseeh&meal=lunch", 400);
        }

        const menu = await fetchCafeMenu(hall, date);
        const daypart = findDaypart(menu, meal);

        if (!daypart) {
          const available = menu.dayparts.map((d) => d.label).join(", ");
          return text(`No ${meal} menu at ${menu.hallName}. Available meals: ${available || "none"}.`);
        }

        return text(`${meal} at ${menu.hallName} on ${menu.date}.\n\n${summarizeHallMeal(menu, daypart)}`);
      }

      // ── GET /diet ─────────────────────────────────────────────────
      if (url.pathname === "/diet") {
        const diet = url.searchParams.get("diet");
        const hallParam = url.searchParams.get("hall");
        const meal = url.searchParams.get("meal") || currentMeal();

        if (!diet) {
          return text(`Please specify a diet. Options: ${DIET_FILTERS.join(", ")}`, 400);
        }

        const menus = hallParam
          ? [await fetchCafeMenu(hallParam)]
          : await fetchAllHallMenus();

        const lines: string[] = [];

        for (const menu of menus) {
          const daypart = findDaypart(menu, meal);
          if (!daypart) continue;

          const matchingItems: string[] = [];
          for (const station of daypart.stations) {
            if (shouldSkipStation(station.name)) continue;
            const filtered = filterByDiet(station.items, diet);
            for (const item of filtered) {
              matchingItems.push(`${item.label} at ${station.name}`);
            }
          }

          if (matchingItems.length > 0) {
            // Keep it concise: max 5 items per hall
            const shown = matchingItems.slice(0, 5);
            const suffix = matchingItems.length > 5 ? `, and ${matchingItems.length - 5} more` : "";
            lines.push(`${menu.hallName}: ${shown.join(", ")}${suffix}.`);
          }
        }

        if (lines.length === 0) {
          return text(`No ${diet} options found for ${meal} right now.`);
        }

        return text(`${diet} options for ${meal} at MIT.\n\n${lines.join("\n\n")}`);
      }

      // ── Fallback ──────────────────────────────────────────────────
      return text(
        [
          "MIT Dining Shortcut Server",
          "",
          "Routes:",
          "  /dinner           - Tonight's dinner at all halls",
          "  /dinner?hall=maseeh - Dinner at a specific hall",
          "  /menu?hall=maseeh&meal=lunch&date=2026-03-15",
          "  /diet?diet=vegan&hall=maseeh",
          "",
          `Valid halls: ${Object.keys(HALLS).join(", ")}`,
          `Valid diets: ${DIET_FILTERS.join(", ")}`,
        ].join("\n")
      );
    } catch (err: any) {
      return text(`Sorry, something went wrong: ${err.message}`, 500);
    }
  },
});

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

console.log(`MIT Dining Shortcut server running on http://localhost:${PORT}`);
