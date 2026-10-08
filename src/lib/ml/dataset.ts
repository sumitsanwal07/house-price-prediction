import {
  CITIES,
  NEIGHBORHOODS,
  type HouseInput,
  type Neighborhood,
} from "./features";

/**
 * Deterministic synthetic housing market.
 *
 * Real housing datasets are licensed, so this project generates a
 * reproducible market with a known (mostly linear) price generating process
 * plus noise. The model can then be evaluated honestly against it.
 */

export type GeneratedHouse = HouseInput & { price: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGauss(rand: () => number) {
  return (mean: number, sd: number) => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

type CityConfig = {
  name: (typeof CITIES)[number];
  multiplier: number;
  distance: [number, number];
  lot: [number, number];
  basementChance: number;
};

const CITY_CONFIG: CityConfig[] = [
  { name: "Austin", multiplier: 1.04, distance: [4, 22], lot: [5000, 11000], basementChance: 0.1 },
  { name: "Denver", multiplier: 1.0, distance: [3, 20], lot: [4500, 9500], basementChance: 0.45 },
  { name: "Seattle", multiplier: 1.28, distance: [2, 18], lot: [3500, 8000], basementChance: 0.3 },
  { name: "Miami", multiplier: 1.16, distance: [3, 24], lot: [4000, 9000], basementChance: 0.02 },
  { name: "Chicago", multiplier: 0.94, distance: [3, 26], lot: [3000, 7000], basementChance: 0.6 },
  { name: "Phoenix", multiplier: 0.86, distance: [5, 30], lot: [6000, 14000], basementChance: 0.05 },
  { name: "Boston", multiplier: 1.34, distance: [2, 20], lot: [2500, 7000], basementChance: 0.55 },
  { name: "Nashville", multiplier: 0.9, distance: [4, 26], lot: [6000, 16000], basementChance: 0.2 },
];

const TIER_PREMIUM: Record<Neighborhood, number> = {
  rural: -42000,
  suburb: 26000,
  urban: 92000,
  waterfront: 210000,
};

/** Ground-truth pricing function used to build the dataset. */
export function truePrice(h: HouseInput, cityMultiplier: number): number {
  let p = 61000;
  p += h.area * 93;
  p += h.bedrooms * 8200;
  p += h.bathrooms * 12400;
  p += h.stories * 6400;
  p += h.lotSize * 1.3;
  p += h.garageSpaces * 10400;
  p += h.conditionScore * 5900;
  p -= h.ageYears * 1380;
  p -= h.distanceKm * 2950;
  p += h.hasBasement ? 13600 : 0;
  p -= Math.min(h.yearsSinceRenovation, 30) * 460;
  p += TIER_PREMIUM[h.neighborhood as Neighborhood] ?? 0;
  p *= cityMultiplier;
  return p;
}

export const DATASET_SIZE = 720;

export function generateDataset(seed = 42): GeneratedHouse[] {
  const rand = mulberry32(seed);
  const gauss = makeGauss(rand);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  const between = (min: number, max: number) => min + rand() * (max - min);
  const rows: GeneratedHouse[] = [];

  for (let i = 0; i < DATASET_SIZE; i += 1) {
    const config = CITY_CONFIG[Math.floor(rand() * CITY_CONFIG.length)];
    const neighborhood = pick(NEIGHBORHOODS);
    const ageYears = Math.max(0, Math.round(gauss(22, 18)));
    const area = Math.round(Math.max(520, gauss(1900, 620)));
    const bedrooms = Math.min(6, Math.max(1, Math.round(gauss(3.3, 0.9))));
    const bathrooms = Math.min(5, Math.max(1, Math.round(gauss(2.3, 0.7) * 2) / 2));
    const stories = Math.min(3, Math.max(1, Math.round(gauss(1.6, 0.6))));
    const conditionScore = Math.min(10, Math.max(1, Math.round(gauss(6.8, 1.6))));
    const distanceKm = Math.round(between(config.distance[0], config.distance[1]) * 2) / 2;
    const lotSize = Math.round(between(config.lot[0], config.lot[1]) * 0.75 + area * 1.6);
    const garageSpaces = Math.min(4, Math.max(0, Math.round(gauss(1.7, 1.0))));
    const yearsSinceRenovation = Math.min(ageYears, Math.max(0, Math.round(gauss(9, 8))));

    const input: HouseInput = {
      city: config.name,
      neighborhood,
      area,
      bedrooms,
      bathrooms,
      stories,
      ageYears,
      lotSize,
      garageSpaces,
      conditionScore,
      distanceKm,
      hasBasement: rand() < config.basementChance,
      yearsSinceRenovation,
    };

    const noise = gauss(0, 16500);
    const price = Math.max(48000, Math.round((truePrice(input, config.multiplier) + noise) / 100) * 100);

    rows.push({ ...input, price });
  }

  return rows;
}
