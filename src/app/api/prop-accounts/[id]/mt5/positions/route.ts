import { authenticateRequest, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

function isMissingPositionsTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("mt5_positions") && message.includes("does not exist");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;

  try {
    const { data, error } = await auth.supabase
      .from("mt5_positions")
      .select("id, account_id, prop_account_id, symbol, side, volume, entry_price, current_price, stop_loss, take_profit, unrealized_pnl, opened_at, status")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", id)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    if (error) throw new Error(error.message);

    return Response.json({
      positions: (data || []).map((row) => ({
        id: row.id,
        accountId: row.account_id,
        propAccountId: row.prop_account_id,
        symbol: row.symbol,
        side: row.side,
        volume: Number(row.volume || 0),
        entryPrice: row.entry_price == null ? null : Number(row.entry_price),
        currentPrice: row.current_price == null ? null : Number(row.current_price),
        stopLoss: row.stop_loss == null ? null : Number(row.stop_loss),
        takeProfit: row.take_profit == null ? null : Number(row.take_profit),
        unrealizedPnl: row.unrealized_pnl == null ? null : Number(row.unrealized_pnl),
        openedAt: row.opened_at,
        status: row.status,
      })),
    });
  } catch (error) {
    if (isMissingPositionsTableError(error)) {
      return Response.json({ positions: [], pendingSetup: true });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Could not load MT5 positions." }, { status: 500 });
  }
}
