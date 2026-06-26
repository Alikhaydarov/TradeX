import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
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
  last_synced_at: string | null;
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

async function updateConnectionError(accountId: string, userId: string, message: string) {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    await supabase
      .from("trading_accounts")
      .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .eq("user_id", userId);
    return;
  }

  const pool = getPostgresPool();
  await pool?.query(
    `update public.trading_accounts
     set status = 'error', last_error = $3, updated_at = now()
     where id = $1 and user_id = $2`,
    [accountId, userId, message],
  );
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
    const password = decryptSecret(account.encrypted_password);
    const bridgeTrades = await getMt5ClosedTrades({
      login: account.account_login,
      password,
      server: account.broker_server,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const incoming = bridgeTrades.map((trade) => toIncomingTrade(trade as Record<string, unknown>));
    const result = supabase
      ? await importMt5TradesToJournal(supabase, account.id, incoming)
      : await importMt5TradesToJournalViaPostgres(account.id, incoming);

    return Response.json({
      ...result,
      message: result.imported > 0 ? "Trades imported into journal." : "No new closed trades found.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 sync failed.";
    await updateConnectionError(account.id, auth.user.id, message);
    return Response.json({ error: message }, { status: 502 });
  }
}
