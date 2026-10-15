import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("journal_entries").delete().eq("id", id).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Trade could not be deleted." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Trade was not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
