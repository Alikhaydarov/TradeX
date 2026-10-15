import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const query =
    new URL(request.url).searchParams
      .get("q")
      ?.trim()
      .replace(/^@/, "")
      .slice(0, 40) ?? "";
  if (query.length < 2) return NextResponse.json({ profiles: [] });
  const pattern = "%" + query.replace(/[\\%_]/g, "\\$&") + "%";
  const columns = "id,username,full_name,avatar_url,is_verified";
  const [handles, names] = await Promise.all([
    auth.supabase
      .from("profiles")
      .select(columns)
      .ilike("username", pattern)
      .limit(6)
      .abortSignal(request.signal),
    auth.supabase
      .from("profiles")
      .select(columns)
      .ilike("full_name", pattern)
      .limit(6)
      .abortSignal(request.signal),
  ]);
  if (handles.error || names.error)
    return NextResponse.json(
      { error: "Trader search is temporarily unavailable." },
      { status: 503 },
    );
  const profiles = [
    ...new Map(
      [...(handles.data ?? []), ...(names.data ?? [])].map((profile) => [
        profile.id,
        profile,
      ]),
    ).values(),
  ].slice(0, 8);
  return NextResponse.json(
    { profiles },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
