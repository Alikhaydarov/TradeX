import { createClient } from "@/lib/supabase/server";
import type { SocialPost } from "@/lib/social-data";

export type CommunityFeedData = {
  posts: SocialPost[];
  likedPostIds: string[];
  repostedPostIds: string[];
};

export async function loadCommunityFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId?: string | null,
  signal?: AbortSignal,
): Promise<CommunityFeedData> {
  let query = supabase
    .from("posts")
    .select(
      "id,user_id,content,author_name,author_handle,author_avatar,image_url,symbol,side,likes_count,replies_count,reposts_count,views_count,created_at",
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(postId ? 1 : 40);
  if (postId) query = query.eq("id", postId);
  const { data: posts, error } = await (signal
    ? query.abortSignal(signal)
    : query);
  if (error) throw new Error("Community posts could not be loaded.");

  const postIds = (posts ?? []).map((post) => post.id);
  if (!postIds.length)
    return { posts: [], likedPostIds: [], repostedPostIds: [] };
  const authorIds = [...new Set((posts ?? []).map((post) => post.user_id))];
  const [likes, reposts, profiles] = await Promise.all([
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
    supabase
      .from("post_reposts")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
    supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", authorIds),
  ]);
  if (likes.error || reposts.error || profiles.error)
    throw new Error("Post details could not be loaded. Please retry.");
  const profileById = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile]),
  );
  const likedPostIds = (likes.data ?? []).map((item) => item.post_id);
  const repostedPostIds = (reposts.data ?? []).map((item) => item.post_id);
  const liked = new Set(likedPostIds);
  const reposted = new Set(repostedPostIds);

  return {
    posts: (posts ?? []).map((post) => {
      const profile = profileById.get(post.user_id);
      return {
        ...post,
        side: post.side === "LONG" || post.side === "SHORT" ? post.side : null,
        author_name: profile?.full_name ?? post.author_name,
        author_handle: profile?.username ?? post.author_handle,
        author_avatar: profile ? profile.avatar_url : post.author_avatar,
        liked: liked.has(post.id),
        reposted: reposted.has(post.id),
      };
    }),
    likedPostIds,
    repostedPostIds,
  };
}
