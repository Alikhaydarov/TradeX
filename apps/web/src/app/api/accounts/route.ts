import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const [accounts, entries] = await Promise.all([
    auth.supabase.from("prop_accounts").select("id,name,firm,phase,market_type,account_size,initial_balance,profit_target,max_drawdown,daily_drawdown,start_date,status,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
    auth.supabase.from("journal_entries").select("prop_account_id,pnl").eq("user_id", auth.user.id).limit(5000),
  ]);
  if (accounts.error || entries.error) return NextResponse.json({ error: "Accounts could not be loaded. Please refresh." }, { status: 500 });
  const summaries = new Map<string, { pnl: number; trades: number }>();
  for (const entry of entries.data ?? []) {
    if (!entry.prop_account_id) continue;
    const summary = summaries.get(entry.prop_account_id) ?? { pnl: 0, trades: 0 };
    summary.pnl += Number(entry.pnl) || 0;
    summary.trades += 1;
    summaries.set(entry.prop_account_id, summary);
  }
  const result = (accounts.data ?? []).map((account) => ({ ...account, ...summaries.get(account.id), pnl: summaries.get(account.id)?.pnl ?? 0, trades: summaries.get(account.id)?.trades ?? 0 }));
  return NextResponse.json({ accounts: result }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid account details." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const accountSize = Number(body.accountSize);
  const initialBalance = Number(body.initialBalance ?? accountSize);
  const profitTarget = Number(body.profitTarget ?? 0);
  const maxDrawdown = Number(body.maxDrawdown ?? 0);
  const dailyDrawdown = Number(body.dailyDrawdown ?? 0);
  const marketType = body.marketType === "Forex" || body.marketType === "Futures" || body.marketType === "Crypto" ? body.marketType : "CFD";
  if (name.length < 2 || name.length > 80 || ![accountSize, initialBalance, profitTarget, maxDrawdown, dailyDrawdown].every(Number.isFinite) || accountSize <= 0 || initialBalance <= 0 || profitTarget < 0 || maxDrawdown < 0 || dailyDrawdown < 0) {
    return NextResponse.json({ error: "Check the account name, size and limits." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.from("prop_accounts").insert({
    user_id: auth.user.id,
    name,
    firm: typeof body.firm === "string" ? body.firm.trim().slice(0, 80) : "",
    phase: typeof body.phase === "string" ? body.phase.slice(0, 40) : "Challenge",
    market_type: marketType,
    account_size: accountSize,
    initial_balance: initialBalance,
    profit_target: profitTarget,
    max_drawdown: maxDrawdown,
    daily_drawdown: dailyDrawdown,
    start_date: new Date().toISOString().slice(0, 10),
    status: "Active",
  }).select("id,name,firm,phase,market_type,account_size,initial_balance,profit_target,max_drawdown,daily_drawdown,start_date,status,created_at").single();
  if (error || !data) return NextResponse.json({ error: error?.code === "23505" ? "An account with that name already exists." : "Account could not be saved." }, { status: error?.code === "23505" ? 409 : 500 });
  return NextResponse.json({ account: { ...data, pnl: 0, trades: 0 } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
