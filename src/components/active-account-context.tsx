"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import type { PropAccount } from "./types";

type AccountRow = {
  id: string;
  name: string;
  account_type?: "prop" | "real" | null;
  firm: string;
  prop_site?: string | null;
  prop_login?: string | null;
  import_source?: "manual" | "mt5_bridge" | "ctrader" | "tradovate" | "ninjatrader" | "official_api" | null;
  platform?: string | null;
  phase: string;
  market_type: string;
  account_size: string;
  initial_balance: string;
  profit_target: string;
  max_drawdown: string;
  daily_drawdown: string;
  start_date: string;
  status: PropAccount["status"];
};

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

const accountFrom = (a: AccountRow): PropAccount => ({
  id: a.id,
  name: a.name,
  accountType: a.account_type || "prop",
  firm: a.firm,
  propSite: a.prop_site || "",
  propLogin: a.prop_login || "",
  importSource: a.import_source || "manual",
  platform: a.platform || "mt5",
  phase: a.phase,
  marketType: a.market_type,
  accountSize: +a.account_size,
  initialBalance: +a.initial_balance,
  profitTarget: +a.profit_target,
  maxDrawdown: +a.max_drawdown,
  dailyDrawdown: +a.daily_drawdown,
  startDate: a.start_date,
  status: a.status,
});

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccountsState] = useState<PropAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      return current === null ? null : nextAccounts[0]?.id || null;
    });
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (!user) {
      setAccountsState([]);
      setActiveAccountId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<{ accounts: AccountRow[] }>("/api/prop-accounts");
      setAccounts(response.accounts.map(accountFrom));
    } finally {
      setLoading(false);
    }
  }, [setAccounts, user]);

  const addAccount = useCallback((account: PropAccount) => {
    setAccountsState((current) => [account, ...current.filter((item) => item.id !== account.id)]);
    setActiveAccount(account.id);
  }, [setActiveAccount]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const value = useMemo<ActiveAccountState>(() => ({
    accounts,
    activeAccountId,
    loading,
    setActiveAccount,
    addAccount,
    setAccounts,
    refreshAccounts,
  }), [accounts, activeAccountId, loading, setActiveAccount, addAccount, setAccounts, refreshAccounts]);

  return <ActiveAccountContext.Provider value={value}>{children}</ActiveAccountContext.Provider>;
}

export function useActiveAccountStore() {
  const context = useContext(ActiveAccountContext);
  if (!context) throw new Error("useActiveAccountStore must be used inside ActiveAccountProvider");
  return context;
}
