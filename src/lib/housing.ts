import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { houses, modelState, predictions, type ModelPayload, type PredictionRow } from "@/db/schema";
import type { PredictionResult } from "@/lib/types";
import { generateDataset, type GeneratedHouse } from "@/lib/ml/dataset";
import { FEATURE_LABELS, type HouseInput } from "@/lib/ml/features";
import {
  evaluateModel,
  predictWithModel,
  trainModel,
  type TrainOptions,
} from "@/lib/ml/regression";

const MODEL_ID = 1;

let bootstrapPromise: Promise<void> | null = null;
let cachedModel: ModelPayload | null = null;

/** Create the synthetic dataset the first time the app runs. */
export async function ensureDataset(): Promise<number> {
  const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(houses);
  const count = row?.value ?? 0;
  if (count > 0) return count;

  const rows = generateDataset().map((h) => ({
    city: h.city,
    neighborhood: h.neighborhood,
    area: h.area,
    bedrooms: h.bedrooms,
    bathrooms: h.bathrooms,
    stories: h.stories,
    ageYears: h.ageYears,
    lotSize: h.lotSize,
    garageSpaces: h.garageSpaces,
    conditionScore: h.conditionScore,
    distanceKm: h.distanceKm,
    hasBasement: h.hasBasement,
    yearsSinceRenovation: h.yearsSinceRenovation,
    price: h.price,
  }));

  for (let i = 0; i < rows.length; i += 180) {
    await db.insert(houses).values(rows.slice(i, i + 180));
  }
  return rows.length;
}

async function loadDataset(): Promise<GeneratedHouse[]> {
  await ensureDataset();
  const rows = await db
    .select({
      city: houses.city,
      neighborhood: houses.neighborhood,
      area: houses.area,
      bedrooms: houses.bedrooms,
      bathrooms: houses.bathrooms,
      stories: houses.stories,
      ageYears: houses.ageYears,
      lotSize: houses.lotSize,
      garageSpaces: houses.garageSpaces,
      conditionScore: houses.conditionScore,
      distanceKm: houses.distanceKm,
      hasBasement: houses.hasBasement,
      yearsSinceRenovation: houses.yearsSinceRenovation,
      price: houses.price,
    })
    .from(houses);
  return rows;
}

async function persistModel(options: Partial<TrainOptions> = {}): Promise<ModelPayload> {
  const data = await loadDataset();
  const model = trainModel(data, options);
  const payload: ModelPayload = model;

  await db
    .insert(modelState)
    .values({
      id: MODEL_ID,
      version: model.version,
      trainedAt: new Date(model.trainedAt),
      epochs: model.hyperParams.epochs,
      learningRate: model.hyperParams.learningRate,
      l2: model.hyperParams.l2,
      r2: model.metrics.r2,
      mae: model.metrics.mae,
      rmse: model.metrics.rmse,
      trainRows: model.metrics.trainRows,
      testRows: model.metrics.testRows,
      payload: model,
    })
    .onConflictDoUpdate({
      target: modelState.id,
      set: {
        version: model.version,
        trainedAt: new Date(model.trainedAt),
        epochs: model.hyperParams.epochs,
        learningRate: model.hyperParams.learningRate,
        l2: model.hyperParams.l2,
        r2: model.metrics.r2,
        mae: model.metrics.mae,
        rmse: model.metrics.rmse,
        trainRows: model.metrics.trainRows,
        testRows: model.metrics.testRows,
        payload: model,
      },
    });

  cachedModel = model;
  return model;
}

async function bootstrap(): Promise<void> {
  await ensureDataset();
  const [existing] = await db.select().from(modelState).where(eq(modelState.id, MODEL_ID)).limit(1);
  if (existing?.payload) {
    cachedModel = existing.payload;
    return;
  }
  await persistModel();
}

/** Lazily seeds data + trains the model exactly once per server process. */
export function ensureModel(): Promise<ModelPayload> {
  if (cachedModel) return Promise.resolve(cachedModel);
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise.then(() => {
    if (!cachedModel) throw new Error("Model unavailable");
    return cachedModel;
  });
}

export async function retrainModel(options: Partial<TrainOptions> = {}): Promise<ModelPayload> {
  return persistModel(options);
}

export type { PredictionResult } from "@/lib/types";

export async function predictHouse(
  input: HouseInput,
  options: { persist?: boolean } = {},
): Promise<PredictionResult> {
  const model = await ensureModel();
  const { price, contributions } = predictWithModel(model, input);
  const predictedPrice = Math.max(20000, Math.round(price / 100) * 100);
  const lowPrice = Math.max(0, Math.round((predictedPrice - 1.96 * model.residualStd) / 100) * 100);
  const highPrice = Math.round((predictedPrice + 1.96 * model.residualStd) / 100) * 100;

  const dataset = await loadDataset();
  const comparables = dataset
    .map((h, index) => ({ ...h, id: index + 1 }))
    .filter(
      (h) =>
        h.city === input.city &&
        Math.abs(h.area - input.area) <= Math.max(180, input.area * 0.22) &&
        Math.abs(h.bedrooms - input.bedrooms) <= 1,
    )
    .sort((a, b) => Math.abs(a.area - input.area) - Math.abs(b.area - input.area))
    .slice(0, 5)
    .map((h) => ({
      id: h.id,
      city: h.city,
      neighborhood: h.neighborhood,
      area: h.area,
      bedrooms: h.bedrooms,
      bathrooms: h.bathrooms,
      conditionScore: h.conditionScore,
      ageYears: h.ageYears,
      price: h.price,
    }));

  const sorted = [...contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  if (options.persist !== false) {
    await db.insert(predictions).values({
      city: input.city,
      neighborhood: input.neighborhood,
      area: input.area,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      stories: input.stories,
      ageYears: input.ageYears,
      lotSize: input.lotSize,
      garageSpaces: input.garageSpaces,
      conditionScore: input.conditionScore,
      distanceKm: input.distanceKm,
      hasBasement: input.hasBasement,
      yearsSinceRenovation: input.yearsSinceRenovation,
      predictedPrice,
      lowPrice,
      highPrice,
      modelVersion: model.version,
    });
  }

  return {
    predictedPrice,
    lowPrice,
    highPrice,
    pricePerSqft: Math.round(predictedPrice / Math.max(input.area, 1)),
    confidence: Math.max(0.5, Math.min(0.99, 1 - model.metrics.mape / 100)),
    contributions: sorted.map((c) => ({
      name: c.name,
      label: FEATURE_LABELS[c.name] ?? c.name,
      value: Math.round(c.value),
    })),
    comparables,
    modelVersion: model.version,
    residualStd: Math.round(model.residualStd),
  };
}

export type HouseFilters = {
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  page?: number;
  pageSize?: number;
};

export async function listHouses(filters: HouseFilters) {
  await ensureDataset();
  const pageSize = Math.min(60, Math.max(5, filters.pageSize ?? 12));
  const page = Math.max(1, filters.page ?? 1);

  const conditions = [];
  if (filters.city) conditions.push(eq(houses.city, filters.city));
  if (filters.neighborhood) conditions.push(eq(houses.neighborhood, filters.neighborhood));
  if (filters.bedrooms) conditions.push(eq(houses.bedrooms, filters.bedrooms));
  if (filters.minPrice) conditions.push(gte(houses.price, filters.minPrice));
  if (filters.maxPrice) conditions.push(lte(houses.price, filters.maxPrice));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(houses)
    .where(where)
    .orderBy(desc(houses.price))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int`, avg: sql<number>`coalesce(avg(price), 0)::int` })
    .from(houses)
    .where(where);

  return {
    rows,
    total: countRow?.value ?? 0,
    avgPrice: countRow?.avg ?? 0,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil((countRow?.value ?? 0) / pageSize)),
  };
}

export type DatasetStats = {
  count: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  avgArea: number;
  avgPricePerSqft: number;
  byCity: { city: string; count: number; avgPrice: number }[];
  byNeighborhood: { neighborhood: string; count: number; avgPrice: number }[];
  priceBuckets: { label: string; count: number }[];
};

export async function getDatasetStats(): Promise<DatasetStats> {
  await ensureDataset();
  const rows = await db
    .select({
      city: houses.city,
      neighborhood: houses.neighborhood,
      area: houses.area,
      price: houses.price,
    })
    .from(houses);

  const prices = rows.map((r) => r.price).sort((a, b) => a - b);
  const sum = prices.reduce((a, b) => a + b, 0);
  const areaSum = rows.reduce((a, r) => a + r.area, 0);

  const groupBy = (key: "city" | "neighborhood") => {
    const map = new Map<string, { count: number; total: number }>();
    for (const row of rows) {
      const entry = map.get(row[key]) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += row.price;
      map.set(row[key], entry);
    }
    return [...map.entries()]
      .map(([label, v]) => ({ label, count: v.count, avgPrice: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avgPrice - a.avgPrice);
  };

  const bucketSize = 150000;
  const maxBucket = 12;
  const buckets = new Map<number, number>();
  for (const price of prices) {
    const index = Math.min(maxBucket - 1, Math.floor(price / bucketSize));
    buckets.set(index, (buckets.get(index) ?? 0) + 1);
  }

  return {
    count: prices.length,
    avgPrice: Math.round(sum / Math.max(prices.length, 1)),
    medianPrice: prices[Math.floor(prices.length / 2)] ?? 0,
    minPrice: prices[0] ?? 0,
    maxPrice: prices[prices.length - 1] ?? 0,
    avgArea: Math.round(areaSum / Math.max(rows.length, 1)),
    avgPricePerSqft: Math.round(sum / Math.max(areaSum, 1)),
    byCity: groupBy("city").map((g) => ({ city: g.label, count: g.count, avgPrice: g.avgPrice })),
    byNeighborhood: groupBy("neighborhood").map((g) => ({
      neighborhood: g.label,
      count: g.count,
      avgPrice: g.avgPrice,
    })),
    priceBuckets: [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, count]) => ({
        label: `$${(index * bucketSize) / 1000}k–${((index + 1) * bucketSize) / 1000}k`,
        count,
      })),
  };
}

/** Held-out evaluation used by the model lab page. */
export async function getEvaluation() {
  const model = await ensureModel();
  const data = await loadDataset();
  return evaluateModel(model, data);
}

export async function listPredictions(limit = 25): Promise<PredictionRow[]> {
  await ensureModel();
  return db.select().from(predictions).orderBy(desc(predictions.createdAt)).limit(limit);
}

export async function deletePrediction(id: number): Promise<boolean> {
  const deleted = await db.delete(predictions).where(eq(predictions.id, id)).returning();
  return deleted.length > 0;
}

export async function clearPredictions(): Promise<number> {
  const deleted = await db.delete(predictions).returning();
  return deleted.length;
}
