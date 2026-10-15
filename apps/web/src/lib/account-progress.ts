import { createClient } from "@/lib/supabase/server";
import { getSelectedAccountId } from "@/lib/selected-account";
import type { JournalTrade } from "@/lib/journal-data";

export type TrackedAccount = {
  id: string;
  name: string;
  firm: string | null;
  phase: string | null;
  account_size: number | null;
  initial_balance: number | null;
  profit_target: number | null;
  max_drawdown: number | null;
  daily_drawdown: number | null;
  start_date: string | null;
  status: string | null;
};

export async function getAccountProgress() {
  const supabase = await createClient();
  const [{ data: auth }, selectedAccountId] = await Promise.all([
    supabase.auth.getUser(),
    getSelectedAccountId(),
  ]);
  const user = auth.user;

  if (!user || !selectedAccountId) {
    return { account: null, trades: [] as JournalTrade[], failed: false };
  }

  const [{ data: account, error: accountError }, { data: trades, error: tradesError }] = await Promise.all([
    supabase
      .from("prop_accounts")
      .select("id,name,firm,phase,account_size,initial_balance,profit_target,max_drawdown,daily_drawdown,start_date,status")
      .eq("id", selectedAccountId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("id,symbol,side,pnl,result_r,risk_amount,traded_at,prop_account_id,account_name")
      .eq("prop_account_id", selectedAccountId)
      .order("traded_at", { ascending: false })
      .limit(1000),
  ]);

  if (accountError || tradesError) return { account: null, trades: [] as JournalTrade[], failed: true };
  if (!account) return { account: null, trades: [] as JournalTrade[], failed: false };

  return {
    account: {
      ...account,
      account_size: account.account_size === null ? null : Number(account.account_size),
      initial_balance: account.initial_balance === null ? null : Number(account.initial_balance),
      profit_target: account.profit_target === null ? null : Number(account.profit_target),
      max_drawdown: account.max_drawdown === null ? null : Number(account.max_drawdown),
      daily_drawdown: account.daily_drawdown === null ? null : Number(account.daily_drawdown),
    } as TrackedAccount,
    trades: (trades ?? []).map((trade) => ({
      ...trade,
      pnl: trade.pnl === null ? null : Number(trade.pnl),
      result_r: trade.result_r === null ? null : Number(trade.result_r),
      risk_amount: trade.risk_amount === null ? null : Number(trade.risk_amount),
    })) as JournalTrade[],
    failed: false,
  };
}
