import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const apiUrl = (process.env.TRADEWAY_API_URL || "").replace(/\/$/, "");
const connectorSecret = process.env.MT5_CONNECTOR_SECRET;
const lookbackDays = Number(process.env.MTAPI_SYNC_LOOKBACK_DAYS || 7);
const pollSeconds = Number(process.env.MTAPI_WORKER_POLL_SECONDS || 300);

if (!databaseUrl) throw new Error("DATABASE_URL or SUPABASE_DB_URL is required.");
if (!apiUrl) throw new Error("TRADEWAY_API_URL is required.");
if (!connectorSecret) throw new Error("MT5_CONNECTOR_SECRET is required.");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10_000,
});

function fromDate(lastSyncedAt) {
  if (lastSyncedAt) return new Date(lastSyncedAt).toISOString();
  const date = new Date();
  date.setDate(date.getDate() - lookbackDays);
  return date.toISOString();
}

async function getDueAccounts() {
  const result = await pool.query(`
    select ta.id, ta.last_synced_at
    from public.trading_accounts ta
    join public.profiles p on p.id = ta.user_id
    where ta.platform = 'MT5'
      and ta.auto_sync_enabled = true
      and coalesce(ta.status, 'pending') <> 'syncing'
      and p.plan = 'premium'
      and (p.premium_until is null or p.premium_until > now())
      and coalesce(p.auto_sync_enabled, true) = true
    order by ta.last_synced_at nulls first, ta.updated_at asc
    limit 25
  `);
  return result.rows;
}

async function syncAccount(account) {
  const response = await fetch(`${apiUrl}/api/connectors/mt5/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connectorSecret}`,
    },
    body: JSON.stringify({
      accountId: account.id,
      from: fromDate(account.last_synced_at),
      to: new Date().toISOString(),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Sync failed (${response.status})`);
  }
  return payload;
}

async function tick() {
  const accounts = await getDueAccounts();
  if (!accounts.length) {
    console.log(`[mtapi-worker] no due accounts`);
    return;
  }

  for (const account of accounts) {
    try {
      const result = await syncAccount(account);
      console.log(`[mtapi-worker] synced ${account.id}: imported=${result.imported} skipped=${result.skipped}`);
    } catch (error) {
      console.error(`[mtapi-worker] ${account.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

while (true) {
  await tick();
  await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
}
