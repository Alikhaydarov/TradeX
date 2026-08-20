"use client";

import { useVisibleInterval } from "@/lib/use-visible-interval";
import { useCallback, useEffect, useRef, useState } from "react";

import type { JournalEntry } from "../types";
import { useJournalSeed } from "./journal-seed-context";
import { journalEntryFromRow, type JournalEntryRow } from "@/lib/journal-entry";

export { journalEntryFromRow };
export type { JournalEntryRow };


type JournalCacheEntry = {
  entries: JournalEntry[];
  fetchedAt: number;
  etag?: string;
};

const JOURNAL_CACHE_TTL_MS = 30_000;
// 15s meant a full journal refetch (and a recharts recompute) four times a
// minute while the user was reading. 45s with an immediate refetch on tab
// return keeps the data fresh without the periodic stutter.
const JOURNAL_REFRESH_MS = 45_000;
const journalCache = new Map<string, JournalCacheEntry>();

/**
 * Populate a cold cache slot from the entries the server already resolved.
 *
 * `fetchedAt: 0` is deliberate: the slot reads as stale, so the hook paints the
 * seeded rows immediately and still revalidates in the background. That gives a
 * first paint with real data instead of a skeleton, without letting the seed go
 * stale if the user leaves the tab open.
 */
function seedFromBootstrap(
  cacheKey: string,
  mode: "accounts" | "workspace",
  accountId: string | null,
  seed: JournalEntry[] | null,
): JournalCacheEntry | undefined {
  if (!cacheKey || !seed || journalCache.has(cacheKey)) return undefined;
  if (mode === "workspace" && !accountId) return undefined;

  const entry: JournalCacheEntry = {
    entries:
      mode === "workspace"
        ? seed.filter((item) => item.propAccountId === accountId)
        : seed,
    fetchedAt: 0,
  };
  journalCache.set(cacheKey, entry);
  return entry;
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
  const seed = useJournalSeed();
  const cacheKey = userId
    ? `${userId}:${mode}:${accountId || "all"}`
    : "";
  const cachedEntries = cacheKey
    ? journalCache.get(cacheKey) ??
      seedFromBootstrap(cacheKey, mode, accountId, seed)
    : undefined;
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
      if (mode === "workspace" && accountsLoading) {
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
    const cached = cacheKey
      ? journalCache.get(cacheKey) ??
        seedFromBootstrap(cacheKey, mode, accountId, seed)
      : undefined;
    if (cached) {
      setEntries(cached.entries);
      setLoading(false);
      return;
    }

    setEntries([]);
    setLoading(Boolean(userId));
  }, [accountId, cacheKey, mode, seed, userId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const refreshEntries = useCallback(() => {
    if (!userId) return;
    void loadEntries(true);
  }, [loadEntries, userId]);

  useVisibleInterval(refreshEntries, userId ? JOURNAL_REFRESH_MS : 0);

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
