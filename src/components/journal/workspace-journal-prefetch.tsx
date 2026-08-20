"use client";

import { useEffect } from "react";

import { useActiveAccountStore } from "../active-account-context";
import { useAuth } from "../auth-context";
import { fetchJournalEntries } from "./journal-data-store";

export function WorkspaceJournalPrefetch() {
  const { user } = useAuth();
  const { activeAccountId, loading } = useActiveAccountStore();

  useEffect(() => {
    if (!user || loading || !activeAccountId) return;

    let cancelled = false;
    const prefetch = () => {
      if (cancelled) return;
      void fetchJournalEntries({
        userId: user.id,
        mode: "workspace",
        accountId: activeAccountId,
      }).catch(() => undefined);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleHandle = idleWindow.requestIdleCallback?.(prefetch, { timeout: 600 });
    const timeoutHandle =
      idleHandle === undefined ? window.setTimeout(prefetch, 120) : undefined;

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, [activeAccountId, loading, user]);

  return null;
}
