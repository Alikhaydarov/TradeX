import { badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashMt5Token } from "@/lib/server/mt5-token";

export const runtime = "nodejs";

type ImportedTrade = {
  id?: string;
  symbol?: string;
  side?: "Long" | "Short";
  entry?: number;
  exit?: number;
  volume?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  closedAt?: string;
};

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token?.startsWith("tw_mt5_")) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Server integration is not configured.");

  const { data: connection, error: connectionError } = await admin.from("mt5_connections")
    .select("id, user_id, prop_account_id")
    .eq("token_hash", hashMt5Token(token)).maybeSingle();
  if (connectionError) return serverError(connectionError.message);
  if (!connection) return unauthorized();

  const body = await request.json().catch(() => null) as { trades?: ImportedTrade[]; accountLogin?: string; server?: string } | null;
  if (!body?.trades?.length) return badRequest("No trades supplied.");
  if (body.trades.length > 500) return badRequest("Maximum 500 trades per request.");

  const { data: account, error: accountError } = await admin.from("prop_accounts").select("*").eq("id", connection.prop_account_id).maybeSingle();
  if (accountError || !account) return badRequest("Prop account not found.");

  const rows = body.trades.flatMap((trade) => {
    const id = String(trade.id || "").trim();
    const symbol = String(trade.symbol || "").trim().toUpperCase();
    const side = trade.side;
    const entry = Number(trade.entry);
    const exit = Number(trade.exit);
    const quantity = Number(trade.volume || 0);
    const pnl = Number(trade.profit || 0) + Number(trade.commission || 0) + Number(trade.swap || 0);
    const closedAt = String(trade.closedAt || "").slice(0, 10);
    if (!id || !symbol || !side || !closedAt || ![entry, exit, quantity, pnl].every(Number.isFinite) || entry <= 0 || exit <= 0 || quantity <= 0) return [];
    return [{
      user_id: connection.user_id, prop_account_id: connection.prop_account_id, symbol, side,
      entry_price: entry, exit_price: exit, quantity, fees: Math.abs(Number(trade.commission || 0)),
      pnl: Number(pnl.toFixed(2)), note: "Imported by TradeWay MT5 EA", traded_at: closedAt,
      account_name: account.name, market_type: account.market_type, setup: "MT5 import",
      risk_amount: 0, result_r: 0, account_size: account.account_size, profit_target: account.profit_target,
      max_drawdown: account.max_drawdown, external_source: "mt5-ea", external_id: id,
    }];
  });

  let imported = 0;
  if (rows.length) {
    const { data, error } = await admin.from("journal_entries")
      .upsert(rows, { onConflict: "user_id,external_source,external_id", ignoreDuplicates: true }).select("id");
    if (error) return serverError(error.message);
    imported = data?.length || 0;
  }
  const now = new Date().toISOString();
  await admin.from("mt5_connections").update({
    login: body.accountLogin?.slice(0, 40) || null,
    server: body.server?.slice(0, 100) || null,
    status: "connected", last_seen_at: now, last_synced_at: now, last_error: null, updated_at: now,
  }).eq("id", connection.id);
  return Response.json({ success: true, imported, received: body.trades.length });
}

