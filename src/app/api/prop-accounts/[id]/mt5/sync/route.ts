import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { enqueueMt5SyncJob } from "@/lib/backend/mt5-sync-queue";
import { getPostgresPool } from "@/lib/backend/postgres";
import { requirePremium } from "@/lib/backend/premium";
import { isMt5ApiConfigured, syncNowMt5Api } from "@/lib/server/mt5-api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const vpsSyncBaseUrl = (process.env.MT5_VPS_SYNC_URL || process.env.MT5_VPS_URL || "").replace(/\/$/, "");
const connectorSecret = process.env.MT5_CONNECTOR_SECRET || "";

interface TradingAccountSyncRow {
  id: string;
  user_id: string;
  broker_server: string | null;
  account_login: string | null;
  encrypted_password: string | null;
  last_synced_at: string | null;
}

type VpsSyncPayload = {
  success?: boolean;
  imported?: number;
  skipped?: number | boolean;
  total?: number;
  journalImported?: number;
  message?: string;
  error?: string;
  results?: Array<{
    login?: string;
    account_id?: string;
    result?: Record<string, unknown>;
  }>;
};

function toNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function summarizeVpsSync(payload: VpsSyncPayload) {
  const accountResults = payload.results || [];
  const nestedResults = accountResults.map((item) => item.result || {});
  const importedFromResults = nestedResults.reduce((sum, item) => sum + toNumber(item.imported), 0);
  const journalFromResults = nestedResults.reduce((sum, item) => sum + toNumber(item.journalImported), 0);
  const totalFromResults = nestedResults.reduce((sum, item) => sum + toNumber(item.total), 0);
  const skippedFromResults = nestedResults.reduce((sum, item) => {
    const skipped = item.skipped;
    return sum + (typeof skipped === "boolean" ? 0 : toNumber(skipped));
  }, 0);

  const messages = [payload.message, ...nestedResults.map((item) => String(item.message || "").trim())]
    .filter(Boolean);

  return {
    success: payload.success !== false,
    immediate: true,
    imported: toNumber(payload.imported) || importedFromResults,
    journalImported: toNumber(payload.journalImported) || journalFromResults,
    skipped: typeof payload.skipped === "boolean" ? skippedFromResults : (toNumber(payload.skipped) || skippedFromResults),
    total: toNumber(payload.total) || totalFromResults,
    message: messages[0] || "MT5 VPS sync completed.",
    results: payload.results || [],
  };
}

async function triggerVpsSyncNow(accountId: string) {
  if (!vpsSyncBaseUrl) return null;

  const response = await fetch(`${vpsSyncBaseUrl}/sync-now`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(connectorSecret ? { Authorization: `Bearer ${connectorSecret}` } : {}),
    },
    body: JSON.stringify({
      account_id: accountId,
      wait_for_new: true,
      fresh_attempts: 8,
      fresh_wait_seconds: 3,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) as VpsSyncPayload : {};
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `MT5 VPS sync failed (${response.status}).`);
  }
  return summarizeVpsSync(payload);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;
  const { id } = await context.params;

  const supabase = getSupabaseAdminClient();
  let account: TradingAccountSyncRow | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("trading_accounts")
      .select("id, user_id, broker_server, account_login, encrypted_password, last_synced_at")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", id)
      .eq("platform", "MT5")
      .maybeSingle<TradingAccountSyncRow>();
    if (error) return serverError(error.message);
    account = data;
  } else {
    const pool = getPostgresPool();
    if (!pool) return serverError("DATABASE_URL is not configured.");
    const result = await pool.query<TradingAccountSyncRow>(
      `select id, user_id, broker_server, account_login, encrypted_password, last_synced_at
       from public.trading_accounts
       where user_id = $1 and prop_account_id = $2 and platform = 'MT5'
       limit 1`,
      [auth.user.id, id],
    );
    account = result.rows[0] || null;
  }

  if (!account) {
    return Response.json({ error: "MT5 connection not found. Add credentials in Settings first." }, { status: 404 });
  }
  if (!account.account_login || !account.broker_server || !account.encrypted_password) {
    return Response.json({ error: "MT5 credentials are incomplete." }, { status: 400 });
  }

  const from = account.last_synced_at
    ? new Date(account.last_synced_at)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const to = new Date();

  try {
    if (process.env.MT5_API_DIRECT_CONNECT === "true" && isMt5ApiConfigured()) {
      const result = await syncNowMt5Api({ userId: auth.user.id, accountId: account.id, propAccountId: id });
      return Response.json({
        ...result,
        immediate: true,
        message: result.message || "MT5 VPS sync triggered.",
      });
    }

    const directResult = await triggerVpsSyncNow(account.id);
    if (directResult) {
      return Response.json(directResult);
    }

    const job = await enqueueMt5SyncJob({
      accountId: account.id,
      userId: auth.user.id,
      from: from.toISOString(),
      to: to.toISOString(),
      priority: 10,
    });

    if (!job) return serverError("DATABASE_URL is required to queue MT5 sync.");

    if (supabase) {
      await supabase
        .from("trading_accounts")
        .update({ status: "pending", last_error: null, updated_at: new Date().toISOString() })
        .eq("id", account.id)
        .eq("user_id", auth.user.id);
    } else {
      const pool = getPostgresPool();
      await pool?.query(
        `update public.trading_accounts
         set status = 'pending', last_error = null, updated_at = now()
         where id = $1 and user_id = $2`,
        [account.id, auth.user.id],
      );
    }

    return Response.json({
      queued: true,
      imported: 0,
      skipped: 0,
      total: 0,
      jobId: job.id,
      message: "MT5 sync navbatga qo'yildi. Tezkor import uchun Vercel env'ga MT5_VPS_SYNC_URL qo'shing.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 sync failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
