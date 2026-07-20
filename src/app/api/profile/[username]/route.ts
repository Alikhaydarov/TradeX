import { authenticateRequest, serverError } from "@/lib/backend/auth";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileInsights } from "@/lib/server/profile-insights";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ username: string }>;
}

interface ReplyRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface RepostRow {
  post_id: string;
  created_at: string;
}

async function followCounts(supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>, userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  return {
    followersCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

const premiumVerified = hasVerifiedPremiumAccess;

function buildTimeline(
  profile: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified?: boolean | null;
    plan?: string | null;
    premium_until?: string | null;
  },
  posts: Record<string, unknown>[],
  replies: ReplyRow[],
  reposts: RepostRow[],
  parentPosts: Record<string, unknown>[],
) {
  const timeline = [...posts];
  const parentMap = new Map(parentPosts.map((post) => [String(post.id), post]));

  for (const reply of replies) {
    const parent = parentMap.get(reply.post_id);
    timeline.push({
      id: reply.id,
      user_id: reply.user_id,
      timeline_type: "reply",
      content: reply.content,
      author_name: profile.full_name,
      author_handle: profile.username,
      author_avatar: profile.avatar_url,
      author_is_verified: premiumVerified(profile),
      image_url: null,
      symbol: parent?.symbol ?? null,
      side: parent?.side ?? null,
      entry_price: null,
      target_price: null,
      trade_result: null,
      pnl: null,
      result_r: null,
      likes_count: 0,
      replies_count: 0,
      reposts_count: 0,
      views_count: 0,
      created_at: reply.created_at,
      parent_post_id: reply.post_id,
      parent_post_author: typeof parent?.author_name === "string" ? parent.author_name : null,
      parent_post_handle: typeof parent?.author_handle === "string" ? parent.author_handle : null,
      parent_post_text: typeof parent?.content === "string" ? parent.content : null,
    });
  }

  for (const repost of reposts) {
    const parent = parentMap.get(repost.post_id);
    if (!parent) continue;
    timeline.push({
      ...parent,
      id: `${repost.post_id}:repost:${repost.created_at}`,
      timeline_type: "repost",
      created_at: repost.created_at,
      parent_post_id: repost.post_id,
      parent_post_author: typeof parent.author_name === "string" ? parent.author_name : null,
      parent_post_handle: typeof parent.author_handle === "string" ? parent.author_handle : null,
      parent_post_text: typeof parent.content === "string" ? parent.content : null,
    });
  }

  return timeline.sort(
    (a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
  );
}

export async function GET(request: Request, context: Params) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { username: rawUsername } = await context.params;
  const username = rawUsername.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 30);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified, plan, premium_until, ai_enabled, auto_sync_enabled, stats_visible")
    .eq("username", username)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!profile) return Response.json({ error: "Profile topilmadi." }, { status: 404 });

  const [counts, postsResult, repliesResult, repostsResult, insights] = await Promise.all([
    followCounts(supabase, profile.id),
    supabase
      .from("posts")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_archived", false)
      .not("symbol", "is", null)
      .not("side", "is", null)
      .not("trade_result", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("post_replies")
      .select("id, post_id, user_id, content, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ReplyRow[]>(),
    supabase
      .from("post_reposts")
      .select("post_id, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<RepostRow[]>(),
    getProfileInsights(supabase, profile.id),
  ]);
  const { data: posts, error: postsError } = postsResult;

  if (postsError) return serverError(postsError.message);
  if (repliesResult.error) return serverError(repliesResult.error.message);
  if (repostsResult.error) return serverError(repostsResult.error.message);

  const auth = await authenticateRequest(request);
  let isFollowing = false;
  if (auth && auth.user.id !== profile.id) {
    const { data: follow } = await auth.supabase
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", auth.user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = Boolean(follow);
  }

  const hydratedPosts = (posts ?? []).map((post) => ({
    ...post,
    author_name: profile.full_name,
    author_handle: profile.username,
    author_avatar: profile.avatar_url || post.author_avatar,
    author_is_verified: premiumVerified(profile),
  }));

  const parentPostIds = Array.from(new Set([
    ...(repliesResult.data ?? []).map((reply) => reply.post_id),
    ...(repostsResult.data ?? []).map((repost) => repost.post_id),
  ]));

  let parentPosts: Record<string, unknown>[] = [];
  if (parentPostIds.length) {
    const { data: rawParentPosts, error: parentPostsError } = await supabase
      .from("posts")
      .select("*")
      .in("id", parentPostIds)
      .returns<Record<string, unknown>[]>();
    if (parentPostsError) return serverError(parentPostsError.message);

    const parentAuthorIds = Array.from(
      new Set((rawParentPosts ?? []).map((post) => String(post.user_id)).filter(Boolean)),
    );
    const { data: parentAuthors, error: parentAuthorsError } = parentAuthorIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_verified, plan, premium_until")
          .in("id", parentAuthorIds)
      : { data: [], error: null };
    if (parentAuthorsError) return serverError(parentAuthorsError.message);

    const authorMap = new Map((parentAuthors ?? []).map((author) => [author.id, author]));
    parentPosts = (rawParentPosts ?? []).map((post) => {
      const author = authorMap.get(String(post.user_id));
      if (!author) return post;
      return {
        ...post,
        author_name: author.full_name,
        author_handle: author.username,
        author_avatar: author.avatar_url || post.author_avatar,
        author_is_verified: premiumVerified(author),
      };
    });
  }

  const timeline = buildTimeline(
    profile,
    hydratedPosts as Record<string, unknown>[],
    repliesResult.data ?? [],
    repostsResult.data ?? [],
    parentPosts,
  );

  const isOwner = Boolean(auth && auth.user.id === profile.id);
  const visibleInsights = profile.stats_visible === false && !isOwner
    ? { ...insights, stats: { trades: 0, winRate: 0, netPnl: 0, averageR: 0 } }
    : insights;

  return Response.json({
    profile: {
      ...profile,
      is_verified: premiumVerified(profile),
      ...counts,
      isFollowing,
    },
    posts: timeline,
    ...visibleInsights,
  });
}
