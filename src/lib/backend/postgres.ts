import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPostgresPool() {
  const rawConnectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!rawConnectionString) return null;

  const url = new URL(rawConnectionString);
  url.searchParams.delete("sslmode");

  pool ??= new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  });

  return pool;
}
