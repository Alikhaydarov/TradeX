import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { decryptSecret } from "@/lib/backend/crypto";
import {
  importMt5TradesToJournal,
  importMt5TradesToJournalViaPostgres,
  type IncomingMt5Trade,
} from "@/lib/backend/mt5-import";
import { getPostgresPool } from "@/lib/backend/postgres";
import { requirePremium } from "@/lib/backend/premium";
import { isPremiumActive, isPremiumPlan } from "@/lib/premium-plan";
import { getMt5ClosedTrades } from "@/lib/server/mt5-bridge";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface TradingAccountSyncRow {
  id: string;
  user_id: string;
  broker_server: string | null;
  account_login: string | null;
  encrypted_password: string | null;
}

interface PremiumSyncRow {
  plan: string | null;
  premium_until: string | null;
  auto_sync_enabled: boolean | null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fromDate(value: unknown) {
  const text = cleanString(value);
  if (!text) {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString();
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toIncomingTrade(trade: Record<string, unknown>): IncomingMt5Trade {
  return {
    externalDealId: trade.id ?? trade.ticket,
    externalPositionId: trade.positionId ?? trade.position_id,
    symbol: trade.symbol,
    side: trade.side ?? trade.type,
    volume: trade.volume ?? trade.lots ?? trade.quantity,
    entryPrice: trade.entryPrice ?? trade.entry_price ?? trade.openPrice ?? trade.open_price,
    exitPrice: trade.exitPrice ?? trade.exit_price ?? trade.closePrice ?? trade.close_price,
    commission: trade.commission,
    swap: trade.swap,
    grossPnl: trade.grossPnl ?? trade.gross_pnl ?? trade.profit ?? trade.pnl,
    netPnl: trade.netPnl ?? trade.net_pnl ?? trade.profit ?? trade.pnl,
    openedAt: trade.openedAt ?? trade.opened_at ?? trade.openTime ?? trade.open_time,
    closedAt: trade.closedAt ?? trade.closed_at ?? trade.closeTime ?? trade.close_time ?? trade.time,
    status: trade.status ?? "closed",
    rawPayload: trade.rawPayload ?? trade,
  };
}

function hasConnectorSecret(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  const header = request.headers.get("authorization") || "";
  return Boolean(expected && header === `Bearer ${expected}`);
}

function isPremiumRow(profile: PremiumSyncRow | null) {
  return Boolean(profile && profile.auto_sync_enabled !== false && isPremiumPlan(profile.plan) && isPremiumActive(profile.premium_until));
}

async function getAccountForSync(accountId: string, userId?: string) {
  const supabase = getSupabaseAdminClient();
  let account: TradingAccountSyncRow | null = null;

  if (supabase) {
    let query = supabase
      .from("trading_accounts")
      .select("id, user_id, broker_server, account_login, encrypted_password")
      .eq("id", accountId);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query.single<TradingAccountSyncRow>();
    if (error) throw new Error(error.message);
    account = data;
  } else {
    const pool = getPostgresPool();
    if (!pool) throw new Error("SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL is required for MT5 sync.");
    const result = await pool.query<TradingAccountSyncRow>(
      `select id, user_id, broker_server, account_login, encrypted_password
       from public.trading_accounts
       where id = $1
       and ($2::uuid is null or user_id = $2::uuid)
       limit 1`,
      [accountId, userId || null],
    );
    account = result.rows[0] || null;
  }

  return account;
}

async function ensurePremiumAutoSync(userId: string) {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, premium_until, auto_sync_enabled")
      .eq("id", userId)
      .single<PremiumSyncRow>();
    if (error) throw new Error(error.message);
    if (!isPremiumRow(data)) throw new Error("MT5 Auto Sync requires active Premium.");
    return;
  }

  const pool = getPostgresPool();
  if (!pool) throw new Error("SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL is required for MT5 sync.");
  const result = await pool.query<PremiumSyncRow>(
    `select plan, premium_until, auto_sync_enabled from public.profiles where id = $1 limit 1`,
    [userId],
  );
  if (!isPremiumRow(result.rows[0] || null)) throw new Error("MT5 Auto Sync requires active Premium.");
}

async function updateSyncError(accountId: string, userId: string | null, message: string) {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    let query = supabase
      .from("trading_accounts")
      .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", accountId);
    if (userId) query = query.eq("user_id", userId);
    await query;
    return;
  }

  const pool = getPostgresPool();
  await pool?.query(
    `update public.trading_accounts
     set status = 'error', last_error = $2, updated_at = now()
     where id = $1
     and ($3::uuid is null or user_id = $3::uuid)`,
    [accountId, message, userId],
  );
}

async function syncAccount(account: TradingAccountSyncRow, from: string, to: string) {
  if (!account.account_login || !account.broker_server || !account.encrypted_password) {
    throw new Error("MT5 account credentials are incomplete.");
  }

  const password = decryptSecret(account.encrypted_password);
  const bridgeTrades = await getMt5ClosedTrades({
    login: account.account_login,
    password,
    server: account.broker_server,
    from,
    to,
  });

  const incoming = bridgeTrades.map((trade) => toIncomingTrade(trade as Record<string, unknown>));
  const supabase = getSupabaseAdminClient();
  return supabase
    ? importMt5TradesToJournal(supabase, account.id, incoming)
    : importMt5TradesToJournalViaPostgres(account.id, incoming);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    accountId?: unknown;
    from?: unknown;
    to?: unknown;
  };
  const accountId = cleanString(body.accountId);
  const from = fromDate(body.from);
  const to = fromDate(body.to) || new Date().toISOString();

  if (!accountId) return badRequest("accountId is required.");
  if (!from) return badRequest("from date is invalid.");

  const connectorSecret = hasConnectorSecret(request);
  const auth = connectorSecret ? null : await authenticateRequest(request);
  if (!connectorSecret && !auth) return unauthorized();

  const locked = auth ? await requirePremium(auth) : null;
  if (locked) return locked;

  let account: TradingAccountSyncRow | null = null;
  try {
    account = await getAccountForSync(accountId, auth?.user.id);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "MT5 account lookup failed.");
  }

  if (!account) return Response.json({ error: "MT5 account not found." }, { status: 404 });

  try {
    if (connectorSecret) await ensurePremiumAutoSync(account.user_id);
    const result = await syncAccount(account, from, to);
    return Response.json({ ...result, status: "connected" });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "MT5 sync failed.";
    await updateSyncError(account.id, auth?.user.id || null, message);
    return serverError(message);
  }
}
