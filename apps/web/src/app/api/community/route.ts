import { NextResponse } from "next/server";
import { getRouteAuth } from "@/lib/supabase/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const postId = new URL(request.url).searchParams.get("post");
  if (postId && !/^[0-9a-f-]{36}$/i.test(postId))
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  let query = auth.supabase
    .from("posts")
    .select(
      "id,user_id,content,author_name,author_handle,author_avatar,image_url,symbol,side,likes_count,replies_count,reposts_count,views_count,created_at",
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(postId ? 1 : 40);
  if (postId) query = query.eq("id", postId);
  const { data: posts, error } = await query.abortSignal(request.signal);

  if (error)
    return NextResponse.json(
      { error: "Community posts could not be loaded." },
      { status: 500 },
    );

  const postIds = (posts ?? []).map((post) => post.id);
  const authorIds = [...new Set((posts ?? []).map((post) => post.user_id))];
  const [likes, reposts, profiles] = postIds.length
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
        auth.supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", authorIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (likes.error || reposts.error || profiles.error)
    return NextResponse.json(
      { error: "Post details could not be loaded. Please retry." },
      { status: 503 },
    );
  const profileById = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile]),
  );

  return NextResponse.json(
    {
      posts: (posts ?? []).map((post) => {
        const profile = profileById.get(post.user_id);
        return profile
          ? {
              ...post,
              author_name: profile.full_name,
              author_handle: profile.username,
              author_avatar: profile.avatar_url,
            }
          : post;
      }),
      likedPostIds: (likes.data ?? []).map((item) => item.post_id),
      repostedPostIds: (reposts.data ?? []).map((item) => item.post_id),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await getRouteAuth();
  if (!auth)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    content?: unknown;
    symbol?: unknown;
    side?: unknown;
    imageUrl?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid post data." }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 280)
    return NextResponse.json(
      { error: "Write a post between 1 and 280 characters." },
      { status: 400 },
    );
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
  if (imageUrl) {
    const ownedImagePrefix = auth.supabase.storage
      .from("post-images")
      .getPublicUrl(`${auth.user.id}/`).data.publicUrl;
    if (imageUrl.length > 2000 || !imageUrl.startsWith(ownedImagePrefix))
      return NextResponse.json(
        { error: "Choose an image uploaded to your own account." },
        { status: 400 },
      );
  }

  const metadata = auth.user.user_metadata ?? {};
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("username,full_name,avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();
  const name = String(
    profile?.full_name ??
      metadata.full_name ??
      metadata.name ??
      auth.user.email?.split("@")[0] ??
      "Trader",
  ).slice(0, 80);
  const username = String(
    profile?.username ??
      metadata.user_name ??
      metadata.preferred_username ??
      auth.user.id.slice(0, 8),
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  const side = body.side === "LONG" || body.side === "SHORT" ? body.side : null;

  const { data: post, error } = await auth.supabase
    .from("posts")
    .insert({
      user_id: auth.user.id,
      content,
      author_name: name,
      author_handle: username || `trader_${auth.user.id.slice(0, 6)}`,
      author_avatar:
        profile?.avatar_url ??
        (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null),
      symbol:
        typeof body.symbol === "string"
          ? body.symbol.trim().toUpperCase().slice(0, 20) || null
          : null,
      side,
      image_url: imageUrl,
      views_count: 0,
      is_archived: false,
    })
    .select(
      "id,user_id,content,author_name,author_handle,author_avatar,image_url,symbol,side,likes_count,replies_count,reposts_count,views_count,created_at",
    )
    .single();

  if (error || !post)
    return NextResponse.json(
      { error: "Your post could not be saved. Please try again." },
      { status: 500 },
    );
  return NextResponse.json(
    { post },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
