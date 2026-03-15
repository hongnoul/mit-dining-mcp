import { BASE_URL, COR_ICONS, HALLS, HALL_NAMES } from "./constants.js";
import { TTLCache } from "./cache.js";
import type {
  CafeMenu,
  DaypartMenu,
  MenuItem,
  RawDaypart,
  RawMenuItem,
  StationMenu,
} from "./types.js";

const cache = new TTLCache<CafeMenu>(60);

/** Extract a balanced JSON object starting at `{` from position `start` in `text` */
function extractJsonObject(text: string, start: number): string | null {
  if (text[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseMenuItem(raw: RawMenuItem): MenuItem {
  const diets: string[] = [];
  const allergens: string[] = [];

  for (const [id, _label] of Object.entries(raw.cor_icon ?? {})) {
    const icon = COR_ICONS[id];
    if (icon?.type === "diet") diets.push(icon.label);
    else if (icon?.type === "allergen") allergens.push(icon.label);
  }

  const nd = raw.nutrition_details;

  return {
    id: raw.id,
    label: raw.label,
    description: raw.description || "",
    station: (raw.station || "").replace(/<[^>]*>/g, "").replace(/^@/, ""),
    ingredients: raw.ingredients || "",
    diets,
    allergens,
    nutrition: {
      calories: nd?.calories?.value ?? "",
      servingSize: nd?.servingSize ? `${nd.servingSize.value} ${nd.servingSize.unit}` : "",
      protein: nd?.proteinContent ? `${nd.proteinContent.value}${nd.proteinContent.unit}` : "",
      totalFat: nd?.fatContent ? `${nd.fatContent.value}${nd.fatContent.unit}` : "",
      totalCarbs: nd?.carbohydrateContent ? `${nd.carbohydrateContent.value}${nd.carbohydrateContent.unit}` : "",
      fiber: nd?.fiberContent ? `${nd.fiberContent.value}${nd.fiberContent.unit}` : "",
      sodium: nd?.sodiumContent ? `${nd.sodiumContent.value}${nd.sodiumContent.unit}` : "",
    },
  };
}

function parseDaypart(
  raw: RawDaypart,
  menuItems: Record<string, RawMenuItem>
): DaypartMenu {
  const stations: StationMenu[] = [];

  for (const station of raw.stations) {
    const items: MenuItem[] = [];
    for (const itemId of station.items) {
      const rawItem = menuItems[itemId];
      if (rawItem) items.push(parseMenuItem(rawItem));
    }
    if (items.length > 0) {
      stations.push({ name: station.label, items });
    }
  }

  return {
    label: raw.label,
    startTime: raw.starttime_formatted || raw.starttime,
    endTime: raw.endtime_formatted || raw.endtime,
    stations,
  };
}

export async function fetchCafeMenu(
  hallKey: string,
  date?: string
): Promise<CafeMenu> {
  const slug = HALLS[hallKey];
  if (!slug) {
    throw new Error(
      `Unknown hall "${hallKey}". Valid halls: ${Object.keys(HALLS).join(", ")}`
    );
  }

  const dateStr = date || new Date().toISOString().slice(0, 10);
  const cacheKey = `${hallKey}:${dateStr}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = date
    ? `${BASE_URL}/${slug}/${date}/`
    : `${BASE_URL}/${slug}/`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MIT-Dining-MCP/1.0)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch menu for ${hallKey}: HTTP ${res.status}`);
  }

  const html = await res.text();

  // Extract Bamco.menu_items (not menu_items_nonce)
  const menuItemsIdx = html.indexOf("Bamco.menu_items = {");
  if (menuItemsIdx === -1) {
    throw new Error(
      `Could not find menu data for ${hallKey}. The dining hall may be closed or the page format changed.`
    );
  }
  const menuItemsBraceIdx = html.indexOf("{", menuItemsIdx + "Bamco.menu_items = ".length);
  const menuItemsJson = menuItemsBraceIdx !== -1 ? extractJsonObject(html, menuItemsBraceIdx) : null;
  if (!menuItemsJson) {
    throw new Error(`Could not parse menu data for ${hallKey}.`);
  }

  let menuItems: Record<string, RawMenuItem>;
  try {
    menuItems = JSON.parse(menuItemsJson);
  } catch {
    throw new Error(`Failed to parse menu_items JSON for ${hallKey}`);
  }

  // Extract Bamco.dayparts — they're set individually: Bamco.dayparts['1'] = {...};
  const rawDayparts: RawDaypart[] = [];
  const daypartPattern = /Bamco\.dayparts\s*\[\s*['"](\d+)['"]\s*\]\s*=\s*/g;
  let dpMatch;
  while ((dpMatch = daypartPattern.exec(html)) !== null) {
    const braceIdx = html.indexOf("{", dpMatch.index + dpMatch[0].length);
    if (braceIdx === -1) continue;
    const json = extractJsonObject(html, braceIdx);
    if (!json) continue;
    try {
      rawDayparts.push(JSON.parse(json));
    } catch {
      // skip malformed daypart
    }
  }

  const dayparts = rawDayparts.map((dp) => parseDaypart(dp, menuItems));

  const result: CafeMenu = {
    hall: hallKey,
    hallName: HALL_NAMES[hallKey] || hallKey,
    date: dateStr,
    dayparts,
  };

  cache.set(cacheKey, result);
  return result;
}

export async function fetchAllHallMenus(date?: string): Promise<CafeMenu[]> {
  const results = await Promise.allSettled(
    Object.keys(HALLS).map((hall) => fetchCafeMenu(hall, date))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<CafeMenu> => r.status === "fulfilled")
    .map((r) => r.value);
}
