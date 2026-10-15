import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";
import { loadTradeDetail, tradeDetailColumns } from "@/lib/trade-detail-data";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid trade." }, { status: 400 });
  const { data, error } = await loadTradeDetail(auth.supabase, auth.user.id, id);
  if (error) return NextResponse.json({ error: "Trade could not be loaded." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Trade was not found." }, { status: 404 });
  return NextResponse.json({ trade: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid trade." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid review." }, { status: 400 }); }
  const field = (key: string, max: number) => typeof body[key] === "string" ? body[key].trim().slice(0, max) : "";
  if (typeof body.note === "string" && body.note.length > 5000) return NextResponse.json({ error: "Notes are too long." }, { status: 400 });
  const { data: existing } = await auth.supabase.from("journal_entries").select("id,external_source")
    .eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Trade was not found." }, { status: 404 });
  const updates: Record<string, unknown> = {
    setup: field("setup", 120), session: field("session", 80), emotion: field("emotion", 80),
    mistake_type: field("mistakeType", 160), note: field("note", 5000),
    following_plan: body.followingPlan === "on", error_made: body.errorMade === "on",
    review_completed: body.reviewCompleted === "on", updated_at: new Date().toISOString(),
  };
  if (!existing.external_source) {
    const symbol = field("symbol", 20).toUpperCase();
    const side = body.side;
    const entry = Number(body.entryPrice);
    const exit = Number(body.exitPrice);
    const quantity = Number(body.quantity);
    const fees = Number(body.fees);
    const risk = Number(body.riskAmount);
    const date = field("tradedAt", 10);
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (!/^[A-Z0-9._-]{2,20}$/.test(symbol) || (side !== "Long" && side !== "Short") ||
      ![entry, exit, quantity, fees, risk].every(Number.isFinite) || entry <= 0 || exit <= 0 || quantity <= 0 || fees < 0 || risk < 0 ||
      Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date)
      return NextResponse.json({ error: "Check symbol, side, prices, size, fees, risk and date." }, { status: 400 });
    const pnl = (side === "Long" ? exit - entry : entry - exit) * quantity - fees;
    Object.assign(updates, { symbol, side, entry_price: entry, exit_price: exit, quantity, fees, risk_amount: risk,
      traded_at: date, pnl, result_r: risk > 0 ? pnl / risk : 0 });
  }
  const { data, error } = await auth.supabase.from("journal_entries").update(updates)
    .eq("id", id).eq("user_id", auth.user.id).select(tradeDetailColumns).maybeSingle();
  if (error) return NextResponse.json({ error: "Review could not be saved." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Trade was not found." }, { status: 404 });
  return NextResponse.json({ trade: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("journal_entries").delete().eq("id", id).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Trade could not be deleted." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Trade was not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
