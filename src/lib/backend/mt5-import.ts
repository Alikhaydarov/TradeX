import type { SupabaseClient } from "@supabase/supabase-js";

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
