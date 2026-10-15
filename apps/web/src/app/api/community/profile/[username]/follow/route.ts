import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ username: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { username } = await context.params;
  const { data: profile, error: profileError } = await auth.supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "Trader not found." }, { status: 404 });
  if (profile.id === auth.user.id) return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
  const { data: existing, error: readError } = await auth.supabase.from("user_follows").select("follower_id").eq("follower_id", auth.user.id).eq("following_id", profile.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Follow state could not be loaded." }, { status: 500 });
  const mutation = existing
    ? auth.supabase.from("user_follows").delete().eq("follower_id", auth.user.id).eq("following_id", profile.id)
    : auth.supabase.from("user_follows").insert({ follower_id: auth.user.id, following_id: profile.id });
  const { error } = await mutation;
  if (error) return NextResponse.json({ error: "Follow action could not be saved." }, { status: 500 });
  const { count } = await auth.supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id);
  return NextResponse.json({ isFollowing: !existing, followers: count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
}
