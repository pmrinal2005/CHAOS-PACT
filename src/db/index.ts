import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Do not throw at import time: `next build` loads route modules before any
  // request exists. Queries fail with a clear connection error instead.
  console.warn("DATABASE_URL is not set; database queries will fail.");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    ssl:
      process.env.DATABASE_SSL === "no-verify"
        ? { rejectUnauthorized: false }
        : process.env.DATABASE_SSL === "require"
          ? true
          : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
