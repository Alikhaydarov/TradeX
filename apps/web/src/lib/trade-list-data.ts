import { createClient } from "@/lib/supabase/server";

export type TradeListData = {
  accounts: {
    id: string;
    name: string;
    firm: string;
    account_size: number;
    status: string;
    market_type: string;
  }[];
  trades: {
    id: string;
    prop_account_id: string | null;
    account_name: string;
    symbol: string;
    side: "Long" | "Short";
    entry_price: number;
    exit_price: number;
    quantity: number;
    fees: number;
    pnl: number;
    note: string;
    traded_at: string;
    result_r: number;
  }[];
};

export async function loadTradeList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  accountId: string | null,
  signal?: AbortSignal,
): Promise<TradeListData> {
  let tradesQuery = supabase
    .from("journal_entries")
    .select(
      "id,prop_account_id,account_name,symbol,side,entry_price,exit_price,quantity,fees,pnl,note,traded_at,result_r,created_at",
    )
    .eq("user_id", userId)
    .order("traded_at", { ascending: false })
    .limit(250);
  if (accountId && accountId !== "all")
    tradesQuery = tradesQuery.eq("prop_account_id", accountId);
  const [accountsResult, tradesResult] = await Promise.all([
    supabase
      .from("prop_accounts")
      .select("id,name,firm,account_size,initial_balance,status,market_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    signal ? tradesQuery.abortSignal(signal) : tradesQuery,
  ]);
  if (accountsResult.error || tradesResult.error)
    throw new Error("Your journal could not be loaded. Refresh and try again.");
  return {
    accounts: (accountsResult.data ?? []) as TradeListData["accounts"],
    trades: (tradesResult.data ?? []) as TradeListData["trades"],
  };
}
