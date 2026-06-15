import { authenticateRequest, serverError } from "@/lib/backend/auth";
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
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return serverError(error.message);

  const rawPosts = (posts ?? []) as PostRow[];
  const userIds = Array.from(new Set(rawPosts.map((post) => post.user_id).filter(Boolean)));

  const { data: profiles, error: profileError } = userIds.length
    ? await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified")
      .in("id", userIds)
    : { data: [], error: null };

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
      author_is_verified: Boolean(profile.is_verified),
    };
  });

  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ posts: hydratedPosts, likedPostIds: [], bookmarkedPostIds: [], repostedPostIds: [] });
  }

  const [likes, bookmarks, reposts] = await Promise.all([
    auth.supabase.from("post_likes").select("post_id").eq("user_id", auth.user.id),
    auth.supabase.from("post_bookmarks").select("post_id").eq("user_id", auth.user.id),
    auth.supabase.from("post_reposts").select("post_id").eq("user_id", auth.user.id),
  ]);

  return Response.json({
    posts: hydratedPosts,
    likedPostIds: likes.data?.map((item) => item.post_id) ?? [],
    bookmarkedPostIds: bookmarks.data?.map((item) => item.post_id) ?? [],
    repostedPostIds: reposts.data?.map((item) => item.post_id) ?? [],
  });
}
