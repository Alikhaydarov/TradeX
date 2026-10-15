import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";
import { getSelectedAccountId } from "@/lib/selected-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const [{ data: accounts, error }, selectedAccountId] = await Promise.all([
    auth.supabase.from("prop_accounts").select("id,name,initial_balance").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
    getSelectedAccountId(),
  ]);
  if (error) return NextResponse.json({ error: "Accounts could not be loaded." }, { status: 500 });
  const selectedIsOwned = (accounts ?? []).some((account) => account.id === selectedAccountId);
  return NextResponse.json({ accounts: accounts ?? [], selectedAccountId: selectedIsOwned ? selectedAccountId : null }, { headers: { "Cache-Control": "private, no-store" } });
}
