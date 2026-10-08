import { encodeHouse, FEATURE_NAMES, type HouseInput } from "./features";
import type { GeneratedHouse } from "./dataset";

/**
 * Standardised multiple linear regression trained with full-batch gradient
 * descent + L2 regularisation. Implemented from scratch (no ML dependency)
 * so the whole pipeline is inspectable.
 */

export type TrainOptions = {
  learningRate: number;
  epochs: number;
  l2: number;
};

export type TrainedModel = {
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
  hyperParams: TrainOptions;
  coefficients: { name: string; weight: number }[];
};

export const DEFAULT_TRAINING: TrainOptions = { learningRate: 0.6, epochs: 6000, l2: 0.05 };
const DEFAULTS: TrainOptions = DEFAULT_TRAINING;

export class TrainingDivergedError extends Error {
  constructor(message = "Training diverged — try a smaller learning rate or stronger L2.") {
    super(message);
    this.name = "TrainingDivergedError";
  }
}

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

function mse(weights: number[], bias: number, Z: number[][], y: number[]): number {
  let sum = 0;
  for (let i = 0; i < Z.length; i += 1) {
    const row = Z[i];
    let pred = bias;
    for (let j = 0; j < row.length; j += 1) pred += weights[j] * row[j];
    const diff = pred - y[i];
    sum += diff * diff;
  }
  return sum / Z.length;
}

function metricsFor(preds: number[], actual: number[]) {
  const n = actual.length;
  const mean = actual.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  let absSum = 0;
  let pctSum = 0;
  for (let i = 0; i < n; i += 1) {
    const diff = preds[i] - actual[i];
    ssRes += diff * diff;
    ssTot += (actual[i] - mean) ** 2;
    absSum += Math.abs(diff);
    pctSum += Math.abs(diff) / Math.max(actual[i], 1);
  }
  return {
    r2: 1 - ssRes / ssTot,
    mae: absSum / n,
    rmse: Math.sqrt(ssRes / n),
    mape: (pctSum / n) * 100,
  };
}

export type DataSplit = { trainIdx: number[]; testIdx: number[] };

/** Deterministic shuffled 80/20 train/test split (same seed as training). */
export function splitData(data: GeneratedHouse[], testFraction = 0.2, seed = 7): DataSplit {
  const rand = mulberry32(seed);
  const order = data.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const testCount = Math.max(1, Math.floor(data.length * testFraction));
  return { testIdx: order.slice(0, testCount), trainIdx: order.slice(testCount) };
}

export type Evaluation = {
  points: { x: number; y: number }[];
  residuals: number[];
  within10: number;
  worst: { actual: number; predicted: number; city: string; area: number }[];
};

/** Score the stored model on the held-out test split. */
export function evaluateModel(
  model: Pick<TrainedModel, "weights" | "bias" | "mean" | "std" | "featureNames">,
  data: GeneratedHouse[],
): Evaluation {
  const { testIdx } = splitData(data);
  const points: { x: number; y: number }[] = [];
  const residuals: number[] = [];
  let within10 = 0;
  const worst: Evaluation["worst"] = [];

  for (const idx of testIdx) {
    const house = data[idx];
    const { price } = predictWithModel(model, house);
    points.push({ x: house.price, y: price });
    residuals.push(house.price - price);
    if (Math.abs(price - house.price) / house.price <= 0.1) within10 += 1;
    worst.push({ actual: house.price, predicted: price, city: house.city, area: house.area });
  }

  worst.sort((a, b) => Math.abs(b.actual - b.predicted) - Math.abs(a.actual - a.predicted));

  return { points, residuals, within10, worst: worst.slice(0, 5) };
}

/** Gradient descent on standardised features. */
export function trainModel(
  data: GeneratedHouse[],
  options: Partial<TrainOptions> = {},
): TrainedModel {
  const opts: TrainOptions = {
    learningRate: options.learningRate ?? DEFAULTS.learningRate,
    epochs: Math.min(12000, Math.max(100, Math.round(options.epochs ?? DEFAULTS.epochs))),
    l2: options.l2 ?? DEFAULTS.l2,
  };

  const { trainIdx, testIdx } = splitData(data);

  const featureCount = FEATURE_NAMES.length;
  const rawTrain = trainIdx.map((i) => encodeHouse(data[i] as HouseInput));
  const yTrain = trainIdx.map((i) => data[i].price);
  const rawTest = testIdx.map((i) => encodeHouse(data[i] as HouseInput));
  const yTest = testIdx.map((i) => data[i].price);

  // standardisation statistics from the training split only
  const mean = new Array<number>(featureCount).fill(0);
  const std = new Array<number>(featureCount).fill(0);
  for (const row of rawTrain) {
    for (let j = 0; j < featureCount; j += 1) mean[j] += row[j] / rawTrain.length;
  }
  for (const row of rawTrain) {
    for (let j = 0; j < featureCount; j += 1) std[j] += (row[j] - mean[j]) ** 2 / rawTrain.length;
  }
  for (let j = 0; j < featureCount; j += 1) {
    std[j] = Math.sqrt(std[j]) || 1;
  }

  const Ztrain = rawTrain.map((row) => row.map((v, j) => (v - mean[j]) / std[j]));
  const Ztest = rawTest.map((row) => row.map((v, j) => (v - mean[j]) / std[j]));

  const weights = new Array<number>(featureCount).fill(0);
  let bias = yTrain.reduce((a, b) => a + b, 0) / yTrain.length;

  const n = Ztrain.length;
  const samplePoints = new Set<number>();
  for (let k = 0; k <= 22; k += 1) {
    samplePoints.add(Math.round((k / 22) * (opts.epochs - 1)));
  }

  const lossHistory: { epoch: number; train: number; test: number }[] = [];
  const lr = opts.learningRate;

  for (let epoch = 0; epoch < opts.epochs; epoch += 1) {
    const gradW = new Array<number>(featureCount).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i += 1) {
      const row = Ztrain[i];
      let pred = bias;
      for (let j = 0; j < featureCount; j += 1) pred += weights[j] * row[j];
      const error = pred - yTrain[i];
      for (let j = 0; j < featureCount; j += 1) gradW[j] += (error * row[j]) / n;
      gradB += error / n;
    }

    for (let j = 0; j < featureCount; j += 1) {
      weights[j] -= lr * (gradW[j] + opts.l2 * weights[j]);
    }
    bias -= lr * gradB;

    if ((epoch & 31) === 0 && !Number.isFinite(bias)) {
      throw new TrainingDivergedError(
        "Training diverged (loss exploded) — lower the learning rate or raise the L2 penalty.",
      );
    }

    if (samplePoints.has(epoch)) {
      lossHistory.push({
        epoch: epoch + 1,
        train: Math.sqrt(mse(weights, bias, Ztrain, yTrain)),
        test: Math.sqrt(mse(weights, bias, Ztest, yTest)),
      });
    }
  }

  const trainPreds = Ztrain.map((row) => row.reduce((acc, v, j) => acc + v * weights[j], bias));
  const testPreds = Ztest.map((row) => row.reduce((acc, v, j) => acc + v * weights[j], bias));

  const trainMetrics = metricsFor(trainPreds, yTrain);
  const testMetrics = metricsFor(testPreds, yTest);

  if (
    !Number.isFinite(testMetrics.r2) ||
    !Number.isFinite(testMetrics.rmse) ||
    !Number.isFinite(bias)
  ) {
    throw new TrainingDivergedError();
  }

  const residuals = yTest.map((y, i) => y - testPreds[i]);
  const residualMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const residualStd = Math.sqrt(
    residuals.reduce((acc, r) => acc + (r - residualMean) ** 2, 0) / residuals.length,
  );

  return {
    version: `lr-v${new Date().toISOString().slice(0, 10)}-${opts.epochs}e`,
    trainedAt: new Date().toISOString(),
    featureNames: FEATURE_NAMES,
    weights,
    bias,
    mean,
    std,
    residualStd,
    metrics: {
      trainRows: yTrain.length,
      testRows: yTest.length,
      r2: testMetrics.r2,
      mae: testMetrics.mae,
      rmse: testMetrics.rmse,
      mape: testMetrics.mape,
    },
    lossHistory,
    hyperParams: opts,
    coefficients: FEATURE_NAMES.map((name, j) => ({ name, weight: weights[j] })).sort(
      (a, b) => Math.abs(b.weight) - Math.abs(a.weight),
    ),
  };
}

/** Run the trained model on a single house. */
export function predictWithModel(
  model: Pick<TrainedModel, "weights" | "bias" | "mean" | "std" | "featureNames">,
  input: HouseInput,
): { price: number; contributions: { name: string; value: number }[] } {
  const raw = encodeHouse(input);
  let price = model.bias;
  const contributions = raw.map((value, j) => {
    const z = (value - model.mean[j]) / model.std[j];
    const contribution = model.weights[j] * z;
    price += contribution;
    return { name: model.featureNames[j] ?? `f${j}`, value: contribution };
  });
  return { price, contributions };
}

export { metricsFor };
