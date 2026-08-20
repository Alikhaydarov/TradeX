import { apiRequest } from "@/lib/api-client";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { toSocialPost, type SocialPostRecord } from "@/lib/social-format";
import type { Post } from "../types";
import type {
  Achievement,
  ProfileView,
  TradingStats,
} from "./profile-types";

export interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio: string;
  trading_style: string;
  location: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  is_verified?: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
  ai_enabled?: boolean | null;
  auto_sync_enabled?: boolean | null;
  stats_visible?: boolean | null;
}

export type ProfileData = {
  profile: ProfileView;
  posts: Post[];
  achievements: Achievement[];
  stats: TradingStats;
};

type ProfileResponse = {
  profile: ProfileRecord;
  posts: SocialPostRecord[];
  achievements?: Achievement[];
  stats?: TradingStats;
};

type CacheEntry = {
  data: ProfileData;
  fetchedAt: number;
};

export const EMPTY_PROFILE_STATS: TradingStats = {
  trades: 0,
  winRate: 0,
  netPnl: 0,
  averageR: 0,
};

const PROFILE_CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ProfileData>>();

export function profileDataKey(userId: string, profileUsername?: string) {
  return profileUsername
    ? `username:${profileUsername.replace(/^@/, "").trim().toLowerCase()}`
    : `self:${userId}`;
}

export function profileFromRecord(data: ProfileRecord): ProfileView {
  const rawPlan = data.plan?.toLowerCase();
  const plan =
    rawPlan === "standard"
      ? "standard"
      : rawPlan === "pro" || rawPlan === "premium"
        ? "pro"
        : "free";

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url ?? null,
    bio: data.bio ?? "",
    tradingStyle: data.trading_style ?? "Price Action",
    location: data.location ?? "",
    followersCount: data.followersCount ?? 0,
    followingCount: data.followingCount ?? 0,
    isVerified: hasVerifiedPremiumAccess(data),
    plan,
    isFollowing: Boolean(data.isFollowing),
    statsVisible: data.stats_visible !== false,
  };
}

function normalizeProfileResponse(response: ProfileResponse): ProfileData {
  return {
    profile: profileFromRecord(response.profile),
    posts: response.posts.map((post) => toSocialPost(post)),
    achievements: response.achievements ?? [],
    stats: response.stats ?? EMPTY_PROFILE_STATS,
  };
}

export function getCachedProfileData(key: string) {
  return cache.get(key)?.data ?? null;
}

export function hasFreshProfileData(key: string) {
  const current = cache.get(key);
  return Boolean(
    current && Date.now() - current.fetchedAt < PROFILE_CACHE_TTL_MS,
  );
}

export function setCachedProfileData(key: string, data: ProfileData) {
  cache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

export function mutateCachedProfileData(
  key: string,
  updater: (current: ProfileData) => ProfileData,
) {
  const current = cache.get(key);
  if (!current) return null;
  const data = updater(current.data);
  cache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

export async function fetchProfileData({
  key,
  profileUsername,
  force = false,
}: {
  key: string;
  profileUsername?: string;
  force?: boolean;
}) {
  const cached = cache.get(key);
  if (
    cached &&
    !force &&
    Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS
  ) {
    return cached.data;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = apiRequest<ProfileResponse>(
    profileUsername
      ? `/api/profile/${encodeURIComponent(profileUsername.replace(/^@/, ""))}`
      : "/api/profile",
  )
    .then(normalizeProfileResponse)
    .then((data) => setCachedProfileData(key, data))
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}
