import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const pageSize = 30;

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { username } = await context.params;
  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "followers";
  const cursor = params.get("cursor");
  if (
    (type !== "followers" && type !== "following") ||
    (cursor &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cursor,
      ))
  ) {
    return NextResponse.json(
      { error: "Invalid connection filter." },
      { status: 400 },
    );
  }
  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .abortSignal(request.signal)
    .maybeSingle();
  if (profileError)
    return NextResponse.json(
      { error: "Profile could not be loaded." },
      { status: 503 },
    );
  if (!profile)
    return NextResponse.json({ error: "Trader not found." }, { status: 404 });
  const ownerColumn = type === "followers" ? "following_id" : "follower_id";
  const personColumn = type === "followers" ? "follower_id" : "following_id";
  // Unique relation IDs keep pagination stable when new follows arrive.
  let query = auth.supabase
    .from("user_follows")
    .select("follower_id,following_id")
    .eq(ownerColumn, profile.id)
    .order(personColumn, { ascending: true })
    .limit(pageSize + 1);
  if (cursor) query = query.gt(personColumn, cursor);
  const { data: relations, error } = await query.abortSignal(request.signal);
  if (error)
    return NextResponse.json(
      { error: "Connections could not be loaded. Please retry." },
      { status: 503 },
    );
  const ids = (relations ?? [])
    .slice(0, pageSize)
    .map((row) => row[personColumn]);
  const people = ids.length
    ? await auth.supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,is_verified")
        .in("id", ids)
        .abortSignal(request.signal)
    : { data: [], error: null };
  if (people.error)
    return NextResponse.json(
      { error: "Connections could not be loaded. Please retry." },
      { status: 503 },
    );
  const byId = new Map(
    (people.data ?? []).map((person) => [person.id, person]),
  );
  return NextResponse.json(
    {
      people: ids.flatMap((id) => {
        const person = byId.get(id);
        return person?.username ? [person] : [];
      }),
      nextCursor:
        (relations?.length ?? 0) > pageSize ? ids[ids.length - 1] : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
