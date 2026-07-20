import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { getProfileInsights } from "@/lib/server/profile-insights";
import { validateUsername } from "@/lib/username";

export const runtime = "nodejs";

type AuthClient = NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>;

async function getFollowCounts(auth: AuthClient, userId: string) {
  const [followers, following] = await Promise.all([
    auth.supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    auth.supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  return {
    followersCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

interface AuthorRow {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
}

const premiumVerified = hasVerifiedPremiumAccess;

function hydrateAuthors<T extends { id: string; user_id: string; author_avatar?: string | null }>(
  posts: T[],
  authors: AuthorRow[],
) {
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  return posts.map((post) => {
    const author = authorMap.get(post.user_id);
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

interface ParentPostRow {
  id: string;
  user_id: string;
  author_avatar?: string | null;
  [key: string]: unknown;
}

/** Fetches the caller's bookmarked posts directly, not limited to whatever happens to be in the capped global feed. */
async function getBookmarkedPosts(auth: AuthClient) {
  const { data: bookmarks, error: bookmarksError } = await auth.supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (bookmarksError) throw new Error(bookmarksError.message);

  const postIds = (bookmarks ?? []).map((row) => row.post_id as string);
  if (!postIds.length) return [];

  const { data: rawPosts, error: postsError } = await auth.supabase
    .from("posts")
    .select("*")
    .in("id", postIds)
    .eq("is_archived", false)
    .not("symbol", "is", null)
    .not("side", "is", null)
    .not("trade_result", "is", null);

  if (postsError) throw new Error(postsError.message);

  const authorIds = Array.from(new Set((rawPosts ?? []).map((post) => post.user_id as string)));
  const { data: authors, error: authorsError } = authorIds.length
    ? await auth.supabase.from("profiles").select("id, full_name, username, avatar_url, is_verified, plan, premium_until").in("id", authorIds)
    : { data: [] as AuthorRow[], error: null };

  if (authorsError) throw new Error(authorsError.message);

  const order = new Map(postIds.map((id, index) => [id, index]));
  return hydrateAuthors(rawPosts ?? [], (authors ?? []) as AuthorRow[]).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

function buildTimeline(
  profile: AuthorRow,
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

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified, plan, premium_until, ai_enabled, auto_sync_enabled, stats_visible")
    .eq("id", auth.user.id)
    .single();

  if (error) return serverError(error.message);

  try {
    const [counts, postsResult, repliesResult, repostsResult, bookmarkedPosts, insights] = await Promise.all([
      getFollowCounts(auth, auth.user.id),
      auth.supabase
        .from("posts")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("is_archived", false)
        .not("symbol", "is", null)
        .not("side", "is", null)
        .not("trade_result", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
      auth.supabase
        .from("post_replies")
        .select("id, post_id, user_id, content, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<ReplyRow[]>(),
      auth.supabase
        .from("post_reposts")
        .select("post_id, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<RepostRow[]>(),
      getBookmarkedPosts(auth),
      getProfileInsights(auth.supabase, auth.user.id),
    ]);

    if (postsResult.error) return serverError(postsResult.error.message);
    if (repliesResult.error) return serverError(repliesResult.error.message);
    if (repostsResult.error) return serverError(repostsResult.error.message);

    const profileAuthor = {
      id: data.id,
      full_name: data.full_name,
      username: data.username,
      avatar_url: data.avatar_url,
      is_verified: data.is_verified,
      plan: data.plan,
      premium_until: data.premium_until,
    } satisfies AuthorRow;

    const basePosts = hydrateAuthors(postsResult.data ?? [], [profileAuthor]);
    const parentPostIds = Array.from(new Set([
      ...(repliesResult.data ?? []).map((reply) => reply.post_id),
      ...(repostsResult.data ?? []).map((repost) => repost.post_id),
    ]));

    let parentPosts: Record<string, unknown>[] = [];
    if (parentPostIds.length) {
      const { data: rawParentPosts, error: parentPostsError } = await auth.supabase
        .from("posts")
        .select("*")
        .in("id", parentPostIds)
        .returns<ParentPostRow[]>();
      if (parentPostsError) return serverError(parentPostsError.message);

      const parentAuthorIds = Array.from(
        new Set((rawParentPosts ?? []).map((post) => String(post.user_id)).filter(Boolean)),
      );
      const { data: parentAuthors, error: parentAuthorsError } = parentAuthorIds.length
        ? await auth.supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, is_verified, plan, premium_until")
            .in("id", parentAuthorIds)
            .returns<AuthorRow[]>()
        : { data: [] as AuthorRow[], error: null };
      if (parentAuthorsError) return serverError(parentAuthorsError.message);
      parentPosts = hydrateAuthors(rawParentPosts ?? [], parentAuthors ?? []);
    }

    const timeline = buildTimeline(
      profileAuthor,
      basePosts as Record<string, unknown>[],
      repliesResult.data ?? [],
      repostsResult.data ?? [],
      parentPosts,
    );

    return Response.json({
      profile: { ...data, is_verified: premiumVerified(data), ...counts },
      posts: timeline,
      bookmarkedPosts,
      ...insights,
    });
  } catch (caughtError) {
    return serverError(caughtError instanceof Error ? caughtError.message : undefined);
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    fullName?: string;
    username?: string;
    avatarUrl?: string | null;
    bio?: string;
    tradingStyle?: string;
    location?: string;
    statsVisible?: boolean;
  };
  const fullName = body.fullName?.trim();
  const usernameCheck = validateUsername(body.username ?? "");
  const username = usernameCheck.value;
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 1000) : null;

  if (!fullName || fullName.length > 80) {
    return badRequest("Ism qiymatini tekshiring.");
  }
  if (!usernameCheck.valid) {
    return badRequest(usernameCheck.error);
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      username,
      avatar_url: avatarUrl || null,
      bio: body.bio?.trim().slice(0, 160) ?? "",
      trading_style: body.tradingStyle?.trim().slice(0, 50) || "Price Action",
      location: body.location?.trim().slice(0, 80) ?? "",
      stats_visible: body.statsVisible !== false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id)
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified, plan, premium_until, ai_enabled, auto_sync_enabled, stats_visible")
    .single();

  if (error) {
    if (error.code === "23505") return badRequest("Bu username band.");
    return serverError(error.message);
  }

  await Promise.all([
    auth.supabase
      .from("posts")
      .update({
        author_name: data.full_name,
        author_handle: data.username,
        author_avatar: data.avatar_url || fullName.slice(0, 2).toUpperCase(),
      })
      .eq("user_id", auth.user.id),
    auth.supabase
      .from("group_messages")
      .update({
        name: data.full_name,
        avatar: data.avatar_url || fullName.slice(0, 2).toUpperCase(),
      })
      .eq("user_id", auth.user.id),
  ]);

  const counts = await getFollowCounts(auth, auth.user.id);
  return Response.json({ profile: { ...data, is_verified: premiumVerified(data), ...counts } });
}
