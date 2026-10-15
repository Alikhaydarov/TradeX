import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/connector-crypto";
import { getMt5ClosedTrades } from "@/lib/mt5-bridge";

export async function syncMt5Account(supabase: SupabaseClient, userId: string, propAccountId: string) {
  const [{ data: account }, { data: connection }] = await Promise.all([
    supabase.from("prop_accounts").select("id,name,market_type,account_size,profit_target,max_drawdown")
      .eq("id", propAccountId).eq("user_id", userId).maybeSingle(),
    supabase.from("trading_accounts").select("id,account_login,broker_server,encrypted_password,last_synced_at")
      .eq("user_id", userId).eq("prop_account_id", propAccountId).eq("platform", "MT5")
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!account || !connection?.account_login || !connection.broker_server || !connection.encrypted_password)
    throw new Error("Connect the MT5 account first.");
  try {
    const to = new Date();
    const from = connection.last_synced_at
      ? new Date(new Date(connection.last_synced_at).getTime() - 7 * 86400000)
      : new Date(to.getTime() - 730 * 86400000);
    const closed = await getMt5ClosedTrades({ login: connection.account_login, server: connection.broker_server,
      password: decryptSecret(connection.encrypted_password), from: from.toISOString(), to: to.toISOString() });
    const rows = closed.flatMap((trade) => {
      const externalId = String(trade.ticket ?? trade.id ?? trade.positionId ?? "");
      const tradedAt = trade.closeTime ? new Date(trade.closeTime) : null;
      if (!externalId || !tradedAt || Number.isNaN(tradedAt.getTime())) return [];
      return [{ user_id: userId, prop_account_id: account.id, account_name: account.name,
        market_type: account.market_type, symbol: trade.symbol, side: /sell|short/i.test(String(trade.side ?? trade.type ?? "")) ? "Short" : "Long",
        entry_price: Number(trade.entryPrice) || 0, exit_price: Number(trade.exitPrice) || 0,
        quantity: Number(trade.volume) || 0, fees: Math.abs(Number(trade.commission) || 0),
        pnl: Number(trade.pnl) || 0, note: "", traded_at: tradedAt.toISOString().slice(0, 10),
        risk_amount: 0, result_r: 0, external_source: "mt5", external_id: `${connection.id}:${externalId}`,
        account_size: Number(account.account_size) || 0, profit_target: Number(account.profit_target) || 0,
        max_drawdown: Number(account.max_drawdown) || 0 }];
    });
    let imported = 0;
    for (let index = 0; index < rows.length; index += 250) {
      const { data, error } = await supabase.from("journal_entries")
        .upsert(rows.slice(index, index + 250), { onConflict: "user_id,external_source,external_id", ignoreDuplicates: true }).select("id");
      if (error) throw error;
      imported += data?.length ?? 0;
    }
    await supabase.from("trading_accounts").update({ status: "connected", last_error: null,
      last_synced_at: to.toISOString(), updated_at: to.toISOString() }).eq("id", connection.id).eq("user_id", userId);
    return { imported, scanned: closed.length };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 300) : "MT5 sync failed.";
    await supabase.from("trading_accounts").update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", connection.id).eq("user_id", userId);
    throw new Error(message);
  }
}
