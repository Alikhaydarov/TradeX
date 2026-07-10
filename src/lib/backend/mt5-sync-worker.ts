import { decryptSecret } from "@/lib/backend/crypto";
import {
  claimMt5SyncJobs,
  completeMt5SyncJob,
  failMt5SyncJob,
} from "@/lib/backend/mt5-sync-queue";
import {
  importMt5TradesToJournalViaPostgres,
  type IncomingMt5Trade,
} from "@/lib/backend/mt5-import";
import { getPostgresPool } from "@/lib/backend/postgres";
import { isMt5ApiConfigured, syncNowMt5Api } from "@/lib/server/mt5-api";
import { getMt5ClosedTrades } from "@/lib/server/mt5-bridge";

type TradingAccountSyncRow = {
  id: string;
  user_id: string;
  prop_account_id: string | null;
  broker_server: string | null;
  account_login: string | null;
  encrypted_password: string | null;
};

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

function defaultFrom() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString();
}

async function getAccount(accountId: string) {
  const pool = getPostgresPool();
  if (!pool) throw new Error("DATABASE_URL or SUPABASE_DB_URL is required for MT5 queue worker.");
  const result = await pool.query<TradingAccountSyncRow>(
    `select id, user_id, prop_account_id, broker_server, account_login, encrypted_password
     from public.trading_accounts
     where id = $1
     limit 1`,
    [accountId],
  );
  return result.rows[0] || null;
}

async function ensurePremium(userId: string) {
  const pool = getPostgresPool();
  if (!pool) throw new Error("DATABASE_URL or SUPABASE_DB_URL is required for MT5 queue worker.");
  const result = await pool.query<{ plan: string | null; premium_until: string | null; auto_sync_enabled: boolean | null }>(
    `select plan, premium_until, auto_sync_enabled
     from public.profiles
     where id = $1
     limit 1`,
    [userId],
  );
  const profile = result.rows[0];
  const premiumActive = profile?.plan === "premium" && (!profile.premium_until || new Date(profile.premium_until).getTime() > Date.now());
  if (!premiumActive || profile.auto_sync_enabled === false) throw new Error("MT5 Auto Sync requires active Premium.");
}

async function syncAccount(account: TradingAccountSyncRow, from: string, to: string) {
  if (isMt5ApiConfigured()) {
    const result = await syncNowMt5Api({
      userId: account.user_id,
      accountId: account.id,
      propAccountId: account.prop_account_id || undefined,
    });

    return {
      imported: Number(result.imported || 0),
      skipped: 0,
      journalImported: Number(result.imported || 0),
      total: Number(result.total || result.imported || 0),
    };
  }

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

  return importMt5TradesToJournalViaPostgres(
    account.id,
    bridgeTrades.map((trade) => toIncomingTrade(trade as Record<string, unknown>)),
  );
}

export async function runMt5SyncQueue(limit = 10) {
  const claimed = await claimMt5SyncJobs(limit);
  const results = [];

  for (const job of claimed) {
    try {
      const account = await getAccount(job.account_id);
      if (!account) throw new Error("Trading account not found.");
      await ensurePremium(account.user_id);

      const result = await syncAccount(
        account,
        job.requested_from || defaultFrom(),
        job.requested_to || new Date().toISOString(),
      );
      await completeMt5SyncJob(job.id);
      results.push({ jobId: job.id, accountId: job.account_id, ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "MT5 queue job failed.";
      await failMt5SyncJob(job.id, job.attempts, message);
      results.push({ jobId: job.id, accountId: job.account_id, ok: false, error: message });
    }
  }

  return { claimed: claimed.length, results };
}
