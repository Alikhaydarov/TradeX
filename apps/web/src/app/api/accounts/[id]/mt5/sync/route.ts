import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";
import { hasPaidAccess } from "@/lib/paid-access";
import { isMt5BridgeConfigured } from "@/lib/mt5-bridge";
import { syncMt5Account } from "@/lib/mt5-sync";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await hasPaidAccess(auth.supabase, auth.user.id))) return NextResponse.json({ error: "MT5 sync requires Standard or Pro." }, { status: 403 });
  if (!isMt5BridgeConfigured()) return NextResponse.json({ error: "MT5 bridge is not configured." }, { status: 503 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await syncMt5Account(auth.supabase, auth.user.id, id));
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "MT5 sync failed." }, { status: 502 });
  }
}
