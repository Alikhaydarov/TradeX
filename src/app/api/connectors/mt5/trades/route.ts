import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface IncomingTrade {
  externalDealId?: unknown;
  externalPositionId?: unknown;
  symbol?: unknown;
  side?: unknown;
  volume?: unknown;
  entryPrice?: unknown;
  exitPrice?: unknown;
  commission?: unknown;
  swap?: unknown;
  grossPnl?: unknown;
  netPnl?: unknown;
  openedAt?: unknown;
  closedAt?: unknown;
  status?: unknown;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asDate(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function POST(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized connector request." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: "Supabase service role is not configured." }, { status: 500 });

  const body = await request.json() as { accountId?: unknown; trades?: unknown };
  const accountId = asString(body.accountId);
  const trades = Array.isArray(body.trades) ? body.trades as IncomingTrade[] : [];
  if (!accountId || !trades.length) {
    return Response.json({ error: "accountId and trades are required." }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;

  for (const trade of trades) {
    const externalDealId = asString(trade.externalDealId);
    const externalPositionId = asString(trade.externalPositionId);
    const externalId = externalDealId || externalPositionId;
    if (!externalId) {
      skipped += 1;
      continue;
    }

    const uniqueKey = `MT5:${accountId}:${externalId}`;
    const payload = {
      accountId,
      externalDealId,
      externalPositionId,
      symbol: asString(trade.symbol),
      side: asString(trade.side),
      volume: asNumber(trade.volume),
      entryPrice: asNumber(trade.entryPrice),
      exitPrice: asNumber(trade.exitPrice),
      commission: asNumber(trade.commission) ?? 0,
      swap: asNumber(trade.swap) ?? 0,
      grossPnl: asNumber(trade.grossPnl),
      netPnl: asNumber(trade.netPnl),
      openedAt: asDate(trade.openedAt),
      closedAt: asDate(trade.closedAt),
      status: asString(trade.status) || "closed",
    };

    const raw = await supabase.from("raw_trade_events").upsert({
      account_id: accountId,
      platform: "MT5",
      external_id: externalId,
      unique_key: uniqueKey,
      payload,
      received_at: new Date().toISOString(),
    }, { onConflict: "unique_key" });

    if (raw.error) return Response.json({ error: raw.error.message }, { status: 500 });

    const normalized = await supabase.from("trades").upsert({
      account_id: accountId,
      platform: "MT5",
      external_position_id: externalPositionId || externalDealId,
      symbol: payload.symbol,
      side: payload.side,
      volume: payload.volume,
      entry_price: payload.entryPrice,
      exit_price: payload.exitPrice,
      commission: payload.commission,
      swap: payload.swap,
      gross_pnl: payload.grossPnl,
      net_pnl: payload.netPnl,
      opened_at: payload.openedAt,
      closed_at: payload.closedAt,
      status: payload.status,
      unique_key: uniqueKey,
    }, { onConflict: "unique_key" });

    if (normalized.error) return Response.json({ error: normalized.error.message }, { status: 500 });
    imported += 1;
  }

  await supabase
    .from("trading_accounts")
    .update({ last_synced_at: new Date().toISOString(), status: "connected", updated_at: new Date().toISOString() })
    .eq("id", accountId);

  return Response.json({ imported, skipped, total: trades.length });
}
