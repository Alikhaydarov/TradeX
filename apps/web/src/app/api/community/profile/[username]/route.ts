import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const auth = await getRouteAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { username } = await context.params;
  const { data: profile, error } = await auth.supabase.from("profiles").select("id,username,full_name,avatar_url,bio,trading_style,location,is_verified,created_at").eq("username", username).maybeSingle();
  if (error) return NextResponse.json({ error: "Profile could not be loaded." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Trader not found." }, { status: 404 });
  const [posts, followers, following, relation] = await Promise.all([
    auth.supabase.from("posts").select("id,user_id,content,author_name,author_handle,author_avatar,image_url,symbol,side,likes_count,replies_count,reposts_count,views_count,created_at").eq("user_id", profile.id).eq("is_archived", false).order("created_at", { ascending: false }).limit(40),
    auth.supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    auth.supabase.from("user_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    auth.user.id === profile.id ? Promise.resolve({ data: null }) : auth.supabase.from("user_follows").select("follower_id").eq("follower_id", auth.user.id).eq("following_id", profile.id).maybeSingle(),
  ]);
  if (posts.error) return NextResponse.json({ error: "Profile posts could not be loaded." }, { status: 500 });
  const postIds = (posts.data ?? []).map((post) => post.id);
  const [likes, reposts] = postIds.length ? await Promise.all([
    auth.supabase.from("post_likes").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds),
    auth.supabase.from("post_reposts").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds),
  ]) : [{ data: [] }, { data: [] }];
  return NextResponse.json({ profile, posts: (posts.data ?? []).map((post) => ({ ...post, author_name: profile.full_name, author_handle: profile.username, author_avatar: profile.avatar_url })), followers: followers.count ?? 0, following: following.count ?? 0, isFollowing: Boolean(relation.data), isSelf: profile.id === auth.user.id, likedPostIds: (likes.data ?? []).map((row) => row.post_id), repostedPostIds: (reposts.data ?? []).map((row) => row.post_id) }, { headers: { "Cache-Control": "private, no-store" } });
}
