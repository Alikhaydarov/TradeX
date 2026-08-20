"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { JournalEntry } from "../types";

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
const JOURNAL_REFRESH_MS = 30_000;
const journalCache = new Map<string, JournalCacheEntry>();

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

export function useJournalData({
  userId,
  mode,
  accountId,
  accountsLoading,
}: {
  userId: string | null;
  mode: "accounts" | "workspace";
  accountId: string | null;
  accountsLoading: boolean;
}) {
  const cacheKey = userId
    ? `${userId}:${mode}:${accountId || "all"}`
    : "";
  const cachedEntries = cacheKey ? journalCache.get(cacheKey) : undefined;
  const [entries, setEntries] = useState<JournalEntry[]>(
    () => cachedEntries?.entries ?? [],
  );
  const [loading, setLoading] = useState(() => !cachedEntries);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const invalidate = useCallback(() => {
    if (cacheKey) journalCache.delete(cacheKey);
  }, [cacheKey]);

  const loadEntries = useCallback(
    async (silent = false, force = false) => {
      if (!userId) {
        setEntries([]);
        setLoading(false);
        return;
      }
      // If a saved account id is already available, start the journal request
      // immediately instead of waiting for the account list request to finish.
      if (mode === "workspace" && accountsLoading && !accountId) {
        if (!silent) setLoading(true);
        return;
      }
      if (mode === "workspace" && !accountId) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const cached = journalCache.get(cacheKey);
      if (cached) {
        setEntries(cached.entries);
        if (!silent) setLoading(false);
        if (!force && Date.now() - cached.fetchedAt < JOURNAL_CACHE_TTL_MS) {
          return;
        }
        silent = true;
      }

      if (!silent) setLoading(true);
      setError(null);
      const version = ++requestVersion.current;

      try {
        const search = accountId
          ? `?accountId=${encodeURIComponent(accountId)}`
          : "";
        const response = await fetch(`/api/journal${search}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
        });
        if (version !== requestVersion.current) return;

        if (response.status === 304 && cached) {
          journalCache.set(cacheKey, {
            ...cached,
            fetchedAt: Date.now(),
          });
          return;
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

        const payload = (await response.json()) as {
          entries: JournalEntryRow[];
        };
        const nextEntries = payload.entries.map(journalEntryFromRow);
        journalCache.set(cacheKey, {
          entries: nextEntries,
          fetchedAt: Date.now(),
          etag: response.headers.get("etag") ?? undefined,
        });
        setEntries(nextEntries);
      } catch (nextError) {
        if (version !== requestVersion.current) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load journal.",
        );
      } finally {
        if (version === requestVersion.current && !silent) setLoading(false);
      }
    },
    [accountId, accountsLoading, cacheKey, mode, userId],
  );

  useEffect(() => {
    const cached = cacheKey ? journalCache.get(cacheKey) : undefined;
    if (cached) {
      setEntries(cached.entries);
      setLoading(false);
      return;
    }

    setEntries([]);
    setLoading(Boolean(userId));
  }, [cacheKey, userId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void loadEntries(true);
    };

    const interval = window.setInterval(refresh, JOURNAL_REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadEntries, userId]);

  const reload = useCallback(async () => {
    invalidate();
    await loadEntries(true, true);
  }, [invalidate, loadEntries]);

  return {
    entries,
    setEntries,
    loading,
    error,
    setError,
    invalidate,
    reload,
  };
}