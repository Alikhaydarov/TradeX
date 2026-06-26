import type { SupabaseClient } from "@supabase/supabase-js";
import { getPostgresPool } from "@/lib/backend/postgres";

export interface IncomingMt5Trade {
  externalDealId?: unknown;
  externalPositionId?: unknown;
  symbol?: unknown;
  side?: unknown;
  volume?: unknown;
  entryPrice?: unknown;
  exitPrice?: unknown;
  commission?: unknown;
  swap?: unknown;
  grossPnl?: unknown;
  netPnl?: unknown;
  openedAt?: unknown;
  closedAt?: unknown;
  status?: unknown;
}

interface TradingAccountImportRow {
  id: string;
  user_id: string;
  prop_account_id: string | null;
  account_login: string | null;
  broker_server: string | null;
}

interface PropAccountImportRow {
  id: string;
  name: string | null;
  market_type: string | null;
  account_size: number | string | null;
  profit_target: number | string | null;
  max_drawdown: number | string | null;
}

export interface Mt5ImportResult {
  imported: number;
  skipped: number;
  journalImported: number;
  total: number;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asDate(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnly(value: string | null) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function normalizeSide(value: string) {
  const upper = value.toUpperCase();
  if (upper === "SELL" || upper === "SHORT") return "Short";
  return "Long";
}

function safePositive(value: number | null, fallback = 1) {
  return value && value > 0 ? value : fallback;
}

function safeMoney(value: number | null) {
  return value ?? 0;
}

export async function importMt5TradesToJournal(
  supabase: SupabaseClient,
  accountId: string,
  trades: IncomingMt5Trade[],
): Promise<Mt5ImportResult> {
  const { data: account, error: accountError } = await supabase
    .from("trading_accounts")
    .select("id, user_id, prop_account_id, account_login, broker_server")
    .eq("id", accountId)
    .single<TradingAccountImportRow>();

  if (accountError) throw new Error(accountError.message);
  if (!account) throw new Error("Trading account not found.");

  let propAccount: PropAccountImportRow | null = null;
  if (account.prop_account_id) {
    const { data, error } = await supabase
      .from("prop_accounts")
      .select("id, name, market_type, account_size, profit_target, max_drawdown")
      .eq("id", account.prop_account_id)
      .single<PropAccountImportRow>();
    if (error) throw new Error(error.message);
    propAccount = data;
  }

  const rawRows = [];
  const normalizedRows = [];
  const journalRows = [];
  let skipped = 0;

  for (const trade of trades) {
    const externalDealId = asString(trade.externalDealId);
    const externalPositionId = asString(trade.externalPositionId);
    const externalId = externalDealId || externalPositionId;
    if (!externalId) {
      skipped += 1;
      continue;
    }

    const uniqueKey = `MT5:${accountId}:${externalId}`;
    const symbol = asString(trade.symbol).toUpperCase();
    if (!symbol) {
      skipped += 1;
      continue;
    }

    const entryPrice = safePositive(asNumber(trade.entryPrice));
    const exitPrice = safePositive(asNumber(trade.exitPrice), entryPrice);
    const volume = safePositive(asNumber(trade.volume));
    const commission = safeMoney(asNumber(trade.commission));
    const swap = safeMoney(asNumber(trade.swap));
    const grossPnl = asNumber(trade.grossPnl);
    const netPnl = asNumber(trade.netPnl) ?? grossPnl ?? 0;
    const closedAt = asDate(trade.closedAt);
    const openedAt = asDate(trade.openedAt);
    const side = normalizeSide(asString(trade.side));

    const payload = {
      accountId,
      externalDealId,
      externalPositionId,
      symbol,
      side,
      volume,
      entryPrice,
      exitPrice,
      commission,
      swap,
      grossPnl,
      netPnl,
      openedAt,
      closedAt,
      status: asString(trade.status) || "closed",
    };

    rawRows.push({
      account_id: accountId,
      platform: "MT5",
      external_id: externalId,
      unique_key: uniqueKey,
      payload,
      received_at: new Date().toISOString(),
    });

    normalizedRows.push({
      account_id: accountId,
      platform: "MT5",
      external_position_id: externalPositionId || externalDealId,
      symbol,
      side,
      volume,
      entry_price: entryPrice,
      exit_price: exitPrice,
      commission,
      swap,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
      opened_at: openedAt,
      closed_at: closedAt,
      status: payload.status,
      unique_key: uniqueKey,
    });

    journalRows.push({
      user_id: account.user_id,
      prop_account_id: account.prop_account_id,
      account_name: propAccount?.name || `MT5 ${account.account_login || ""}`.trim(),
      market_type: propAccount?.market_type || "CFD",
      account_size: Number(propAccount?.account_size || 0),
      profit_target: Number(propAccount?.profit_target || 0),
      max_drawdown: Number(propAccount?.max_drawdown || 0),
      symbol,
      side,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity: volume,
      fees: Math.abs(commission + swap),
      pnl: netPnl,
      setup: "MT5 Auto Sync",
      emotion: "Neutral",
      risk_amount: 0,
      result_r: 0,
      note: `Imported from MT5 ${account.broker_server || ""}`.trim(),
      traded_at: toDateOnly(closedAt || openedAt),
      tags: ["mt5", "auto-sync"],
      external_source: "mt5",
      external_id: uniqueKey,
      updated_at: new Date().toISOString(),
    });
  }

  if (rawRows.length) {
    const { error } = await supabase.from("raw_trade_events").upsert(rawRows, { onConflict: "unique_key" });
    if (error) throw new Error(error.message);
  }

  if (normalizedRows.length) {
    const { error } = await supabase.from("trades").upsert(normalizedRows, { onConflict: "unique_key" });
    if (error) throw new Error(error.message);
  }

  if (journalRows.length) {
    const { error } = await supabase
      .from("journal_entries")
      .upsert(journalRows, { onConflict: "user_id,external_source,external_id" });
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("trading_accounts")
    .update({ last_synced_at: new Date().toISOString(), status: "connected", updated_at: new Date().toISOString() })
    .eq("id", accountId);

  return {
    imported: normalizedRows.length,
    skipped,
    journalImported: journalRows.length,
    total: trades.length,
  };
}

export async function importMt5TradesToJournalViaPostgres(
  accountId: string,
  trades: IncomingMt5Trade[],
): Promise<Mt5ImportResult> {
  const pool = getPostgresPool();
  if (!pool) throw new Error("DATABASE_URL or SUPABASE_DB_URL is not configured.");

  const client = await pool.connect();
  try {
    await client.query("begin");

    const accountResult = await client.query<TradingAccountImportRow>(
      `select id, user_id, prop_account_id, account_login, broker_server
       from public.trading_accounts
       where id = $1
       limit 1`,
      [accountId],
    );
    const account = accountResult.rows[0];
    if (!account) throw new Error("Trading account not found.");

    let propAccount: PropAccountImportRow | null = null;
    if (account.prop_account_id) {
      const propResult = await client.query<PropAccountImportRow>(
        `select id, name, market_type, account_size, profit_target, max_drawdown
         from public.prop_accounts
         where id = $1
         limit 1`,
        [account.prop_account_id],
      );
      propAccount = propResult.rows[0] || null;
    }

    let imported = 0;
    let journalImported = 0;
    let skipped = 0;

    for (const trade of trades) {
      const externalDealId = asString(trade.externalDealId);
      const externalPositionId = asString(trade.externalPositionId);
      const externalId = externalDealId || externalPositionId;
      const symbol = asString(trade.symbol).toUpperCase();
      if (!externalId || !symbol) {
        skipped += 1;
        continue;
      }

      const uniqueKey = `MT5:${accountId}:${externalId}`;
      const entryPrice = safePositive(asNumber(trade.entryPrice));
      const exitPrice = safePositive(asNumber(trade.exitPrice), entryPrice);
      const volume = safePositive(asNumber(trade.volume));
      const commission = safeMoney(asNumber(trade.commission));
      const swap = safeMoney(asNumber(trade.swap));
      const grossPnl = asNumber(trade.grossPnl);
      const netPnl = asNumber(trade.netPnl) ?? grossPnl ?? 0;
      const closedAt = asDate(trade.closedAt);
      const openedAt = asDate(trade.openedAt);
      const side = normalizeSide(asString(trade.side));
      const status = asString(trade.status) || "closed";
      const payload = {
        accountId,
        externalDealId,
        externalPositionId,
        symbol,
        side,
        volume,
        entryPrice,
        exitPrice,
        commission,
        swap,
        grossPnl,
        netPnl,
        openedAt,
        closedAt,
        status,
      };

      await client.query(
        `insert into public.raw_trade_events (account_id, platform, external_id, unique_key, payload, received_at)
         values ($1, 'MT5', $2, $3, $4::jsonb, now())
         on conflict (unique_key) do update set payload = excluded.payload, received_at = excluded.received_at`,
        [accountId, externalId, uniqueKey, JSON.stringify(payload)],
      );

      await client.query(
        `insert into public.trades (
          account_id, platform, external_position_id, symbol, side, volume, entry_price, exit_price,
          commission, swap, gross_pnl, net_pnl, opened_at, closed_at, status, unique_key
        )
        values ($1, 'MT5', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        on conflict (unique_key) do update set
          external_position_id = excluded.external_position_id,
          symbol = excluded.symbol,
          side = excluded.side,
          volume = excluded.volume,
          entry_price = excluded.entry_price,
          exit_price = excluded.exit_price,
          commission = excluded.commission,
          swap = excluded.swap,
          gross_pnl = excluded.gross_pnl,
          net_pnl = excluded.net_pnl,
          opened_at = excluded.opened_at,
          closed_at = excluded.closed_at,
          status = excluded.status`,
        [
          accountId,
          externalPositionId || externalDealId,
          symbol,
          side,
          volume,
          entryPrice,
          exitPrice,
          commission,
          swap,
          grossPnl,
          netPnl,
          openedAt,
          closedAt,
          status,
          uniqueKey,
        ],
      );
      imported += 1;

      const journalResult = await client.query(
        `insert into public.journal_entries (
          user_id, prop_account_id, account_name, market_type, account_size, profit_target, max_drawdown,
          symbol, side, entry_price, exit_price, quantity, fees, pnl, setup, emotion, risk_amount,
          result_r, note, traded_at, tags, external_source, external_id, updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, 'MT5 Auto Sync', 'Neutral', 0,
          0, $15, $16, array['mt5','auto-sync'], 'mt5', $17, now()
        )
        on conflict (user_id, external_source, external_id)
        where external_source is not null and external_id is not null
        do update set
          symbol = excluded.symbol,
          side = excluded.side,
          entry_price = excluded.entry_price,
          exit_price = excluded.exit_price,
          quantity = excluded.quantity,
          fees = excluded.fees,
          pnl = excluded.pnl,
          traded_at = excluded.traded_at,
          updated_at = now()
        returning id`,
        [
          account.user_id,
          account.prop_account_id,
          propAccount?.name || `MT5 ${account.account_login || ""}`.trim(),
          propAccount?.market_type || "CFD",
          Number(propAccount?.account_size || 0),
          Number(propAccount?.profit_target || 0),
          Number(propAccount?.max_drawdown || 0),
          symbol,
          side,
          entryPrice,
          exitPrice,
          volume,
          Math.abs(commission + swap),
          netPnl,
          `Imported from MT5 ${account.broker_server || ""}`.trim(),
          toDateOnly(closedAt || openedAt),
          uniqueKey,
        ],
      );
      journalImported += journalResult.rowCount || 0;
    }

    await client.query(
      `update public.trading_accounts
       set last_synced_at = now(), status = 'connected', updated_at = now()
       where id = $1`,
      [accountId],
    );
    await client.query("commit");

    return { imported, skipped, journalImported, total: trades.length };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
