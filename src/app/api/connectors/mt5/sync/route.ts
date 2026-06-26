import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { decryptSecret } from "@/lib/backend/crypto";
import {
  importMt5TradesToJournal,
  importMt5TradesToJournalViaPostgres,
  type IncomingMt5Trade,
} from "@/lib/backend/mt5-import";
import { getPostgresPool } from "@/lib/backend/postgres";
import { requirePremium } from "@/lib/backend/premium";
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
  };
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const locked = await requirePremium(auth);
  if (locked) return locked;

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

  const supabase = getSupabaseAdminClient();
  let account: TradingAccountSyncRow | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("trading_accounts")
      .select("id, user_id, broker_server, account_login, encrypted_password")
      .eq("id", accountId)
      .eq("user_id", auth.user.id)
      .single<TradingAccountSyncRow>();
    if (error) return serverError(error.message);
    account = data;
  } else {
    const pool = getPostgresPool();
    if (!pool) return serverError("SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL is required for MT5 sync.");
    const result = await pool.query<TradingAccountSyncRow>(
      `select id, user_id, broker_server, account_login, encrypted_password
       from public.trading_accounts
       where id = $1 and user_id = $2
       limit 1`,
      [accountId, auth.user.id],
    );
    account = result.rows[0] || null;
  }

  if (!account?.account_login || !account.broker_server || !account.encrypted_password) {
    return badRequest("MT5 account credentials are incomplete.");
  }

  try {
    const password = decryptSecret(account.encrypted_password);
    const bridgeTrades = await getMt5ClosedTrades({
      login: account.account_login,
      password,
      server: account.broker_server,
      from,
      to,
    });

    const incoming = bridgeTrades.map((trade) => toIncomingTrade(trade as Record<string, unknown>));
    const result = supabase
      ? await importMt5TradesToJournal(supabase, accountId, incoming)
      : await importMt5TradesToJournalViaPostgres(accountId, incoming);

    return Response.json({ ...result, status: "connected" });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "MT5 sync failed.";
    if (supabase) {
      await supabase
        .from("trading_accounts")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("id", accountId)
        .eq("user_id", auth.user.id);
    } else {
      const pool = getPostgresPool();
      await pool?.query(
        `update public.trading_accounts set status = 'error', updated_at = now() where id = $1 and user_id = $2`,
        [accountId, auth.user.id],
      );
    }

    return serverError(message);
  }
}
