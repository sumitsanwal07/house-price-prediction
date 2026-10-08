import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Training dataset: one row per (synthetic but realistic) house listing.
 */
export const houses = pgTable("houses", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  area: integer("area").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: doublePrecision("bathrooms").notNull(),
  stories: integer("stories").notNull(),
  ageYears: integer("age_years").notNull(),
  lotSize: integer("lot_size").notNull(),
  garageSpaces: integer("garage_spaces").notNull(),
  conditionScore: integer("condition_score").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  hasBasement: boolean("has_basement").notNull().default(false),
  yearsSinceRenovation: integer("years_since_renovation").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every prediction made from the UI is logged here so users can review
 * and compare past estimates.
 */
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  area: integer("area").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: doublePrecision("bathrooms").notNull(),
  stories: integer("stories").notNull(),
  ageYears: integer("age_years").notNull(),
  lotSize: integer("lot_size").notNull(),
  garageSpaces: integer("garage_spaces").notNull(),
  conditionScore: integer("condition_score").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  hasBasement: boolean("has_basement").notNull().default(false),
  yearsSinceRenovation: integer("years_since_renovation").notNull(),
  predictedPrice: integer("predicted_price").notNull(),
  lowPrice: integer("low_price").notNull(),
  highPrice: integer("high_price").notNull(),
  modelVersion: text("model_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ModelPayload = {
  version: string;
  trainedAt: string;
  featureNames: string[];
  weights: number[];
  bias: number;
  mean: number[];
  std: number[];
  residualStd: number;
  metrics: {
    trainRows: number;
    testRows: number;
    r2: number;
    mae: number;
    rmse: number;
    mape: number;
  };
  lossHistory: { epoch: number; train: number; test: number }[];
  hyperParams: { learningRate: number; epochs: number; l2: number };
  coefficients: { name: string; weight: number }[];
};

/**
 * Single-row table holding the trained regression model (standardised
 * linear regression weights + evaluation metrics).
 */
export const modelState = pgTable("model_state", {
  id: integer("id").primaryKey(),
  version: text("version").notNull(),
  trainedAt: timestamp("trained_at", { withTimezone: true }).notNull().defaultNow(),
  epochs: integer("epochs").notNull(),
  learningRate: doublePrecision("learning_rate").notNull(),
  l2: doublePrecision("l2").notNull(),
  r2: doublePrecision("r2").notNull(),
  mae: doublePrecision("mae").notNull(),
  rmse: doublePrecision("rmse").notNull(),
  trainRows: integer("train_rows").notNull(),
  testRows: integer("test_rows").notNull(),
  payload: jsonb("payload").$type<ModelPayload>().notNull(),
});

export type HouseRow = typeof houses.$inferSelect;
export type NewHouseRow = typeof houses.$inferInsert;
export type PredictionRow = typeof predictions.$inferSelect;
export type ModelStateRow = typeof modelState.$inferSelect;
