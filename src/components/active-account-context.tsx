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
import { accountFromRow, type AccountRow } from "./accounts/account-data";
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
const ActiveAccountContext = createContext<ActiveAccountState | null>(null);

function storedActiveAccountId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccountsState] = useState<PropAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(storedActiveAccountId);
  const [loading, setLoading] = useState(true);
  const hasLoadedAccounts = useRef(false);

  const setActiveAccount = useCallback((id: string | null) => {
    setActiveAccountId(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setAccounts = useCallback((nextAccounts: PropAccount[]) => {
    setAccountsState(nextAccounts);
    setActiveAccountId((current) => {
      if (current && nextAccounts.some((account) => account.id === current)) return current;
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && nextAccounts.some((account) => account.id === saved)) return saved;
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
      const response = await apiRequest<{ accounts: AccountRow[] }>("/api/prop-accounts");
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

  useEffect(() => {
    void refreshAccounts();
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
  if (!context) {
    throw new Error("useActiveAccountStore must be used inside ActiveAccountProvider");
  }
  return context;
}
