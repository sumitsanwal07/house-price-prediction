import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Don't throw at import time: `next build` imports this file even when no
// database is reachable. The Pool only connects when the first query runs.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn("DATABASE_URL is not set - database queries will fail at runtime.");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
