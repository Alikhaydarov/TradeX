import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

const reservedNames = new Set(["admin", "administrator", "tradoxy", "support", "help", "moderator", "system", "staff", "root", "api", "official"]);

export async function PATCH(request: Request) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  let body: { username?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid profile details." }, { status: 400 }); }
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase().replace(/^@/, "") : "";
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return NextResponse.json({ error: "Username must be 3–24 characters using lowercase letters, numbers or underscore." }, { status: 400 });
  if (reservedNames.has(username)) return NextResponse.json({ error: "That username is reserved. Choose another one." }, { status: 400 });

  const { data, error } = await auth.supabase.from("profiles").update({ username, updated_at: new Date().toISOString() }).eq("id", auth.user.id).select("username").maybeSingle();
  if (error?.code === "23505") return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: "Profile could not be updated. Refresh and try again." }, { status: 500 });
  return NextResponse.json({ username: data.username }, { headers: { "Cache-Control": "private, no-store" } });
}
