"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TradeRange } from "@/features/trades/components/trades-archive";
import { apiRequest } from "@/lib/api-client";
import { useActiveAccountStore } from "@/components/active-account-context";
import { useAuth } from "@/components/auth-context";
import type { JournalEntry, PropAccount } from "@/components/types";

type AccountRow = {
  id: string;
  name: string;
  account_type?: "prop" | "real" | null;
  firm: string;
  prop_site?: string | null;
  prop_login?: string | null;
  import_source?: PropAccount["importSource"] | null;
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

type EntryRow = {
  id: string;
  prop_account_id?: string | null;
  symbol: string;
  side: "Long" | "Short";
  entry_price?: string | null;
  exit_price?: string | null;
  quantity?: string | null;
  fees?: string | null;
  pnl: string;
  note?: string | null;
  traded_at: string;
  account_name?: string | null;
  market_type?: string | null;
  setup?: string | null;
  emotion?: string | null;
  risk_amount?: string | null;
  result_r?: string | null;
  risk_percent?: string | null;
  session?: string | null;
  following_plan?: boolean | null;
  error_made?: boolean | null;
  mistake_type?: string | null;
  review_completed?: boolean | null;
  to_trading_bible?: boolean | null;
  image_url?: string | null;
  tags?: string[] | null;
};

export type JournalSummary = {
  account: PropAccount;
  trades: number;
  pnl: number;
  winRate: number;
  target: number;
  drawdown: number;
};

export type JournalMetrics = {
  pnl: number;
  wins: number;
  losses: number;
  rate: number;
  averageR: number;
  profitFactor: number;
};

const accountFrom = (row: AccountRow): PropAccount => ({
  id: row.id,
  name: row.name,
  accountType: row.account_type || "prop",
  firm: row.firm,
  propSite: row.prop_site || "",
  propLogin: row.prop_login || "",
  importSource: row.import_source || "manual",
  platform: row.platform || "mt5",
  phase: row.phase,
  marketType: row.market_type,
  accountSize: Number(row.account_size || 0),
  initialBalance: Number(row.initial_balance || row.account_size || 0),
  profitTarget: Number(row.profit_target || 0),
  maxDrawdown: Number(row.max_drawdown || 0),
  dailyDrawdown: Number(row.daily_drawdown || 0),
  startDate: row.start_date,
  status: row.status,
});

function parseTradeImages(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 3)
      : [value];
  } catch {
    return [value];
  }
}

const entryFrom = (row: EntryRow): JournalEntry => {
  const imageUrls = parseTradeImages(row.image_url);
  return {
    id: row.id,
    propAccountId: row.prop_account_id,
    symbol: row.symbol,
    side: row.side,
    entry: Number(row.entry_price || 0),
    exit: Number(row.exit_price || 0),
    quantity: Number(row.quantity || 0),
    fees: Number(row.fees || 0),
    pnl: Number(row.pnl || 0),
    note: row.note || "",
    rawDate: row.traded_at,
    date: new Date(`${row.traded_at}T00:00:00`).toLocaleDateString("en-GB"),
    accountName: row.account_name || undefined,
    marketType: row.market_type || undefined,
    setup: row.setup || "",
    emotion: row.emotion || "Neutral",
    riskAmount: Number(row.risk_amount || 0),
    resultR: Number(row.result_r || 0),
    riskPercent: row.risk_percent || "1.0%",
    session: row.session || "",
    followingPlan: row.following_plan ?? true,
    errorMade: row.error_made ?? false,
    mistakeType: row.mistake_type || "",
    reviewCompleted: row.review_completed ?? false,
    toTradingBible: row.to_trading_bible ?? false,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    tags: row.tags || [],
  };
};

function currentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useJournalData(mode: "accounts" | "workspace") {
  const { user } = useAuth();
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    addAccount,
    refreshAccounts,
    loading: accountsLoading,
  } = useActiveAccountStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<TradeRange>("monthly");
  const [customStart, setCustomStart] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const requestVersion = useRef(0);
  const requestAccountId = mode === "workspace" ? activeAccountId : null;

  const loadEntries = useCallback(async (silent = false) => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    if (mode === "workspace" && accountsLoading) return;
    if (mode === "workspace" && !requestAccountId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    const version = ++requestVersion.current;
    try {
      const search = requestAccountId
        ? `?accountId=${encodeURIComponent(requestAccountId)}`
        : "";
      const response = await fetch(`/api/journal${search}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(payload?.error || payload?.message || "Failed to load journal.");
      }
      const payload = (await response.json()) as { entries?: EntryRow[] };
      if (version === requestVersion.current) {
        setEntries((payload.entries || []).map(entryFrom));
      }
    } catch (nextError) {
      if (version === requestVersion.current) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load journal.");
      }
    } finally {
      if (version === requestVersion.current && !silent) setLoading(false);
    }
  }, [accountsLoading, mode, requestAccountId, user]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadEntries(true);
    };
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("tradox:journal-updated", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("tradox:journal-updated", refresh);
    };
  }, [loadEntries, user]);

  const account = useMemo(
    () => accounts.find((item) => item.id === activeAccountId) || null,
    [accounts, activeAccountId],
  );

  const accountEntries = useMemo(() => {
    if (mode === "workspace") return entries;
    return activeAccountId
      ? entries.filter((entry) => entry.propAccountId === activeAccountId)
      : entries;
  }, [activeAccountId, entries, mode]);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = currentMonthId();
    const startQuarter = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endQuarter = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const today = now.toISOString().slice(0, 10);

    const ranged = accountEntries.filter((entry) => {
      const date = entry.rawDate || "";
      if (range === "daily") return date === today;
      if (range === "monthly") return date.startsWith(currentMonth);
      if (range === "yearly") return date.startsWith(String(now.getFullYear()));
      if (range === "custom") return date >= customStart && date <= customEnd;
      const parsed = new Date(`${date}T00:00:00`);
      return parsed >= startQuarter && parsed <= endQuarter;
    });

    const normalized = query.trim().toLowerCase();
    if (!normalized) return ranged;
    return ranged.filter((entry) =>
      `${entry.symbol} ${entry.setup || ""} ${entry.session || ""} ${entry.note || ""} ${(entry.tags || []).join(" ")}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [accountEntries, customEnd, customStart, query, range]);

  const summaries = useMemo<JournalSummary[]>(
    () =>
      accounts.map((item) => {
        const trades = entries.filter((entry) => entry.propAccountId === item.id);
        const pnl = trades.reduce((total, entry) => total + entry.pnl, 0);
        const wins = trades.filter((entry) => entry.pnl > 0).length;
        return {
          account: item,
          trades: trades.length,
          pnl,
          winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
          target: item.profitTarget
            ? Math.min(100, Math.max(0, (pnl / item.profitTarget) * 100))
            : 0,
          drawdown:
            item.maxDrawdown && pnl < 0
              ? Math.min(100, (Math.abs(pnl) / item.maxDrawdown) * 100)
              : 0,
        };
      }),
    [accounts, entries],
  );

  const metrics = useMemo<JournalMetrics>(() => {
    const pnl = accountEntries.reduce((total, entry) => total + entry.pnl, 0);
    const wins = accountEntries.filter((entry) => entry.pnl > 0);
    const losses = accountEntries.filter((entry) => entry.pnl < 0);
    const grossWins = wins.reduce((total, entry) => total + entry.pnl, 0);
    const grossLosses = Math.abs(losses.reduce((total, entry) => total + entry.pnl, 0));
    return {
      pnl,
      wins: wins.length,
      losses: losses.length,
      rate: accountEntries.length
        ? Math.round((wins.length / accountEntries.length) * 100)
        : 0,
      averageR: accountEntries.length
        ? accountEntries.reduce((total, entry) => total + (entry.resultR || 0), 0) /
          accountEntries.length
        : 0,
      profitFactor: grossLosses ? grossWins / grossLosses : grossWins > 0 ? grossWins : 0,
    };
  }, [accountEntries]);

  const equity = useMemo(() => {
    const start = account?.initialBalance || 0;
    const points = [...accountEntries]
      .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
      .map((entry, index, all) => ({
        trade: index + 1,
        equity: start + all.slice(0, index + 1).reduce((total, item) => total + item.pnl, 0),
        label: entry.rawDate || `Trade ${index + 1}`,
      }));
    return [{ trade: 0, equity: start, label: "Start" }, ...points];
  }, [account, accountEntries]);

  const setups = useMemo(() => {
    const grouped = new Map<string, { pnl: number; trades: number; wins: number }>();
    accountEntries.forEach((entry) => {
      const key = entry.setup || "Uncategorized";
      const current = grouped.get(key) || { pnl: 0, trades: 0, wins: 0 };
      grouped.set(key, {
        pnl: current.pnl + entry.pnl,
        trades: current.trades + 1,
        wins: current.wins + (entry.pnl > 0 ? 1 : 0),
      });
    });
    return [...grouped.entries()]
      .map(([name, value]) => ({
        name,
        ...value,
        rate: value.trades ? Math.round((value.wins / value.trades) * 100) : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [accountEntries]);

  const mistakes = useMemo(() => {
    const grouped = new Map<string, { pnl: number; trades: number }>();
    accountEntries
      .filter((entry) => entry.errorMade && entry.mistakeType)
      .forEach((entry) => {
        const key = entry.mistakeType || "Other";
        const current = grouped.get(key) || { pnl: 0, trades: 0 };
        grouped.set(key, {
          pnl: current.pnl + entry.pnl,
          trades: current.trades + 1,
        });
      });
    return [...grouped.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => a.pnl - b.pnl);
  }, [accountEntries]);

  const planRate = useMemo(
    () =>
      accountEntries.length
        ? Math.round(
            (accountEntries.filter((entry) => entry.followingPlan).length /
              accountEntries.length) *
              100,
          )
        : 0,
    [accountEntries],
  );

  const createAccount = useCallback(async (form: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = Object.fromEntries(
        [...form.entries()].map(([key, value]) => [key, String(value)]),
      );
      const mt5Login = (body.mt5Login || "").trim();
      const mt5Password = (body.mt5Password || "").trim();
      const mt5Server = (body.mt5Server || "").trim();
      delete body.mt5Login;
      delete body.mt5Password;
      delete body.mt5Server;

      const response = await apiRequest<{ account: AccountRow }>("/api/prop-accounts", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const next = accountFrom(response.account);
      addAccount(next);
      if (mt5Login && mt5Password && mt5Server) {
        await apiRequest(`/api/prop-accounts/${next.id}/mt5`, {
          method: "PUT",
          body: JSON.stringify({ login: mt5Login, password: mt5Password, server: mt5Server }),
        });
      }
      return next;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Account was not saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [addAccount]);

  const removeAccount = useCallback(async (item: PropAccount) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    setDeleting(item.id);
    setError(null);
    try {
      await apiRequest(`/api/prop-accounts/${item.id}`, { method: "DELETE" });
      await refreshAccounts();
      if (activeAccountId === item.id) setActiveAccount(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Account was not deleted.");
    } finally {
      setDeleting(null);
    }
  }, [activeAccountId, refreshAccounts, setActiveAccount]);

  const addTrade = useCallback(async (form: FormData) => {
    if (!account) return null;
    setSaving(true);
    setError(null);
    const numberValue = (key: string) =>
      Number.parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const response = await apiRequest<{ entry: EntryRow }>("/api/journal", {
        method: "POST",
        body: JSON.stringify({
          propAccountId: account.id,
          symbol: form.get("symbol"),
          side: form.get("side"),
          pnl: numberValue("pnl"),
          quantity: numberValue("quantity"),
          fees: numberValue("fees"),
          riskAmount: numberValue("riskAmount"),
          resultR: numberValue("resultR"),
          riskPercent: form.get("riskPercent"),
          session: form.get("session"),
          followingPlan: form.has("followingPlan"),
          errorMade: form.has("errorMade"),
          mistakeType: form.get("mistakeType"),
          reviewCompleted: form.has("reviewCompleted"),
          toTradingBible: form.has("toTradingBible"),
          tradedAt: form.get("tradedAt"),
          setup: form.get("setup"),
          tags: String(form.get("tags") || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          note: form.get("note"),
          imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
        }),
      });
      const next = entryFrom(response.entry);
      setEntries((current) => [next, ...current]);
      window.dispatchEvent(new Event("tradox:journal-updated"));
      return {
        id: next.id,
        symbol: next.symbol,
        side: next.side,
        pnl: next.pnl,
        resultR: next.resultR ?? null,
        note: next.note || null,
        setup: next.setup || null,
      };
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trade was not saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [account]);

  return {
    user,
    accounts,
    account,
    activeAccountId,
    setActiveAccount,
    entries: accountEntries,
    filteredEntries,
    summaries,
    metrics,
    equity,
    setups,
    mistakes,
    planRate,
    loading: loading || accountsLoading,
    saving,
    deleting,
    error,
    setError,
    query,
    setQuery,
    range,
    setRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    createAccount,
    removeAccount,
    addTrade,
    refresh: () => loadEntries(true),
  };
}
