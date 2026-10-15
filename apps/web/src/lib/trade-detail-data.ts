import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const tradeDetailColumns = "id,prop_account_id,account_name,symbol,side,entry_price,exit_price,quantity,fees,pnl,note,traded_at,result_r,risk_amount,market_type,setup,emotion,session,following_plan,error_made,mistake_type,review_completed,image_url,tags,external_source";

export async function loadTradeDetail(supabase: Supabase, userId: string, id: string) {
  return supabase
    .from("journal_entries")
    .select(tradeDetailColumns)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
}
