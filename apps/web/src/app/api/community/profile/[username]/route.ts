import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { username } = await context.params;
  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select(
      "id,username,full_name,avatar_url,bio,trading_style,location,is_verified,created_at",
    )
    .eq("username", username.toLowerCase())
    .abortSignal(request.signal)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Profile could not be loaded." },
      { status: 500 },
    );
  if (!profile)
    return NextResponse.json({ error: "Trader not found." }, { status: 404 });
  const showReposts =
    new URL(request.url).searchParams.get("view") === "reposts";
  const columns =
    "id,user_id,content,author_name,author_handle,author_avatar,image_url,symbol,side,likes_count,replies_count,reposts_count,views_count,created_at";
  async function loadPosts() {
    if (!showReposts)
      return auth!.supabase
        .from("posts")
        .select(columns)
        .eq("user_id", profile!.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(40)
        .abortSignal(request.signal);
    const reposted = await auth!.supabase
      .from("post_reposts")
      .select("post_id,created_at")
      .eq("user_id", profile!.id)
      .order("created_at", { ascending: false })
      .limit(40)
      .abortSignal(request.signal);
    if (reposted.error) return { data: null, error: reposted.error };
    const ids = (reposted.data ?? []).map((row) => row.post_id);
    if (!ids.length) return { data: [], error: null };
    const result = await auth!.supabase
      .from("posts")
      .select(columns)
      .in("id", ids)
      .eq("is_archived", false)
      .abortSignal(request.signal);
    return {
      ...result,
      data:
        result.data?.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) ??
        null,
    };
  }
  const [posts, followers, following, relation] = await Promise.all([
    loadPosts(),
    auth.supabase
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    auth.supabase
      .from("user_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    auth.user.id === profile.id
      ? Promise.resolve({ data: null, error: null })
      : auth.supabase
          .from("user_follows")
          .select("follower_id")
          .eq("follower_id", auth.user.id)
          .eq("following_id", profile.id)
          .maybeSingle(),
  ]);
  if (posts.error || followers.error || following.error || relation.error)
    return NextResponse.json(
      { error: "Profile could not be loaded. Please retry." },
      { status: 503 },
    );
  const postIds = (posts.data ?? []).map((post) => post.id);
  const [likes, reposts, authors] = postIds.length
    ? await Promise.all([
        auth.supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", auth.user.id)
          .in("post_id", postIds),
        auth.supabase
          .from("post_reposts")
          .select("post_id")
          .eq("user_id", auth.user.id)
          .in("post_id", postIds),
        showReposts
          ? auth.supabase
              .from("profiles")
              .select("id,username,full_name,avatar_url")
              .in("id", [
                ...new Set((posts.data ?? []).map((post) => post.user_id)),
              ])
          : Promise.resolve({ data: [profile], error: null }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (likes.error || reposts.error || authors.error)
    return NextResponse.json(
      { error: "Post details could not be loaded. Please retry." },
      { status: 503 },
    );
  const byId = new Map(
    (authors.data ?? []).map((author) => [author.id, author]),
  );
  return NextResponse.json(
    {
      profile,
      posts: (posts.data ?? []).map((post) => {
        const author = byId.get(post.user_id);
        return author
          ? {
              ...post,
              author_name: author.full_name,
              author_handle: author.username,
              author_avatar: author.avatar_url,
            }
          : post;
      }),
      followers: followers.count ?? 0,
      following: following.count ?? 0,
      isFollowing: Boolean(relation.data),
      isSelf: profile.id === auth.user.id,
      likedPostIds: (likes.data ?? []).map((row) => row.post_id),
      repostedPostIds: (reposts.data ?? []).map((row) => row.post_id),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
