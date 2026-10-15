import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";
import { hasPaidAccess } from "@/lib/paid-access";
import { encryptSecret } from "@/lib/connector-crypto";
import { isMt5BridgeConfigured } from "@/lib/mt5-bridge";

export const runtime = "nodejs";
const columns = "id,account_login,broker_server,status,last_error,last_synced_at,auto_sync_enabled";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("trading_accounts").select(columns)
    .eq("user_id", auth.user.id).eq("prop_account_id", id).eq("platform", "MT5")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "Connection could not be loaded." }, { status: 500 });
  return NextResponse.json({ connection: data, bridgeConfigured: isMt5BridgeConfigured() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasPaidAccess(auth.supabase, auth.user.id))) return NextResponse.json({ error: "MT5 connection requires Standard or Pro." }, { status: 403 });
  if (!isMt5BridgeConfigured()) return NextResponse.json({ error: "MT5 bridge is not configured on this deployment." }, { status: 503 });
  const { id } = await context.params;
  const { data: account } = await auth.supabase.from("prop_accounts").select("id,platform")
    .eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!account || String(account.platform).toLowerCase() !== "mt5") return NextResponse.json({ error: "MT5 account not found." }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid credentials." }, { status: 400 }); }
  const login = String(body.login || "").trim();
  const server = String(body.server || "").trim();
  const password = String(body.password || "").trim();
  if (!/^\d{1,20}$/.test(login) || !server || server.length > 160 || !password || password.length > 256)
    return NextResponse.json({ error: "Enter the MT5 login, broker server and investor password." }, { status: 400 });
  let encrypted: string;
  try { encrypted = encryptSecret(password); } catch { return NextResponse.json({ error: "Connector encryption is not configured." }, { status: 503 }); }
  const { data: existing } = await auth.supabase.from("trading_accounts").select("id")
    .eq("user_id", auth.user.id).eq("prop_account_id", id).eq("platform", "MT5")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const values = {
    user_id: auth.user.id, prop_account_id: id, platform: "MT5",
    account_login: login, broker_server: server, encrypted_password: encrypted,
    password_type: "investor", status: "pending", sync_mode: "normal",
    auto_sync_enabled: true, last_error: null, updated_at: new Date().toISOString(),
  };
  const query = existing
    ? auth.supabase.from("trading_accounts").update(values).eq("id", existing.id).eq("user_id", auth.user.id)
    : auth.supabase.from("trading_accounts").insert(values);
  const { data, error } = await query.select(columns).single();
  if (error) return NextResponse.json({ error: "MT5 credentials could not be saved." }, { status: 500 });
  return NextResponse.json({ connection: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { error } = await auth.supabase.from("trading_accounts").delete()
    .eq("user_id", auth.user.id).eq("prop_account_id", id).eq("platform", "MT5");
  if (error) return NextResponse.json({ error: "Connection could not be removed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
