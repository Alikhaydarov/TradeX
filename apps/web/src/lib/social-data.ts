import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { clientApi } from "./client-api";

export type SocialPost = {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  image_url: string | null;
  symbol: string | null;
  side: "LONG" | "SHORT" | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  views_count: number;
  created_at: string;
  liked: boolean;
  reposted: boolean;
};
export type SocialReply = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string;
    username: string;
    avatar_url?: string | null;
  } | null;
};
export type TraderProfileData = {
  profile: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    trading_style: string | null;
    location: string | null;
    is_verified: boolean;
    created_at: string;
  };
  posts: SocialPost[];
  followers: number;
  following: number;
  isFollowing: boolean;
  isSelf: boolean;
};
type PostCollection = { posts: SocialPost[] };
type Reactions = { likedPostIds: string[]; repostedPostIds: string[] };

export function hydrateReactions<T extends PostCollection & Reactions>(
  data: T,
) {
  const liked = new Set(data.likedPostIds);
  const reposted = new Set(data.repostedPostIds);
  return {
    ...data,
    posts: data.posts.map((post) => ({
      ...post,
      liked: liked.has(post.id),
      reposted: reposted.has(post.id),
    })),
  };
}

export const feedOptions = queryOptions({
  queryKey: ["social", "feed"],
  queryFn: async ({ signal }) =>
    hydrateReactions(
      await clientApi<PostCollection & Reactions>("/api/community", { signal }),
    ),
});

export const profileOptions = (
  username: string,
  view: "posts" | "reposts" = "posts",
) =>
  queryOptions({
    queryKey: ["social", "profile", username.toLowerCase(), view],
    queryFn: async ({ signal }) =>
      hydrateReactions(
        await clientApi<TraderProfileData & Reactions>(
          `/api/community/profile/${encodeURIComponent(username)}?view=${view}`,
          { signal },
        ),
      ),
  });

export const replyOptions = (postId: string) =>
  queryOptions({
    queryKey: ["replies", postId],
    queryFn: ({ signal }) =>
      clientApi<{ replies: SocialReply[] }>(
        `/api/community/${postId}/replies`,
        { signal },
      ),
  });

export function updatePost(
  client: QueryClient,
  id: string,
  update: (post: SocialPost) => SocialPost,
) {
  client.setQueriesData<PostCollection>(
    {
      queryKey: ["social"],
      predicate: (query) =>
        Boolean(
          (query.state.data as PostCollection | undefined)?.posts.some(
            (post) => post.id === id,
          ),
        ),
    },
    (current) =>
      current && {
        ...current,
        posts: current.posts.map((post) =>
          post.id === id ? update(post) : post,
        ),
      },
  );
}

export function reactionPatch(
  post: SocialPost,
  action: "like" | "repost",
  active: boolean,
  count?: number | null,
) {
  const field = action === "like" ? "liked" : "reposted";
  const countField = action === "like" ? "likes_count" : "reposts_count";
  return {
    ...post,
    [field]: active,
    [countField]:
      typeof count === "number" && Number.isFinite(count)
        ? Math.max(0, count)
        : Math.max(
            0,
            post[countField] + (Number(active) - Number(Boolean(post[field]))),
          ),
  };
}
