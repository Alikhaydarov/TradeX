import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadAccountSummaries(supabase: Supabase, userId: string) {
  const [accounts, entries] = await Promise.all([
    supabase
      .from("prop_accounts")
      .select(
        "id,name,firm,phase,market_type,account_size,initial_balance,profit_target,max_drawdown,daily_drawdown,start_date,status,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("prop_account_id,pnl")
      .eq("user_id", userId)
      .limit(5000),
  ]);
  if (accounts.error || entries.error)
    throw new Error("Accounts could not be loaded. Please refresh.");
  const summaries = new Map<string, { pnl: number; trades: number }>();
  for (const entry of entries.data ?? []) {
    if (!entry.prop_account_id) continue;
    const summary = summaries.get(entry.prop_account_id) ?? {
      pnl: 0,
      trades: 0,
    };
    summary.pnl += Number(entry.pnl) || 0;
    summary.trades += 1;
    summaries.set(entry.prop_account_id, summary);
  }
  return (accounts.data ?? []).map((account) => ({
    ...account,
    pnl: summaries.get(account.id)?.pnl ?? 0,
    trades: summaries.get(account.id)?.trades ?? 0,
  }));
}
