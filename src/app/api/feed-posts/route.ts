import { authenticateRequest, serverError } from "@/lib/backend/auth";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { SOCIAL_POST_SELECT } from "@/lib/social-format";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PostRow {
  id: string;
  user_id: string;
  [key: string]: unknown;
}

interface ProfileRow {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
}

const premiumVerified = hasVerifiedPremiumAccess;

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const [{ data: posts, error }, auth] = await Promise.all([
    supabase
      .from("posts")
      .select(SOCIAL_POST_SELECT)
      .eq("is_archived", false)
      .not("symbol", "is", null)
      .not("side", "is", null)
      .not("trade_result", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
    authenticateRequest(request),
  ]);

  if (error) return serverError(error.message);

  const rawPosts = (posts ?? []) as PostRow[];
  const userIds = Array.from(new Set(rawPosts.map((post) => post.user_id).filter(Boolean)));
  const postIds = rawPosts.map((post) => post.id);

  const profilesRequest = userIds.length
    ? supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified, plan, premium_until")
      .in("id", userIds)
    : Promise.resolve({ data: [] as ProfileRow[], error: null });

  const interactionRequest = auth && postIds.length
    ? Promise.all([
      auth.supabase.from("post_likes").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds),
      auth.supabase.from("post_bookmarks").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds),
      auth.supabase.from("post_reposts").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds),
    ])
    : Promise.resolve(null);

  const [{ data: profiles, error: profileError }, interactions] = await Promise.all([
    profilesRequest,
    interactionRequest,
  ]);

  if (profileError) return serverError(profileError.message);

  const profileMap = new Map((profiles as ProfileRow[] | null ?? []).map((profile) => [profile.id, profile]));
  const hydratedPosts = rawPosts.map((post) => {
    const profile = profileMap.get(post.user_id);
    if (!profile) return post;

    return {
      ...post,
      author_name: profile.full_name,
      author_handle: profile.username,
      author_avatar: profile.avatar_url || post.author_avatar,
      author_is_verified: premiumVerified(profile),
    };
  });

  if (!auth || !interactions) {
    return Response.json({ posts: hydratedPosts, likedPostIds: [], bookmarkedPostIds: [], repostedPostIds: [] });
  }

  const [likes, bookmarks, reposts] = interactions;

  return Response.json({
    posts: hydratedPosts,
    likedPostIds: likes.data?.map((item) => item.post_id) ?? [],
    bookmarkedPostIds: bookmarks.data?.map((item) => item.post_id) ?? [],
    repostedPostIds: reposts.data?.map((item) => item.post_id) ?? [],
  });
}
