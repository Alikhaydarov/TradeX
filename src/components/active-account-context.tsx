"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest } from "@/lib/api-client";
import { accountFromRow, type AccountRow } from "@/lib/workspace-accounts";
import { useAuth } from "./auth-context";
import type { PropAccount } from "./types";

interface ActiveAccountState {
  accounts: PropAccount[];
  activeAccountId: string | null;
  loading: boolean;
  setActiveAccount: (id: string | null) => void;
  addAccount: (account: PropAccount) => void;
  setAccounts: (accounts: PropAccount[]) => void;
  refreshAccounts: () => Promise<void>;
}

const STORAGE_KEY = "tradeway.active-account-id";
const COOKIE_KEY = "tradoxy.active-account-id";

const ActiveAccountContext = createContext<ActiveAccountState | null>(null);

export function ActiveAccountProvider({
  children,
  initialAccounts,
  initialActiveAccountId,
}: {
  children: React.ReactNode;
  /**
   * Accounts already resolved on the server. When present the provider starts
   * populated and skips its boot-time fetch, which is what lets the workspace
   * render real content on first paint instead of a spinner.
   */
  initialAccounts?: PropAccount[];
  initialActiveAccountId?: string | null;
}) {
  const { user } = useAuth();
  const [accounts, setAccountsState] = useState<PropAccount[]>(
    () => initialAccounts ?? [],
  );
  const [activeAccountId, setActiveAccountId] = useState<string | null>(
    () => initialActiveAccountId ?? initialAccounts?.[0]?.id ?? null,
  );
  const [loading, setLoading] = useState(() => !initialAccounts);
  const hasLoadedAccounts = useRef(Boolean(initialAccounts));

  const setActiveAccount = useCallback((id: string | null) => {
    setActiveAccountId(id);
    if (typeof window !== "undefined") {
      if (id) {
        window.localStorage.setItem(STORAGE_KEY, id);
        document.cookie = `${COOKIE_KEY}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
        document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
    }
  }, []);

  const setAccounts = useCallback((nextAccounts: PropAccount[]) => {
    setAccountsState(nextAccounts);
    setActiveAccountId((current) => {
      if (current && nextAccounts.some((account) => account.id === current))
        return current;
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && nextAccounts.some((account) => account.id === saved))
          return saved;
      }
      return nextAccounts[0]?.id || null;
    });
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (!user) {
      setAccountsState([]);
      setActiveAccountId(null);
      setLoading(false);
      hasLoadedAccounts.current = false;
      return;
    }
    if (!hasLoadedAccounts.current) setLoading(true);
    try {
      const response = await apiRequest<{ accounts: AccountRow[] }>(
        "/api/prop-accounts",
      );
      setAccounts(response.accounts.map(accountFromRow));
      hasLoadedAccounts.current = true;
    } finally {
      setLoading(false);
    }
  }, [setAccounts, user]);

  const addAccount = useCallback(
    (account: PropAccount) => {
      setAccountsState((current) => [
        account,
        ...current.filter((item) => item.id !== account.id),
      ]);
      setActiveAccount(account.id);
    },
    [setActiveAccount],
  );

  const seedPending = useRef(Boolean(initialAccounts));

  useEffect(() => {
    // The server bootstrap already gave us the list, so the first run only has
    // to seed state (which also restores the remembered active account).
    // Later runs - a different user, a sign-out - still go to the network.
    if (seedPending.current) {
      seedPending.current = false;
      setAccounts(initialAccounts ?? []);
      return;
    }
    void refreshAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAccounts]);

  const value = useMemo<ActiveAccountState>(
    () => ({
      accounts,
      activeAccountId,
      loading,
      setActiveAccount,
      addAccount,
      setAccounts,
      refreshAccounts,
    }),
    [
      accounts,
      activeAccountId,
      loading,
      setActiveAccount,
      addAccount,
      setAccounts,
      refreshAccounts,
    ],
  );

  return (
    <ActiveAccountContext.Provider value={value}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccountStore() {
  const context = useContext(ActiveAccountContext);
  if (!context)
    throw new Error(
      "useActiveAccountStore must be used inside ActiveAccountProvider",
    );
  return context;
}
