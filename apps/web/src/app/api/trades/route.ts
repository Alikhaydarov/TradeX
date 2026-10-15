import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";
import { loadTradeList } from "@/lib/trade-list-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const accountId = new URL(request.url).searchParams.get("account");
  if (accountId && accountId !== "all" && !/^[0-9a-f-]{36}$/i.test(accountId))
    return NextResponse.json({ error: "Invalid account." }, { status: 400 });
  try {
    const data = await loadTradeList(
      auth.supabase,
      auth.user.id,
      accountId,
      request.signal,
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Your journal could not be loaded. Refresh and try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid trade details." },
      { status: 400 },
    );
  }

  const symbol =
    typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const side = body.side === "Long" || body.side === "Short" ? body.side : null;
  const entry = Number(body.entryPrice);
  const exit = Number(body.exitPrice);
  const quantity = Number(body.quantity ?? 1);
  const fees = Number(body.fees ?? 0);
  const risk = Number(body.riskAmount ?? 0);
  const date = typeof body.tradedAt === "string" ? body.tradedAt : "";
  const dateValue = new Date(`${date}T00:00:00.000Z`);
  if (
    !/^[A-Z0-9._-]{2,20}$/.test(symbol) ||
    !side ||
    ![entry, exit, quantity, fees, risk].every(Number.isFinite) ||
    entry <= 0 ||
    exit <= 0 ||
    quantity <= 0 ||
    fees < 0 ||
    risk < 0 ||
    Number.isNaN(dateValue.getTime()) ||
    dateValue.toISOString().slice(0, 10) !== date
  ) {
    return NextResponse.json(
      { error: "Check symbol, side, prices, size, fees and trade date." },
      { status: 400 },
    );
  }

  let account: { id: string; name: string; market_type: string } | null = null;
  if (typeof body.accountId === "string" && body.accountId) {
    const result = await auth.supabase
      .from("prop_accounts")
      .select("id,name,market_type")
      .eq("id", body.accountId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (result.error || !result.data)
      return NextResponse.json(
        { error: "Choose one of your own trading accounts." },
        { status: 400 },
      );
    account = result.data;
  }

  const pnl = (side === "Long" ? exit - entry : entry - exit) * quantity - fees;
  const resultR = risk > 0 ? pnl / risk : 0;
  const { data, error } = await auth.supabase
    .from("journal_entries")
    .insert({
      user_id: auth.user.id,
      prop_account_id: account?.id ?? null,
      account_name: account?.name ?? "Main account",
      market_type: account?.market_type ?? "CFD",
      symbol,
      side,
      entry_price: entry,
      exit_price: exit,
      quantity,
      fees,
      pnl,
      note:
        typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "",
      traded_at: date,
      risk_amount: risk,
      result_r: resultR,
    })
    .select(
      "id,prop_account_id,account_name,symbol,side,entry_price,exit_price,quantity,fees,pnl,note,traded_at,result_r,created_at",
    )
    .single();

  if (error || !data)
    return NextResponse.json(
      { error: "Trade could not be saved. Please retry." },
      { status: 500 },
    );
  return NextResponse.json(
    { trade: data },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
