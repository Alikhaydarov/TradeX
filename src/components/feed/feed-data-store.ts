import { apiRequest } from "@/lib/api-client";
import { toSocialPost, type SocialPostRecord } from "@/lib/social-format";
import type { Post } from "../types";

type FeedResponse = {
  posts: SocialPostRecord[];
  likedPostIds: string[];
  bookmarkedPostIds: string[];
  repostedPostIds: string[];
};

type FeedCacheEntry = {
  posts: Post[];
  fetchedAt: number;
};

const FEED_CACHE_TTL_MS = 45_000;
const cache = new Map<string, FeedCacheEntry>();
const inFlight = new Map<string, Promise<Post[]>>();

export function feedDataKey(userId?: string | null) {
  return userId ? `user:${userId}` : "guest";
}

export function getCachedFeedPosts(key: string) {
  return cache.get(key)?.posts ?? null;
}

export function hasFreshFeedPosts(key: string) {
  const current = cache.get(key);
  return Boolean(current && Date.now() - current.fetchedAt < FEED_CACHE_TTL_MS);
}

export function setCachedFeedPosts(key: string, posts: Post[]) {
  cache.set(key, { posts, fetchedAt: Date.now() });
  return posts;
}

export function markFeedStale(key: string) {
  const current = cache.get(key);
  if (current) cache.set(key, { ...current, fetchedAt: 0 });
}

function normalizeFeedResponse(data: FeedResponse) {
  const liked = new Set(data.likedPostIds);
  const bookmarked = new Set(data.bookmarkedPostIds);
  const reposted = new Set(data.repostedPostIds);
  return data.posts.map((post) =>
    toSocialPost(post, {
      liked: liked.has(post.id),
      bookmarked: bookmarked.has(post.id),
      reposted: reposted.has(post.id),
    }),
  );
}

export async function fetchFeedPosts({
  key,
  force = false,
}: {
  key: string;
  force?: boolean;
}) {
  const cached = cache.get(key);
  if (
    cached &&
    !force &&
    Date.now() - cached.fetchedAt < FEED_CACHE_TTL_MS
  ) {
    return cached.posts;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = apiRequest<FeedResponse>("/api/feed-posts")
    .then(normalizeFeedResponse)
    .then((posts) => setCachedFeedPosts(key, posts))
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}
