"use client";

import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { JournalEntry } from "../types";
import {
  fetchJournalEntries,
  getJournalEntries,
  hasJournalCache,
  invalidateJournalUser,
  journalEntryFromRow,
  setJournalEntries,
  subscribeJournal,
  type JournalDataScope,
  type JournalEntryRow,
} from "./journal-data-store";

export { journalEntryFromRow, type JournalEntryRow } from "./journal-data-store";

const JOURNAL_REFRESH_MS = 30_000;
const EMPTY_ENTRIES: JournalEntry[] = [];

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
  const scope = useMemo<JournalDataScope | null>(
    () => (userId ? { userId, mode, accountId } : null),
    [accountId, mode, userId],
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      scope ? subscribeJournal(scope, listener) : () => undefined,
    [scope],
  );
  const getSnapshot = useCallback(
    () => (scope ? getJournalEntries(scope) : EMPTY_ENTRIES),
    [scope],
  );
  const entries = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ENTRIES);
  const [loading, setLoading] = useState(() =>
    Boolean(scope && !hasJournalCache(scope)),
  );
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (silent = false, force = false) => {
      if (!scope) {
        setLoading(false);
        return;
      }

      // Saved account hydration lets workspace data begin in parallel with the
      // account-list request. Only wait when there is no account id yet.
      if (mode === "workspace" && accountsLoading && !accountId) {
        if (!silent) setLoading(true);
        return;
      }
      if (mode === "workspace" && !accountId) {
        setLoading(false);
        return;
      }

      const cached = hasJournalCache(scope);
      if (cached && !silent) setLoading(false);
      if (!cached && !silent) setLoading(true);
      setError(null);

      try {
        await fetchJournalEntries(scope, { force });
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load journal.",
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [accountId, accountsLoading, mode, scope],
  );

  useEffect(() => {
    setError(null);
    setLoading(Boolean(scope && !hasJournalCache(scope)));
  }, [scope]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!scope) return;
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
  }, [loadEntries, scope]);

  const setEntries = useCallback(
    (next: SetStateAction<JournalEntry[]>) => {
      if (!scope) return;
      setJournalEntries(scope, next);
    },
    [scope],
  );

  const invalidate = useCallback(() => {
    if (userId) invalidateJournalUser(userId);
  }, [userId]);

  const reload = useCallback(async () => {
    if (!scope) return;
    invalidate();
    setError(null);
    try {
      await fetchJournalEntries(scope, { force: true });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load journal.",
      );
    }
  }, [invalidate, scope]);

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
