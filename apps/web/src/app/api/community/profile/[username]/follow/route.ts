import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { username } = await context.params;
  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (profileError || !profile)
    return NextResponse.json({ error: "Trader not found." }, { status: 404 });
  if (profile.id === auth.user.id)
    return NextResponse.json(
      { error: "You cannot follow yourself." },
      { status: 400 },
    );
  const body = await request.text();
  let active: unknown;
  try {
    active = body ? JSON.parse(body).active : undefined;
  } catch {
    return NextResponse.json(
      { error: "Invalid follow action." },
      { status: 400 },
    );
  }
  if (active !== undefined && typeof active !== "boolean")
    return NextResponse.json(
      { error: "Invalid follow state." },
      { status: 400 },
    );
  if (typeof active !== "boolean") {
    const { data: existing, error: readError } = await auth.supabase
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", auth.user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    if (readError)
      return NextResponse.json(
        { error: "Follow state could not be loaded." },
        { status: 500 },
      );
    active = !existing;
  }
  const mutation = active
    ? auth.supabase
        .from("user_follows")
        .upsert(
          { follower_id: auth.user.id, following_id: profile.id },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true },
        )
    : auth.supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", auth.user.id)
        .eq("following_id", profile.id);
  const { error } = await mutation;
  if (error)
    return NextResponse.json(
      { error: "Follow action could not be saved." },
      { status: 500 },
    );
  const { count, error: countError } = await auth.supabase
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", profile.id);
  return NextResponse.json(
    { isFollowing: active, followers: countError ? null : (count ?? 0) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
