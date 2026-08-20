import type { ChatContextPayload } from "./types";

type ChatContextCacheEntry = {
  data: ChatContextPayload;
  fetchedAt: number;
};

const CHAT_CONTEXT_TTL_MS = 30_000;
const cache = new Map<string, ChatContextCacheEntry>();
const inFlight = new Map<string, Promise<ChatContextPayload>>();

export function getCachedChatContext(communityId: string) {
  return cache.get(communityId)?.data ?? null;
}

export function setCachedChatContext(
  communityId: string,
  data: ChatContextPayload,
) {
  cache.set(communityId, { data, fetchedAt: Date.now() });
  return data;
}

export function markChatContextStale(communityId: string) {
  const current = cache.get(communityId);
  if (current) cache.set(communityId, { ...current, fetchedAt: 0 });
}

export async function fetchChatContext({
  communityId,
  force = false,
}: {
  communityId: string;
  force?: boolean;
}) {
  const cached = cache.get(communityId);
  if (
    cached &&
    !force &&
    Date.now() - cached.fetchedAt < CHAT_CONTEXT_TTL_MS
  ) {
    return cached.data;
  }

  const pending = inFlight.get(communityId);
  if (pending) return pending;

  const request = fetch(
    `/api/community-chat/context?communityId=${encodeURIComponent(communityId)}`,
    { cache: "no-store", credentials: "same-origin" },
  )
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as
        | (ChatContextPayload & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(
          payload?.error || "Community chat could not be loaded.",
        );
      }
      return setCachedChatContext(communityId, payload);
    })
    .finally(() => {
      inFlight.delete(communityId);
    });

  inFlight.set(communityId, request);
  return request;
}
