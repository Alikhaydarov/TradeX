import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getMt5Deals, type MetaApiDeal } from "@/lib/server/metaapi";

export const runtime = "nodejs";

function groupDeals(deals: MetaApiDeal[]) {
  const groups = new Map<string, MetaApiDeal[]>();
  deals.forEach((deal) => {
    const key = deal.positionId || deal.id;
    groups.set(key, [...(groups.get(key) || []), deal]);
  });
  return [...groups.entries()].flatMap(([positionId, items]) => {
    const ordered = items.sort((a, b) => a.time.localeCompare(b.time));
    const entry = ordered.find((deal) => deal.entryType === "DEAL_ENTRY_IN") || ordered[0];
    const exit = [...ordered].reverse().find((deal) => deal.entryType === "DEAL_ENTRY_OUT" || deal.entryType === "DEAL_ENTRY_OUT_BY");
    if (!entry || !exit) return [];
    const pnl = ordered.reduce((sum, deal) => sum + Number(deal.profit || 0) + Number(deal.commission || 0) + Number(deal.swap || 0), 0);
    return [{ positionId, entry, exit, pnl }];
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const [{ data: account }, { data: connection }] = await Promise.all([
    auth.supabase.from("prop_accounts").select("*").eq("id", id).eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.from("mt5_connections").select("*").eq("prop_account_id", id).eq("user_id", auth.user.id).maybeSingle(),
  ]);
  if (!account || !connection?.metaapi_account_id) return badRequest("Connect MT5 in Settings first.");

  try {
    const end = new Date();
    const start = connection.last_synced_at ? new Date(connection.last_synced_at) : new Date(Date.now() - 365 * 86400000);
    const trades = groupDeals(await getMt5Deals(connection.metaapi_account_id, start.toISOString(), end.toISOString()));
    const rows = trades.map(({ positionId, entry, exit, pnl }) => ({
      user_id: auth.user.id,
      prop_account_id: id,
      symbol: entry.symbol,
      side: entry.type.includes("BUY") ? "Long" : "Short",
      entry_price: entry.price,
      exit_price: exit.price,
      quantity: entry.volume || 1,
      fees: Math.abs(Number(entry.commission || 0) + Number(exit.commission || 0)),
      pnl: Number(pnl.toFixed(2)),
      note: "Imported from MetaTrader 5",
      traded_at: exit.time.slice(0, 10),
      account_name: account.name,
      market_type: account.market_type,
      setup: "MT5 import",
      risk_amount: 0,
      result_r: 0,
      account_size: account.account_size,
      profit_target: account.profit_target,
      max_drawdown: account.max_drawdown,
      external_source: "mt5",
      external_id: positionId,
    }));

    let imported = 0;
    if (rows.length) {
      const { data, error } = await auth.supabase.from("journal_entries")
        .upsert(rows, { onConflict: "user_id,external_source,external_id", ignoreDuplicates: true }).select("id");
      if (error) return serverError(error.message);
      imported = data?.length || 0;
    }
    await auth.supabase.from("mt5_connections").update({ status: "connected", last_error: null, last_synced_at: end.toISOString(), updated_at: end.toISOString() }).eq("id", connection.id);
    return Response.json({ imported, scanned: trades.length, lastSyncedAt: end.toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 sync failed.";
    await auth.supabase.from("mt5_connections").update({ status: "error", last_error: message, updated_at: new Date().toISOString() }).eq("id", connection.id);
    return badRequest(message);
  }
}

