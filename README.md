# PriceScope — House Price Prediction

A full-stack house price predictor. A multiple linear regression model is implemented **from scratch** (gradient descent + L2 regularisation, no ML library) and trained in-app on a synthetic housing dataset stored in PostgreSQL.

## Features
- **Estimate** – enter property details, get a predicted price with a confidence range
- **Dataset explorer** – browse and filter the training data with charts
- **Model lab** – retrain with custom learning rate / epochs / L2 and compare R², MAE, RMSE
- **History** – every prediction is logged and can be reviewed

## Tech stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Drizzle ORM

## Run locally
```bash
npm install
cp .env.example .env      # set DATABASE_URL
npm run db:push           # create tables
npm run dev               # http://localhost:3000
```
The dataset is seeded and the model trained automatically on first request.

## Deploy (Vercel + Neon)
1. Create a free Postgres DB (Neon / Supabase) and copy its connection string.
2. Run `DATABASE_URL="<connection string>" npm run db:push` once.
3. Import the repo in Vercel and add `DATABASE_URL` as an environment variable.
4. Deploy.

## Project structure
```
src/lib/ml/     regression, feature encoding, dataset generator
src/db/         Drizzle schema + connection
src/app/api/    predict, model, stats, houses, predictions
src/components/ UI + charts
```
