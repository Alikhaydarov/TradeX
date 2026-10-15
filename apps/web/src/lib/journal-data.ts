import { createClient } from "@/lib/supabase/server";
import { getSelectedAccountId } from "@/lib/selected-account";

export type JournalTrade = {
  id: string;
  symbol: string;
  side: string;
  pnl: number | null;
  result_r: number | null;
  risk_amount: number | null;
  traded_at: string;
  prop_account_id: string | null;
  account_name: string | null;
};

export async function getJournalData() {
  const supabase = await createClient();
  const selectedAccountId = await getSelectedAccountId();
  const [{ data: userData }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("journal_entries")
      .select("id,symbol,side,pnl,result_r,risk_amount,traded_at,prop_account_id,account_name")
      .match(selectedAccountId ? { prop_account_id: selectedAccountId } : {})
      .order("traded_at", { ascending: false })
      .limit(1000),
  ]);

  if (error) return { user: userData.user, trades: [] as JournalTrade[], selectedAccountId, failed: true };
  const trades = (data ?? []).map((trade) => ({
    ...trade,
    pnl: trade.pnl === null ? null : Number(trade.pnl),
    result_r: trade.result_r === null ? null : Number(trade.result_r),
    risk_amount: trade.risk_amount === null ? null : Number(trade.risk_amount),
  })) as JournalTrade[];
  return { user: userData.user, trades, selectedAccountId, failed: false };
}

export const money = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export function summarizeTrades(trades: JournalTrade[]) {
  const pnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const closed = trades.filter((trade) => (trade.pnl ?? 0) !== 0);
  const wins = closed.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const losses = closed.length - wins;
  const rValues = trades.map((trade) => trade.result_r).filter((value): value is number => value !== null && Number.isFinite(value));
  const averageR = rValues.length ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length : 0;
  const grossProfit = trades.reduce((sum, trade) => sum + Math.max(0, trade.pnl ?? 0), 0);
  const grossLoss = trades.reduce((sum, trade) => sum + Math.abs(Math.min(0, trade.pnl ?? 0)), 0);
  return { pnl, closed: closed.length, wins, losses, winRate: closed.length ? wins / closed.length * 100 : 0, averageR, expectancy: closed.length ? pnl / closed.length : 0, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0 };
}
