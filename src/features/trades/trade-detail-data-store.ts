type TradeDetailCacheEntry = {
  entry: unknown;
  fetchedAt: number;
};

const TRADE_DETAIL_TTL_MS = 60_000;
const cache = new Map<string, TradeDetailCacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function getCachedTradeDetail<T>(tradeId: string) {
  return (cache.get(tradeId)?.entry as T | undefined) ?? null;
}

export function hasFreshTradeDetail(tradeId: string) {
  const current = cache.get(tradeId);
  return Boolean(
    current && Date.now() - current.fetchedAt < TRADE_DETAIL_TTL_MS,
  );
}

export function setCachedTradeDetail<T>(tradeId: string, entry: T) {
  cache.set(tradeId, { entry, fetchedAt: Date.now() });
  return entry;
}

export function markTradeDetailStale(tradeId: string) {
  const current = cache.get(tradeId);
  if (current) cache.set(tradeId, { ...current, fetchedAt: 0 });
}

export function deleteCachedTradeDetail(tradeId: string) {
  cache.delete(tradeId);
  inFlight.delete(tradeId);
}

export async function fetchTradeDetail<T>({
  tradeId,
  force = false,
}: {
  tradeId: string;
  force?: boolean;
}) {
  const cached = cache.get(tradeId);
  if (
    cached &&
    !force &&
    Date.now() - cached.fetchedAt < TRADE_DETAIL_TTL_MS
  ) {
    return cached.entry as T;
  }

  const pending = inFlight.get(tradeId);
  if (pending) return pending as Promise<T>;

  const request = fetch(`/api/journal/${encodeURIComponent(tradeId)}`, {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as {
        entry?: T;
        error?: string;
      } | null;
      if (!response.ok || !payload?.entry) {
        throw new Error(payload?.error || "Trade could not be loaded.");
      }
      return setCachedTradeDetail(tradeId, payload.entry);
    })
    .finally(() => {
      inFlight.delete(tradeId);
    });

  inFlight.set(tradeId, request as Promise<unknown>);
  return request;
}
