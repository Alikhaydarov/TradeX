import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProfileInsights(supabase: SupabaseClient, userId: string) {
  const [journal, achievements] = await Promise.all([
    supabase.from("journal_entries").select("pnl, result_r").eq("user_id", userId),
    supabase.from("profile_achievements").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
  ]);

  const trades = journal.data ?? [];
  const wins = trades.filter((trade) => Number(trade.pnl) > 0).length;
  const netPnl = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const averageR = trades.length
    ? trades.reduce((sum, trade) => sum + Number(trade.result_r || 0), 0) / trades.length
    : 0;

  return {
    stats: {
      trades: trades.length,
      winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
      netPnl: Number(netPnl.toFixed(2)),
      averageR: Number(averageR.toFixed(2)),
    },
    achievements: achievements.error ? [] : (achievements.data ?? []),
  };
}
