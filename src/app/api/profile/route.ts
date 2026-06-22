import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getProfileInsights } from "@/lib/server/profile-insights";

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
}

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
      author_is_verified: Boolean(author.is_verified),
    };
  });
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
    .eq("is_archived", false);

  if (postsError) throw new Error(postsError.message);

  const authorIds = Array.from(new Set((rawPosts ?? []).map((post) => post.user_id as string)));
  const { data: authors, error: authorsError } = authorIds.length
    ? await auth.supabase.from("profiles").select("id, full_name, username, avatar_url, is_verified").in("id", authorIds)
    : { data: [] as AuthorRow[], error: null };

  if (authorsError) throw new Error(authorsError.message);

  const order = new Map(postIds.map((id, index) => [id, index]));
  return hydrateAuthors(rawPosts ?? [], (authors ?? []) as AuthorRow[]).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified")
    .eq("id", auth.user.id)
    .single();

  if (error) return serverError(error.message);

  try {
    const [counts, postsResult, bookmarkedPosts, insights] = await Promise.all([
      getFollowCounts(auth, auth.user.id),
      auth.supabase
        .from("posts")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(50),
      getBookmarkedPosts(auth),
      getProfileInsights(auth.supabase, auth.user.id),
    ]);

    if (postsResult.error) return serverError(postsResult.error.message);

    const hydratedPosts = hydrateAuthors(postsResult.data ?? [], [
      { id: data.id, full_name: data.full_name, username: data.username, avatar_url: data.avatar_url, is_verified: data.is_verified },
    ]);

    return Response.json({
      profile: { ...data, ...counts },
      posts: hydratedPosts,
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
  };
  const fullName = body.fullName?.trim();
  const username = body.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 1000) : null;

  if (!fullName || fullName.length > 80 || !username || username.length < 3 || username.length > 30) {
    return badRequest("Ism va username qiymatlarini tekshiring.");
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id)
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified")
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
  return Response.json({ profile: { ...data, ...counts } });
}
