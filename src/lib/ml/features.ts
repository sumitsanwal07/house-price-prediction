/**
 * Feature engineering + encoding for the house price regression model.
 *
 * The model is a standardised multiple linear regression. Every house is
 * turned into a fixed-length numeric vector: 13 numeric features (two of
 * them engineered) plus one-hot columns for city and neighborhood type.
 */

export const NEIGHBORHOODS = ["suburb", "urban", "rural", "waterfront"] as const;
export type Neighborhood = (typeof NEIGHBORHOODS)[number];

export const CITIES = [
  "Austin",
  "Denver",
  "Seattle",
  "Miami",
  "Chicago",
  "Phoenix",
  "Boston",
  "Nashville",
] as const;
export type City = (typeof CITIES)[number];

export type HouseInput = {
  city: string;
  neighborhood: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  ageYears: number;
  lotSize: number;
  garageSpaces: number;
  conditionScore: number;
  distanceKm: number;
  hasBasement: boolean;
  yearsSinceRenovation: number;
};

export type NumericFeature = {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  compute: (h: HouseInput) => number;
};

export const NUMERIC_FEATURES: NumericFeature[] = [
  { name: "area", label: "Living area", unit: "sqft", min: 500, max: 5000, step: 10, compute: (h) => h.area },
  { name: "bedrooms", label: "Bedrooms", unit: "", min: 1, max: 6, step: 1, compute: (h) => h.bedrooms },
  { name: "bathrooms", label: "Bathrooms", unit: "", min: 1, max: 5, step: 0.5, compute: (h) => h.bathrooms },
  { name: "stories", label: "Stories", unit: "", min: 1, max: 3, step: 1, compute: (h) => h.stories },
  { name: "ageYears", label: "Age of house", unit: "years", min: 0, max: 90, step: 1, compute: (h) => h.ageYears },
  { name: "lotSize", label: "Lot size", unit: "sqft", min: 1200, max: 20000, step: 50, compute: (h) => h.lotSize },
  { name: "garageSpaces", label: "Garage spaces", unit: "", min: 0, max: 4, step: 1, compute: (h) => h.garageSpaces },
  { name: "conditionScore", label: "Condition score", unit: "/10", min: 1, max: 10, step: 1, compute: (h) => h.conditionScore },
  { name: "distanceKm", label: "Distance to downtown", unit: "km", min: 0.5, max: 30, step: 0.5, compute: (h) => h.distanceKm },
  { name: "yearsSinceRenovation", label: "Years since renovation", unit: "years", min: 0, max: 40, step: 1, compute: (h) => h.yearsSinceRenovation },
  { name: "hasBasement", label: "Has basement", unit: "0/1", min: 0, max: 1, step: 1, compute: (h) => (h.hasBasement ? 1 : 0) },
  // engineered features
  { name: "totalRooms", label: "Total rooms (engineered)", unit: "", min: 2, max: 11, step: 0.5, compute: (h) => h.bedrooms + h.bathrooms },
  { name: "areaXCondition", label: "Area × condition (engineered)", unit: "", min: 50, max: 5000, step: 10, compute: (h) => (h.area * h.conditionScore) / 10 },
];

export const FEATURE_NAMES: string[] = [
  ...NUMERIC_FEATURES.map((f) => f.name),
  ...CITIES.map((c) => `city_${c}`),
  ...NEIGHBORHOODS.map((n) => `nbhd_${n}`),
];

export const FEATURE_LABELS: Record<string, string> = {
  ...Object.fromEntries(NUMERIC_FEATURES.map((f) => [f.name, f.label])),
  ...Object.fromEntries(CITIES.map((c) => [`city_${c}`, `${c} (city)`])),
  ...Object.fromEntries(NEIGHBORHOODS.map((n) => [`nbhd_${n}`, `${n} area`])),
};

export const FEATURE_COUNT = FEATURE_NAMES.length;

/** Turn a house description into the raw (unstandardised) feature vector. */
export function encodeHouse(h: HouseInput): number[] {
  const numeric = NUMERIC_FEATURES.map((f) => f.compute(h));
  const cityOneHot = CITIES.map((c) => (h.city === c ? 1 : 0));
  const nbhdOneHot = NEIGHBORHOODS.map((n) => (h.neighborhood === n ? 1 : 0));
  return [...numeric, ...cityOneHot, ...nbhdOneHot];
}

export function defaultHouseInput(): HouseInput {
  return {
    city: "Austin",
    neighborhood: "suburb",
    area: 1850,
    bedrooms: 3,
    bathrooms: 2,
    stories: 2,
    ageYears: 12,
    lotSize: 6500,
    garageSpaces: 2,
    conditionScore: 7,
    distanceKm: 8,
    hasBasement: false,
    yearsSinceRenovation: 4,
  };
}

export function clampToRange(name: string, value: number): number {
  const feature = NUMERIC_FEATURES.find((f) => f.name === name);
  if (!feature) return value;
  return Math.min(feature.max, Math.max(feature.min, value));
}

export function sanitizeInput(raw: Partial<Record<keyof HouseInput, unknown>>): {
  input: HouseInput;
  errors: string[];
} {
  const base = defaultHouseInput();
  const errors: string[] = [];
  const num = (key: keyof HouseInput, fallback: number) => {
    const value = Number(raw[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const city = String(raw.city ?? base.city);
  const neighborhood = String(raw.neighborhood ?? base.neighborhood);

  if (!CITIES.includes(city as City)) errors.push(`Unknown city: ${city}`);
  if (!NEIGHBORHOODS.includes(neighborhood as Neighborhood)) {
    errors.push(`Unknown neighborhood type: ${neighborhood}`);
  }

  const input: HouseInput = {
    city: CITIES.includes(city as City) ? city : base.city,
    neighborhood: NEIGHBORHOODS.includes(neighborhood as Neighborhood)
      ? neighborhood
      : base.neighborhood,
    area: num("area", base.area),
    bedrooms: num("bedrooms", base.bedrooms),
    bathrooms: num("bathrooms", base.bathrooms),
    stories: num("stories", base.stories),
    ageYears: num("ageYears", base.ageYears),
    lotSize: num("lotSize", base.lotSize),
    garageSpaces: num("garageSpaces", base.garageSpaces),
    conditionScore: num("conditionScore", base.conditionScore),
    distanceKm: num("distanceKm", base.distanceKm),
    hasBasement: raw.hasBasement === true || raw.hasBasement === "true" || raw.hasBasement === 1,
    yearsSinceRenovation: num("yearsSinceRenovation", base.yearsSinceRenovation),
  };

  for (const feature of NUMERIC_FEATURES) {
    const rawValue = input[feature.name as keyof HouseInput] as unknown as number;
    input[feature.name as keyof HouseInput] = clampToRange(
      feature.name,
      feature.step >= 1 ? Math.round(rawValue) : Math.round(rawValue * 2) / 2,
    ) as never;
  }

  if (input.yearsSinceRenovation > input.ageYears) {
    input.yearsSinceRenovation = input.ageYears;
  }

  return { input, errors };
}
