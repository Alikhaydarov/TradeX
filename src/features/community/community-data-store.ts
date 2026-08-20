import { apiRequest } from "@/lib/api-client";

type CacheEntry = {
  data: unknown;
  fetchedAt: number;
};

const COMMUNITY_CACHE_TTL_MS = 45_000;
const hubCache = new Map<string, CacheEntry>();
const hubInFlight = new Map<string, Promise<unknown>>();
const detailCache = new Map<string, CacheEntry>();
const detailInFlight = new Map<string, Promise<unknown>>();

function fresh(entry?: CacheEntry) {
  return Boolean(
    entry && Date.now() - entry.fetchedAt < COMMUNITY_CACHE_TTL_MS,
  );
}

export function getCachedCommunityHub<T>(key = "self") {
  return (hubCache.get(key)?.data as T | undefined) ?? null;
}

export async function fetchCommunityHub<T>({
  key = "self",
  force = false,
}: {
  key?: string;
  force?: boolean;
} = {}) {
  const cached = hubCache.get(key);
  if (!force && fresh(cached)) return cached!.data as T;

  const pending = hubInFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = apiRequest<T>("/api/communities")
    .then((data) => {
      hubCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      hubInFlight.delete(key);
    });

  hubInFlight.set(key, request as Promise<unknown>);
  return request;
}

export function markCommunityHubStale(key = "self") {
  const cached = hubCache.get(key);
  if (cached) hubCache.set(key, { ...cached, fetchedAt: 0 });
}

export function getCachedCommunityDetail<T>(communityId: string) {
  return (detailCache.get(communityId)?.data as T | undefined) ?? null;
}

export async function fetchCommunityDetail<T>({
  communityId,
  force = false,
}: {
  communityId: string;
  force?: boolean;
}) {
  const cached = detailCache.get(communityId);
  if (!force && fresh(cached)) return cached!.data as T;

  const pending = detailInFlight.get(communityId);
  if (pending) return pending as Promise<T>;

  const request = apiRequest<T>(
    `/api/communities/${encodeURIComponent(communityId)}`,
  )
    .then((data) => {
      detailCache.set(communityId, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      detailInFlight.delete(communityId);
    });

  detailInFlight.set(communityId, request as Promise<unknown>);
  return request;
}

export function markCommunityDetailStale(communityId: string) {
  const cached = detailCache.get(communityId);
  if (cached) detailCache.set(communityId, { ...cached, fetchedAt: 0 });
}

export function clearCommunityDetail(communityId: string) {
  detailCache.delete(communityId);
  detailInFlight.delete(communityId);
}
