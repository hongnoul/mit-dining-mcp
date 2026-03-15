export interface MenuItem {
  id: string;
  label: string;
  description: string;
  station: string;
  ingredients: string;
  diets: string[];       // e.g. ["Vegetarian", "Vegan"]
  allergens: string[];   // e.g. ["Wheat/Gluten", "Milk"]
  nutrition: {
    calories: string;
    servingSize: string;
    protein: string;
    totalFat: string;
    totalCarbs: string;
    fiber: string;
    sodium: string;
  };
}

export interface StationMenu {
  name: string;
  items: MenuItem[];
}

export interface DaypartMenu {
  label: string;        // "Breakfast", "Lunch", "Dinner", "Brunch"
  startTime: string;
  endTime: string;
  stations: StationMenu[];
}

export interface CafeMenu {
  hall: string;
  hallName: string;
  date: string;
  dayparts: DaypartMenu[];
}

/** Raw Bamco types for parsing */
export interface RawMenuItem {
  id: string;
  label: string;
  description: string;
  station: string;
  ingredients: string;
  cor_icon: Record<string, string>;
  nutrition_details?: Record<string, { label: string; value: string; unit: string }>;
}

export interface RawStation {
  id: string;
  label: string;
  items: string[];
}

export interface RawDaypart {
  id: string;
  label: string;
  starttime: string;
  endtime: string;
  starttime_formatted: string;
  endtime_formatted: string;
  stations: RawStation[];
}
