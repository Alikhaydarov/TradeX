import { createClient } from "@/lib/supabase/server";
import { getSelectedAccountId } from "@/lib/selected-account";
import { getViewer } from "@/lib/workspace-bootstrap";

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
  const [user, { data, error }] = await Promise.all([
    getViewer(),
    supabase
      .from("journal_entries")
      .select(
        "id,symbol,side,pnl,result_r,risk_amount,traded_at,prop_account_id,account_name",
      )
      .match(selectedAccountId ? { prop_account_id: selectedAccountId } : {})
      .order("traded_at", { ascending: false })
      .limit(1000),
  ]);

  if (error)
    return {
      user,
      trades: [] as JournalTrade[],
      selectedAccountId,
      failed: true,
    };
  const trades = (data ?? []).map((trade) => ({
    ...trade,
    pnl: trade.pnl === null ? null : Number(trade.pnl),
    result_r: trade.result_r === null ? null : Number(trade.result_r),
    risk_amount: trade.risk_amount === null ? null : Number(trade.risk_amount),
  })) as JournalTrade[];
  return { user, trades, selectedAccountId, failed: false };
}

export const money = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export { summarizeTrades } from "@/lib/journal-metrics";
