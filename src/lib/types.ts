/** Types shared between server code and client components. */

export type Contribution = { name: string; label: string; value: number };

export type Comparable = {
  id: number;
  city: string;
  neighborhood: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  conditionScore: number;
  ageYears: number;
  price: number;
};

export type PredictionResult = {
  predictedPrice: number;
  lowPrice: number;
  highPrice: number;
  pricePerSqft: number;
  confidence: number;
  contributions: Contribution[];
  comparables: Comparable[];
  modelVersion: string;
  residualStd: number;
};

export type PredictionListItem = {
  id: number;
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
  predictedPrice: number;
  lowPrice: number;
  highPrice: number;
  modelVersion: string;
  createdAt: string;
};

export type HouseListItem = {
  id: number;
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
  price: number;
};

export type ModelSummary = {
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
