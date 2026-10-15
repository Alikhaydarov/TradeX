import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/paid-access";
import { isMt5BridgeConfigured } from "@/lib/mt5-bridge";
import { syncMt5Account } from "@/lib/mt5-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !isMt5BridgeConfigured())
    return NextResponse.json({ error: "MT5 cron configuration is incomplete." }, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: connections, error } = await supabase.from("trading_accounts")
    .select("user_id,prop_account_id,last_synced_at")
    .eq("platform", "MT5").eq("auto_sync_enabled", true)
    .not("prop_account_id", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true }).limit(25);
  if (error) return NextResponse.json({ error: "Connections could not be loaded." }, { status: 500 });
  let synced = 0;
  let failed = 0;
  const access = new Map<string, boolean>();
  for (const connection of connections ?? []) {
    if (!connection.prop_account_id) continue;
    try {
      let eligible = access.get(connection.user_id);
      if (eligible === undefined) {
        eligible = await hasPaidAccess(supabase, connection.user_id);
        access.set(connection.user_id, eligible);
      }
      if (!eligible) continue;
      await syncMt5Account(supabase, connection.user_id, connection.prop_account_id);
      synced += 1;
    } catch { failed += 1; }
  }
  return NextResponse.json({ checked: connections?.length ?? 0, synced, failed });
}
