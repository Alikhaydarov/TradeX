import type { JournalEntry } from "../types";

export type JournalDataMode = "accounts" | "workspace";

export type JournalDataScope = {
  userId: string;
  mode: JournalDataMode;
  accountId: string | null;
};

export type JournalEntryRow = {
  id: string;
  prop_account_id?: string | null;
  symbol: string;
  side: "Long" | "Short";
  entry_price: string;
  exit_price: string;
  quantity: string;
  fees: string;
  pnl: string;
  note: string;
  traded_at: string;
  account_name?: string;
  market_type?: string;
  setup?: string;
  emotion?: string;
  risk_amount?: string;
  result_r?: string;
  risk_percent?: string;
  session?: string;
  following_plan?: boolean;
  error_made?: boolean;
  mistake_type?: string;
  review_completed?: boolean;
  to_trading_bible?: boolean;
  image_url?: string | null;
  tags?: string[];
};

type JournalCacheEntry = {
  entries: JournalEntry[];
  fetchedAt: number;
  etag?: string;
};

const JOURNAL_CACHE_TTL_MS = 60_000;
const EMPTY_ENTRIES: JournalEntry[] = [];
const cache = new Map<string, JournalCacheEntry>();
const inFlight = new Map<string, Promise<JournalEntry[]>>();
const listeners = new Map<string, Set<() => void>>();

function parseTradeImages(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .slice(0, 3)
      : [value];
  } catch {
    return [value];
  }
}

export function journalEntryFromRow(entry: JournalEntryRow): JournalEntry {
  const imageUrls = parseTradeImages(entry.image_url);
  return {
    id: entry.id,
    propAccountId: entry.prop_account_id,
    symbol: entry.symbol,
    side: entry.side,
    entry: Number(entry.entry_price),
    exit: Number(entry.exit_price),
    quantity: Number(entry.quantity),
    fees: Number(entry.fees),
    pnl: Number(entry.pnl),
    note: entry.note,
    rawDate: entry.traded_at,
    date: new Date(`${entry.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"),
    accountName: entry.account_name,
    marketType: entry.market_type,
    setup: entry.setup || "",
    emotion: entry.emotion || "Neutral",
    riskAmount: Number(entry.risk_amount || 0),
    resultR: Number(entry.result_r || 0),
    riskPercent: entry.risk_percent || "1.0%",
    session: entry.session || "",
    followingPlan: entry.following_plan ?? true,
    errorMade: entry.error_made ?? false,
    mistakeType: entry.mistake_type || "",
    reviewCompleted: entry.review_completed ?? false,
    toTradingBible: entry.to_trading_bible ?? false,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    tags: entry.tags || [],
  };
}

export function journalScopeKey(scope: JournalDataScope) {
  return `${scope.userId}:${scope.mode}:${scope.accountId || "all"}`;
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function subscribeJournal(scope: JournalDataScope, listener: () => void) {
  const key = journalScopeKey(scope);
  const current = listeners.get(key) ?? new Set<() => void>();
  current.add(listener);
  listeners.set(key, current);
  return () => {
    current.delete(listener);
    if (!current.size) listeners.delete(key);
  };
}

export function getJournalEntries(scope: JournalDataScope) {
  return cache.get(journalScopeKey(scope))?.entries ?? EMPTY_ENTRIES;
}

export function hasJournalCache(scope: JournalDataScope) {
  return cache.has(journalScopeKey(scope));
}

export function setJournalEntries(
  scope: JournalDataScope,
  next:
    | JournalEntry[]
    | ((current: JournalEntry[]) => JournalEntry[]),
) {
  const key = journalScopeKey(scope);
  const current = cache.get(key);
  const currentEntries = current?.entries ?? EMPTY_ENTRIES;
  const entries = typeof next === "function" ? next(currentEntries) : next;
  cache.set(key, {
    entries,
    fetchedAt: Date.now(),
    etag: current?.etag,
  });
  emit(key);
  return entries;
}

/** Keep visible data but mark every journal cache for this user stale. */
export function invalidateJournalUser(userId: string) {
  const prefix = `${userId}:`;
  for (const [key, entry] of cache) {
    if (!key.startsWith(prefix)) continue;
    cache.set(key, { ...entry, fetchedAt: 0 });
    emit(key);
  }
}

export async function fetchJournalEntries(
  scope: JournalDataScope,
  { force = false }: { force?: boolean } = {},
) {
  const key = journalScopeKey(scope);
  const cached = cache.get(key);
  if (
    cached &&
    !force &&
    Date.now() - cached.fetchedAt < JOURNAL_CACHE_TTL_MS
  ) {
    return cached.entries;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const search = scope.accountId
      ? `?accountId=${encodeURIComponent(scope.accountId)}`
      : "";
    const response = await fetch(`/api/journal${search}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
    });

    if (response.status === 304 && cached) {
      cache.set(key, { ...cached, fetchedAt: Date.now() });
      emit(key);
      return cached.entries;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      throw new Error(
        payload?.error || payload?.message || "Failed to load journal.",
      );
    }

    const payload = (await response.json()) as { entries: JournalEntryRow[] };
    const entries = (payload.entries ?? []).map(journalEntryFromRow);
    cache.set(key, {
      entries,
      fetchedAt: Date.now(),
      etag: response.headers.get("etag") ?? undefined,
    });
    emit(key);
    return entries;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, request);
  return request;
}
