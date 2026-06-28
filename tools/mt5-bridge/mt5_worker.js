const crypto = require("node:crypto");
const { setTimeout: wait } = require("node:timers/promises");
const pg = require("pg");

const { Pool } = pg;

function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!raw) return "";
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  return url.toString();
}

const pool = new Pool({
  connectionString: databaseUrl(),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const bridgeUrl = (process.env.MT5_BRIDGE_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const tradeWayApiUrl = (process.env.TRADEWAY_API_URL || "https://tradewayio.vercel.app").replace(/\/$/, "");
const bridgeToken = process.env.MT5_BRIDGE_TOKEN || "";
const connectorSecret = process.env.MT5_CONNECTOR_SECRET || "";
const pollMs = Number(process.env.MT5_WORKER_POLL_MS || 15000);
const batchSize = Math.max(1, Math.min(10, Number(process.env.MT5_WORKER_BATCH_SIZE || 3)));
const runOnce = String(process.env.MT5_WORKER_ONCE || "").toLowerCase() === "true";

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required.`);
}

function keyFromEnv() {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY;
  requireEnv("CONNECTOR_ENCRYPTION_KEY", raw);
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  if (/^[A-Za-z0-9+/=]{44}$/.test(raw)) return Buffer.from(raw, "base64");
  return crypto.createHash("sha256").update(raw).digest();
}

function decryptSecret(value) {
  const [version, ivValue, tagValue, encryptedValue] = String(value || "").split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported encrypted secret format.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromEnv(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function claimJobs() {
  const result = await pool.query(
    `with picked as (
       select id
       from public.mt5_sync_jobs
       where status = 'queued'
       and run_after <= now()
       order by priority asc, created_at asc
       limit $1
       for update skip locked
     )
     update public.mt5_sync_jobs job
     set status = 'running',
         locked_until = now() + interval '10 minutes',
         attempts = attempts + 1,
         updated_at = now()
     from picked
     where job.id = picked.id
     returning job.id, job.account_id, job.user_id, job.requested_from, job.requested_to, job.attempts`,
    [batchSize],
  );
  return result.rows;
}

async function getAccount(accountId) {
  const result = await pool.query(
    `select id, user_id, broker_server, account_login, encrypted_password
     from public.trading_accounts
     where id = $1
     limit 1`,
    [accountId],
  );
  return result.rows[0] || null;
}

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString();
}

async function fetchClosedTrades(account, from, to) {
  const password = decryptSecret(account.encrypted_password);
  const response = await fetch(`${bridgeUrl}/history/closed-trades`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bridgeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login: account.account_login,
      password,
      server: account.broker_server,
      from,
      to,
    }),
    signal: AbortSignal.timeout(180000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || `Bridge failed (${response.status}).`);
  }
  return Array.isArray(payload?.trades) ? payload.trades : [];
}

async function importTrades(accountId, trades) {
  if (!trades.length) return { imported: 0, total: 0 };
  const response = await fetch(`${tradeWayApiUrl}/api/connectors/mt5/trades`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connectorSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountId, trades }),
    signal: AbortSignal.timeout(60000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `TradeWay import failed (${response.status}).`);
  return payload;
}

async function completeJob(jobId) {
  await pool.query(
    `update public.mt5_sync_jobs
     set status = 'done', locked_until = null, last_error = null, updated_at = now()
     where id = $1`,
    [jobId],
  );
}

async function failJob(job, message) {
  await pool.query(
    `update public.mt5_sync_jobs
     set status = case when attempts >= max_attempts then 'error' else 'queued' end,
         run_after = case when attempts >= max_attempts then run_after else now() + interval '2 minutes' end,
         locked_until = null,
         last_error = $2,
         updated_at = now()
     where id = $1`,
    [job.id, message.slice(0, 1000)],
  );
  await pool.query(
    `update public.trading_accounts
     set status = 'error', last_error = $2, updated_at = now()
     where id = $1`,
    [job.account_id, message.slice(0, 1000)],
  );
}

async function processJob(job) {
  const account = await getAccount(job.account_id);
  if (!account) throw new Error("Trading account not found.");
  if (!account.account_login || !account.broker_server || !account.encrypted_password) {
    throw new Error("MT5 account credentials are incomplete.");
  }

  const from = job.requested_from ? new Date(job.requested_from).toISOString() : defaultFrom();
  const to = job.requested_to ? new Date(job.requested_to).toISOString() : new Date().toISOString();
  const trades = await fetchClosedTrades(account, from, to);
  const result = await importTrades(account.id, trades);
  await completeJob(job.id);
  await pool.query(
    `update public.trading_accounts
     set status = 'connected', last_error = null, updated_at = now()
     where id = $1`,
    [account.id],
  );
  console.log(JSON.stringify({ jobId: job.id, accountId: account.id, trades: trades.length, result }));
}

async function tick() {
  const jobs = await claimJobs();
  if (!jobs.length) return;
  for (const job of jobs) {
    try {
      await processJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "MT5 worker failed.";
      await failJob(job, message);
      console.error(JSON.stringify({ jobId: job.id, accountId: job.account_id, error: message }));
    }
  }
}

async function main() {
  requireEnv("DATABASE_URL or SUPABASE_DB_URL", process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
  requireEnv("MT5_BRIDGE_TOKEN", bridgeToken);
  requireEnv("MT5_CONNECTOR_SECRET", connectorSecret);
  requireEnv("CONNECTOR_ENCRYPTION_KEY", process.env.CONNECTOR_ENCRYPTION_KEY);
  console.log(`TradeWay MT5 worker started. bridge=${bridgeUrl} api=${tradeWayApiUrl}`);
  if (runOnce) {
    await tick();
    await pool.end();
    return;
  }
  while (true) {
    await tick();
    await wait(pollMs);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
