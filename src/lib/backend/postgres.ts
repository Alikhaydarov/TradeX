import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) return null;

  pool ??= new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  });

  return pool;
}
