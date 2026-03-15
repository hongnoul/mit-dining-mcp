/** MIT dining hall slugs used in cafebonappetit.com URLs */
export const HALLS: Record<string, string> = {
  baker: "baker",
  maseeh: "the-howard-dining-hall-at-maseeh",
  mccormick: "mccormick",
  "new-vassar": "new-vassar",
  "next-house": "next",
  simmons: "simmons",
};

export const HALL_NAMES: Record<string, string> = {
  baker: "Baker Dining",
  maseeh: "The Howard Dining Hall at Maseeh",
  mccormick: "McCormick Dining",
  "new-vassar": "New Vassar Dining",
  "next-house": "Next Dining",
  simmons: "Simmons Dining",
};

export const BASE_URL = "https://mit.cafebonappetit.com/cafe";

/** Dietary/allergen icon codes from Bamco.cor_icons */
export const COR_ICONS: Record<string, { label: string; type: "diet" | "allergen" }> = {
  "1": { label: "Vegetarian", type: "diet" },
  "4": { label: "Vegan", type: "diet" },
  "10": { label: "Halal", type: "diet" },
  "11": { label: "Kosher", type: "diet" },
  "253": { label: "Peanut", type: "allergen" },
  "254": { label: "Tree Nut", type: "allergen" },
  "255": { label: "Fish", type: "allergen" },
  "256": { label: "Shellfish", type: "allergen" },
  "257": { label: "Wheat/Gluten", type: "allergen" },
  "258": { label: "Milk", type: "allergen" },
  "259": { label: "Egg", type: "allergen" },
  "260": { label: "Soy", type: "allergen" },
  "298": { label: "Sesame", type: "allergen" },
};

/** Supported dietary filter keys */
export const DIET_FILTERS = ["vegetarian", "vegan", "halal", "kosher", "gluten-free"] as const;
export type DietFilter = (typeof DIET_FILTERS)[number];

/** Map diet filter names to cor_icon IDs */
export const DIET_TO_COR_ID: Record<string, string> = {
  vegetarian: "1",
  vegan: "4",
  halal: "10",
  kosher: "11",
};
