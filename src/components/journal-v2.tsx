"use client";

import {
  BarChart3, BookOpen, BrainCircuit, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Download, ImageIcon, MoreHorizontal, Plus, ShieldCheck,
  Target, Trash2, TrendingDown, TrendingUp, WalletCards, X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../lib/api-client";
import { DashboardOverview } from "@/features/trading-dashboard/components/dashboard-overview";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "./ui/alert-dialog";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent } from "./ui/tabs";
import { Spinner } from "./ui/spinner";
import { Skeleton } from "./ui/skeleton";
import { useActiveAccountStore } from "./active-account-context";
import { useAuth } from "./auth-context";
import { InstrumentBadge } from "./instrument-badge";
import { MediaImage } from "./media-image";
import { PropAccountDialog } from "./prop-account-dialog";
import { PropFirmLogo } from "./prop-firm-logo";
import { Mt5Settings } from "./mt5-settings";
import { TradeReviewModal } from "./trade-review-modal";
import { TradingViewChart } from "./tradingview-chart";
import { useWorkspacePreferences } from "./workspace-preferences-context";
import type { TradeRange } from "@/features/trades/components/trades-archive";
import type { JournalEntry, OpenPosition, PropAccount } from "./types";

type AccountRow = { id: string; name: string; account_type?: "prop" | "real" | null; firm: string; prop_site?: string | null; prop_login?: string | null; import_source?: "manual" | "mt5_bridge" | "ctrader" | "tradovate" | "ninjatrader" | "official_api" | null; platform?: string | null; phase: string; market_type: string; account_size: string; initial_balance: string; profit_target: string; max_drawdown: string; daily_drawdown: string; start_date: string; status: PropAccount["status"] };
type EntryRow = { id: string; prop_account_id?: string | null; symbol: string; side: "Long" | "Short"; entry_price: string; exit_price: string; quantity: string; fees: string; pnl: string; note: string; traded_at: string; account_name?: string; market_type?: string; setup?: string; emotion?: string; risk_amount?: string; result_r?: string; risk_percent?: string; session?: string; following_plan?: boolean; error_made?: boolean; mistake_type?: string; review_completed?: boolean; to_trading_bible?: boolean; image_url?: string | null; tags?: string[] };
type Summary = { account: PropAccount; trades: number; pnl: number; winRate: number; target: number; dd: number };
type AiCoachReport = {
  title: string;
  summary: string;
  score: number;
  mood: "protect" | "neutral" | "push";
  strengths: string[];
  mistakes: string[];
  riskWarnings: string[];
  nextSteps: string[];
  generatedBy: "rules" | "openai";
};
type JournalCacheEntry = {
  entries: JournalEntry[];
  fetchedAt: number;
  etag?: string;
};

const JOURNAL_CACHE_TTL_MS = 5_000;
const JOURNAL_REFRESH_MS = 30_000;
const journalCache = new Map<string, JournalCacheEntry>();
const TradesArchive = dynamic(
  () => import("@/features/trades/components/trades-archive").then((module) => module.TradesArchive),
  { loading: () => <Skeleton className="h-[520px] w-full rounded-xl bg-white/[.055]" /> },
);
const cash = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const cashCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const WEEKDAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WORKSPACE_TABS = [["home", "Home"], ["overview", "Dashboard"], ["calendar", "Calendar"], ["trades", "Trades"], ["bible", "Bible"], ["analytics", "Analytics"], ["settings", "Settings"]] as const;
export type WorkspaceTab = typeof WORKSPACE_TABS[number][0];

const accountFrom = (a: AccountRow): PropAccount => ({ id: a.id, name: a.name, accountType: a.account_type || "prop", firm: a.firm, propSite: a.prop_site || "", propLogin: a.prop_login || "", importSource: a.import_source || "manual", platform: a.platform || "mt5", phase: a.phase, marketType: a.market_type, accountSize: +a.account_size, initialBalance: +a.initial_balance, profitTarget: +a.profit_target, maxDrawdown: +a.max_drawdown, dailyDrawdown: +a.daily_drawdown, startDate: a.start_date, status: a.status });
const parseTradeImages = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 3) : [value];
  } catch {
    return [value];
  }
};
const entryFrom = (e: EntryRow): JournalEntry => { const imageUrls = parseTradeImages(e.image_url); return ({ id: e.id, propAccountId: e.prop_account_id, symbol: e.symbol, side: e.side, entry: +e.entry_price, exit: +e.exit_price, quantity: +e.quantity, fees: +e.fees, pnl: +e.pnl, note: e.note, rawDate: e.traded_at, date: new Date(`${e.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"), accountName: e.account_name, marketType: e.market_type, setup: e.setup || "", emotion: e.emotion || "Neutral", riskAmount: +(e.risk_amount || 0), resultR: +(e.result_r || 0), riskPercent: e.risk_percent || "1.0%", session: e.session || "", followingPlan: e.following_plan ?? true, errorMade: e.error_made ?? false, mistakeType: e.mistake_type || "", reviewCompleted: e.review_completed ?? false, toTradingBible: e.to_trading_bible ?? false, imageUrl: imageUrls[0] ?? null, imageUrls, tags: e.tags || [] }); };
const monthId = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const reviewScore = (entry: JournalEntry) => [entry.note, entry.setup, entry.session, entry.imageUrl, entry.reviewCompleted, entry.toTradingBible].filter(Boolean).length;
const csvCell = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};
function buildWeeklyStrip(account: PropAccount, month: Date, trades: JournalEntry[]) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();
  const anchor = isCurrentMonth ? new Date(now) : new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (anchor.getDay() + 6) % 7;
  anchor.setDate(anchor.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const dayTrades = trades.filter((trade) => trade.rawDate === key);
    const pnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const percent = account.accountSize ? (pnl / account.accountSize) * 100 : 0;
    return {
      key,
      label: day.toLocaleDateString("en-US", { weekday: "short", day: "2-digit" }),
      trades: dayTrades.length,
      pnl,
      percent,
    };
  });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3 p-3 sm:p-4" aria-label="Loading trading dashboard" role="status">
      <div className="flex items-end justify-between gap-4 px-1 py-1">
        <div className="space-y-2"><Skeleton className="h-3 w-24 bg-white/[.06]" /><Skeleton className="h-7 w-48 bg-white/[.07]" /></div>
        <Skeleton className="h-9 w-24 bg-white/[.07]" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl bg-white/[.055]" />)}</div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.7fr)]"><Skeleton className="h-[360px] rounded-xl bg-white/[.055]" /><Skeleton className="h-[360px] rounded-xl bg-white/[.055]" /></div>
      <Skeleton className="h-32 rounded-xl bg-white/[.055]" />
    </div>
  )
}

export function JournalV2({
  onLogin,
  mode = "accounts",
  forcedTab,
}: {
  onLogin: () => void;
  mode?: "accounts" | "workspace";
  forcedTab?: WorkspaceTab;
}) {
  const { user } = useAuth();
  const { accounts, activeAccountId, setActiveAccount, addAccount, refreshAccounts, loading: accountsLoading } = useActiveAccountStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [accountOpen, setAccountOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tradeRange, setTradeRange] = useState<TradeRange>("monthly");
  const [customStart, setCustomStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const requestVersion = useRef(0);

  const openTradeComposer = useCallback(() => {
    if (mode === "workspace" && !activeAccountId) {
      setError("Select an account before adding a trade.");
      window.history.pushState(null, "", "/accounts");
      window.dispatchEvent(new Event("popstate"));
      return;
    }
    setTradeOpen(true);
  }, [activeAccountId, mode]);

  // Accounts are loaded once by ActiveAccountProvider on mount. Never call
  // refreshAccounts() from inside loadEntries: doing so toggles accountsLoading,
  // which recreated this callback and re-ran the effect below in an endless
  // fetch/spinner loop for users without accounts.
  const requestAccountId = mode === "workspace" ? activeAccountId : null;
  const journalCacheKey = user ? `${user.id}:${mode}:${requestAccountId || "all"}` : "";

  const loadEntries = useCallback(async (silent = false, force = false) => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    if (mode === "workspace" && accountsLoading) {
      if (!silent) setLoading(true);
      return;
    }

    if (mode === "workspace" && !requestAccountId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const cached = journalCache.get(journalCacheKey);
    if (cached) {
      setEntries(cached.entries);
      if (!silent) setLoading(false);
      if (!force && Date.now() - cached.fetchedAt < JOURNAL_CACHE_TTL_MS) return;
      silent = true;
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
        headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
      });
      if (version !== requestVersion.current) return;

      if (response.status === 304 && cached) {
        journalCache.set(journalCacheKey, { ...cached, fetchedAt: Date.now() });
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(payload?.error || payload?.message || "Failed to load journal.");
      }

      const payload = (await response.json()) as { entries: EntryRow[] };
      const nextEntries = payload.entries.map(entryFrom);
      journalCache.set(journalCacheKey, {
        entries: nextEntries,
        fetchedAt: Date.now(),
        etag: response.headers.get("etag") ?? undefined,
      });
      setEntries(nextEntries);
    } catch (nextError) {
      if (version !== requestVersion.current) return;
      const message = nextError instanceof Error ? nextError.message : "Failed to load journal.";
      setError(message);
    } finally {
      if (version === requestVersion.current && !silent) setLoading(false);
    }
  }, [accountsLoading, journalCacheKey, mode, requestAccountId, user]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!user) return;
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
  }, [loadEntries, user]);

  useEffect(() => {
    if (!user) return;
    const handleOpenTrade = () => openTradeComposer();
    window.addEventListener("tradox:add-trade", handleOpenTrade);
    return () => window.removeEventListener("tradox:add-trade", handleOpenTrade);
  }, [openTradeComposer, user]);

  const account = accounts.find(a => a.id === activeAccountId) || null;
  const accountEntries = useMemo(() => {
    if (mode === "workspace") return entries;
    return activeAccountId ? entries.filter(e => e.propAccountId === activeAccountId) : entries;
  }, [entries, activeAccountId, mode]);
  const bibleEntries = useMemo(() => accountEntries.filter(e => e.toTradingBible).sort((a, b) => reviewScore(b) - reviewScore(a)), [accountEntries]);
  const monthEntries = useMemo(() => accountEntries.filter(e => e.rawDate?.startsWith(monthId(month))), [accountEntries, month]);
  const rangeEntries = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    if (tradeRange === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      return accountEntries.filter(e => e.rawDate === today);
    }
    if (tradeRange === "monthly") return monthEntries;
    if (tradeRange === "quarter") {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0);
      return accountEntries.filter(e => {
        const d = new Date(`${e.rawDate}T00:00:00`);
        return d >= start && d <= end;
      });
    }
    if (tradeRange === "yearly") return accountEntries.filter(e => e.rawDate?.startsWith(String(y)));
    return accountEntries.filter(e => {
      const date = e.rawDate || "";
      return date >= customStart && date <= customEnd;
    });
  }, [accountEntries, month, monthEntries, tradeRange, customStart, customEnd]);
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return q ? rangeEntries.filter(e => `${e.symbol} ${e.setup} ${e.note} ${e.tags?.join(" ")}`.toLowerCase().includes(q)) : rangeEntries; }, [rangeEntries, query]);
  const summaries = useMemo<Summary[]>(() => accounts.map(account => { const t = entries.filter(e => e.propAccountId === account.id), p = t.reduce((s, e) => s + e.pnl, 0), w = t.filter(e => e.pnl > 0).length; return { account, trades: t.length, pnl: p, winRate: t.length ? Math.round(w / t.length * 100) : 0, target: account.profitTarget ? Math.min(100, Math.max(0, p / account.profitTarget * 100)) : 0, dd: account.maxDrawdown && p < 0 ? Math.min(100, Math.abs(p) / account.maxDrawdown * 100) : 0 }; }), [accounts, entries]);
  const stats = useMemo(() => { const pnl = monthEntries.reduce((s, e) => s + e.pnl, 0), wins = monthEntries.filter(e => e.pnl > 0), losses = monthEntries.filter(e => e.pnl < 0), gw = wins.reduce((s, e) => s + e.pnl, 0), gl = Math.abs(losses.reduce((s, e) => s + e.pnl, 0)); return { pnl, wins: wins.length, losses: losses.length, rate: monthEntries.length ? Math.round(wins.length / monthEntries.length * 100) : 0, r: monthEntries.length ? monthEntries.reduce((s, e) => s + (e.resultR || 0), 0) / monthEntries.length : 0, pf: gl ? gw / gl : gw ? gw : 0 }; }, [monthEntries]);
  const equity = useMemo(() => {
    const initialBalance = account?.initialBalance || 0;
    const trades = [...accountEntries]
      .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
      .reduce<Array<{ trade: number; equity: number; label: string }>>((points, entry, index) => {
        const previousEquity = points[index - 1]?.equity ?? initialBalance;
        return [...points, { trade: index + 1, equity: previousEquity + entry.pnl, label: entry.rawDate || `Trade ${index + 1}` }];
      }, []);
    return [{ trade: 0, equity: initialBalance, label: "Start" }, ...trades];
  }, [accountEntries, account]);
  const setups = useMemo(() => { const m = new Map<string, { pnl: number; trades: number; wins: number }>(); monthEntries.forEach(e => { const k = e.setup || "Uncategorized", v = m.get(k) || { pnl: 0, trades: 0, wins: 0 }; m.set(k, { pnl: v.pnl + e.pnl, trades: v.trades + 1, wins: v.wins + (e.pnl > 0 ? 1 : 0) }); }); return [...m].map(([name, v]) => ({ name, ...v, rate: Math.round(v.wins / v.trades * 100) })).sort((a, b) => b.pnl - a.pnl); }, [monthEntries]);
  const mistakes = useMemo(() => { const m = new Map<string, { pnl: number; trades: number }>(); monthEntries.filter(e => e.errorMade && e.mistakeType).forEach(e => { const k = e.mistakeType as string, v = m.get(k) || { pnl: 0, trades: 0 }; m.set(k, { pnl: v.pnl + e.pnl, trades: v.trades + 1 }); }); return [...m].map(([name, v]) => ({ name, ...v })).sort((a, b) => a.pnl - b.pnl); }, [monthEntries]);
  const planRate = useMemo(() => monthEntries.length ? Math.round(monthEntries.filter(e => e.followingPlan).length / monthEntries.length * 100) : 0, [monthEntries]);
  const calendar = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const tradesByDay = new Map<string, JournalEntry[]>();

    for (const entry of accountEntries) {
      if (!entry.rawDate?.startsWith(monthId(month))) continue;
      const entries = tradesByDay.get(entry.rawDate) ?? [];
      entries.push(entry);
      tradesByDay.set(entry.rawDate, entries);
    }

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - offset + 1;
      if (day < 1 || day > dayCount) return null;
      const trades = tradesByDay.get(`${monthId(month)}-${String(day).padStart(2, "0")}`) ?? [];
      return { day, trades, pnl: trades.reduce((sum, entry) => sum + entry.pnl, 0) };
    });
  }, [month, accountEntries]);

  async function createAccount(form: FormData) {
    setSaving(true);
    try {
      const body: Record<string, string> = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, String(v)])
      );
      const mt5Login    = (body.mt5Login    ?? "").trim();
      const mt5Password = (body.mt5Password ?? "").trim();
      const mt5Server   = (body.mt5Server   ?? "").trim();
      delete body.mt5Login; delete body.mt5Password; delete body.mt5Server;

      const r = await apiRequest<{ account: AccountRow }>("/api/prop-accounts", {
        method: "POST", body: JSON.stringify(body),
      });
      const next = accountFrom(r.account);
      addAccount(next);
      setAccountOpen(false);

      if (mt5Login && mt5Password && mt5Server) {
        await apiRequest(`/api/prop-accounts/${next.id}/mt5`, {
          method: "PUT",
          body: JSON.stringify({ login: mt5Login, password: mt5Password, server: mt5Server }),
        });
      }
      return next;
    } catch (e) { setError(e instanceof Error ? e.message : "Account was not saved."); }
    finally { setSaving(false); }
    return null;
  }

  async function removeAccount(a: PropAccount) {
    if (!window.confirm(`${a.name} accountini o'chirasizmi?`)) return;
    setDeleting(a.id);
    try {
      await apiRequest(`/api/prop-accounts/${a.id}`, { method: "DELETE" });
      await refreshAccounts();
      if (activeAccountId === a.id) setActiveAccount(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Account o'chirilmadi"); }
    finally { setDeleting(null); }
  }

  async function addTrade(form: FormData): Promise<{ id: string; symbol: string; side: string; pnl: number; resultR: number | null; note: string | null; setup: string | null } | null> {
    if (!account) return null;
    setSaving(true);
    const num = (key: string) => parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const r = await apiRequest<{ entry: EntryRow }>("/api/journal", { method: "POST", body: JSON.stringify({
        propAccountId: account.id,
        symbol: form.get("symbol"),
        side: form.get("side"),
        pnl: num("pnl"),
        quantity: num("quantity"),
        fees: num("fees"),
        riskAmount: num("riskAmount"),
        resultR: num("resultR"),
        riskPercent: form.get("riskPercent"),
        session: form.get("session"),
        followingPlan: form.has("followingPlan"),
        errorMade: form.has("errorMade"),
        mistakeType: form.get("mistakeType"),
        reviewCompleted: form.has("reviewCompleted"),
        toTradingBible: form.has("toTradingBible"),
        tradedAt: form.get("tradedAt"),
        setup: form.get("setup"),
        tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: form.get("note"),
        imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
      }) });
      const next = entryFrom(r.entry);
      journalCache.delete(journalCacheKey);
      setEntries(v => [next, ...v]);
      setMonth(new Date(`${next.rawDate}T00:00:00`));
      // Modal handles its own close/share lifecycle now
      return {
        id: next.id,
        symbol: next.symbol,
        side: next.side,
        pnl: next.pnl,
        resultR: next.resultR ?? null,
        note: next.note ?? null,
        setup: next.setup ?? null,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade was not saved.");
      return null;
    }
    finally { setSaving(false); }
  }

  async function updateTrade(id: string, form: FormData) {
    setSaving(true);
    const num = (key: string) => parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const response = await apiRequest<{ entry: EntryRow }>(`/api/journal/${id}`, { method: "PATCH", body: JSON.stringify({
        symbol: form.get("symbol"),
        side: form.get("side"),
        pnl: num("pnl"),
        quantity: num("quantity"),
        fees: num("fees"),
        riskAmount: num("riskAmount"),
        resultR: num("resultR"),
        riskPercent: form.get("riskPercent"),
        session: form.get("session"),
        followingPlan: form.has("followingPlan"),
        errorMade: form.has("errorMade"),
        mistakeType: form.get("mistakeType"),
        reviewCompleted: form.has("reviewCompleted"),
        toTradingBible: form.has("toTradingBible"),
        tradedAt: form.get("tradedAt"),
        setup: form.get("setup"),
        tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: form.get("note"),
        imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
      }) });
      const next = entryFrom(response.entry);
      journalCache.delete(journalCacheKey);
      setEntries(current => current.map(entry => entry.id === id ? next : entry));
      setMonth(new Date(`${next.rawDate}T00:00:00`));
    } catch (e) { setError(e instanceof Error ? e.message : "Trade yangilanmadi"); }
    finally { setSaving(false); }
  }

  async function removeTrade(id: string) {
    setSaving(true);
    try {
      await apiRequest(`/api/journal/${id}`, { method: "DELETE" });
      journalCache.delete(journalCacheKey);
      setEntries(current => current.filter(entry => entry.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Trade o'chirilmadi"); }
    finally { setSaving(false); }
  }

  const reloadJournal = useCallback(async () => {
    journalCache.delete(journalCacheKey);
    await loadEntries(true, true);
  }, [journalCacheKey, loadEntries]);

  const shiftMonth = (n: number) => setMonth(d => new Date(d.getFullYear(), d.getMonth() + n, 1));
  const exportCsv = () => { const rows = [["Date", "Symbol", "Side", "PnL", "R", "Setup"], ...shown.map(e => [e.rawDate, e.symbol, e.side, e.pnl, e.resultR, e.setup])], a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `${account?.name || "journal"}-${monthId(month)}.csv`; a.click(); URL.revokeObjectURL(a.href); };

  if (!user) return (
    <div className="grid min-h-[75dvh] place-items-center text-center">
      <div className="animate-page-in">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#0d0d0d]">
          <ShieldCheck className="text-zinc-300" size={32} />
        </div>
        <h2 className="mt-5 text-3xl font-black">Professional trading journal</h2>
        <p className="mt-2 text-zinc-500">Track real and prop accounts in one focused workspace.</p>
        <Button className="mt-6 h-11 bg-white px-8 text-black hover:bg-zinc-200" onClick={onLogin}>Sign in with Google</Button>
      </div>
    </div>
  );

  if (loading) return <DashboardSkeleton />;

  const embedded = mode === "workspace";

  return (
    <div className={embedded ? "min-h-0" : "min-h-full"}>
      {error && (
        <div className={`${embedded ? "mb-4" : "mx-4 mt-4"} flex items-center gap-3 rounded-xl border border-rose-500/20 bg-[#1a0d10] p-3 text-sm text-rose-300`}>
          <X size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {mode === "workspace" ? (
        account ? <Workspace embedded forcedTab={forcedTab} account={account} accounts={accounts} stats={stats} equity={equity} setups={setups} mistakes={mistakes} planRate={planRate} monthCount={monthEntries.length} calendar={calendar} trades={shown} bibleTrades={bibleEntries} query={query} month={month} deleting={deleting === account.id} saving={saving} tradeRange={tradeRange} customStart={customStart} customEnd={customEnd} onRange={setTradeRange} onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} onQuery={setQuery} onBack={() => setActiveAccount(null)} onAccountChange={setActiveAccount} onTrade={openTradeComposer} onDelete={() => removeAccount(account)} onCsv={exportCsv} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onToday={() => setMonth(new Date())} onUpdateTrade={updateTrade} onRemoveTrade={removeTrade} onMt5Synced={reloadJournal} />
        : (
          <div className="rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-5 shadow-[0_18px_46px_rgba(0,0,0,.22)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
                <h3 className="mt-2 text-xl font-black text-white">Select an account to load dashboard, calendar, trades and analytics.</h3>
                <p className="mt-1 text-sm text-zinc-500">Home keeps the feed at the top, and your account workspace opens right under it.</p>
              </div>
              <Button type="button" className="h-11 rounded-2xl bg-white px-4 text-black hover:bg-zinc-200" onClick={() => { window.history.pushState(null, "", "/accounts"); window.dispatchEvent(new Event("popstate")); }}>
                Open accounts
              </Button>
            </div>
          </div>
        )
      ) : (
        <Accounts activeAccountId={activeAccountId} summaries={summaries} deleting={deleting} onAdd={() => setAccountOpen(true)} onOpen={(id) => { setActiveAccount(id); window.history.pushState(null, "", "/dashboard"); window.dispatchEvent(new Event("popstate")); }} onDelete={removeAccount} />
      )}
      <PropAccountDialog open={accountOpen} saving={saving} onOpenChange={setAccountOpen} onSave={createAccount} />
      <TradeReviewModal open={tradeOpen} saving={saving} account={account} onOpenChange={setTradeOpen} onSave={addTrade} />
    </div>
  );
}

// Accounts list.
function Accounts({ activeAccountId, summaries, deleting, onAdd, onOpen, onDelete }: { activeAccountId: string | null; summaries: Summary[]; deleting: string | null; onAdd: () => void; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void }) {
  const startingCapital = summaries.reduce((total, item) => total + item.account.accountSize, 0);
  const netPnl = summaries.reduce((total, item) => total + item.pnl, 0);
  const portfolioValue = startingCapital + netPnl;

  return (
    <div className="animate-page-in mx-auto max-w-[1320px] space-y-3 p-3 sm:p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Accounts</h1>
          <p className="mt-0.5 text-xs text-zinc-600">Your trading journals in one place.</p>
        </div>
        <Button onClick={onAdd} className="h-9 shrink-0 rounded-xl bg-white px-3 text-xs font-bold text-black hover:bg-zinc-200 sm:px-4 sm:text-sm">
          <Plus size={15} /> <span className="hidden sm:inline">Add account</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      {summaries.length ? (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#060606] px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Portfolio value</p>
              <p className="mt-1 font-mono text-xl font-black tracking-tight text-white sm:text-2xl">{cash.format(portfolioValue)}</p>
            </div>
            <div className="text-right">
              <span className={`rounded-lg px-2 py-1 font-mono text-xs font-bold ${netPnl >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                {netPnl >= 0 ? "+" : ""}{cash.format(netPnl)}
              </span>
              <p className="mt-1.5 text-[10px] text-zinc-600">{summaries.length} {summaries.length === 1 ? "account" : "accounts"} · {cash.format(startingCapital)} capital</p>
            </div>
          </div>
        </section>
      ) : null}

      {!summaries.length ? (
        <div className="grid min-h-80 place-items-center rounded-[24px] border border-dashed border-white/12 bg-[#050505] px-5 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-[#0d0d0d]">
              <WalletCards size={24} className="text-zinc-300" />
            </div>
            <h2 className="mt-4 text-xl font-black text-white">Create your first journal</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">Add an account name and starting balance. You can begin logging trades immediately.</p>
            <Button onClick={onAdd} className="mt-5 h-11 rounded-xl bg-white px-5 text-black hover:bg-zinc-200">
              <Plus size={16} /> Add account
            </Button>
          </div>
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {summaries.map((summary) => (
            <AccountCard key={summary.account.id} active={activeAccountId === summary.account.id} s={summary} deleting={deleting} onOpen={onOpen} onDelete={onDelete} />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="group grid min-h-[172px] place-items-center rounded-2xl border border-dashed border-white/12 bg-[#030303] p-4 text-center transition hover:border-white/25 hover:bg-[#070707]"
          >
            <span>
              <span className="mx-auto grid size-9 place-items-center rounded-xl border border-white/10 bg-[#0d0d0d] text-zinc-500 transition group-hover:text-white"><Plus size={17} /></span>
              <span className="mt-2.5 block text-sm font-bold text-zinc-500 transition group-hover:text-zinc-200">Add account</span>
            </span>
          </button>
        </section>
      )}
    </div>
  );
}

function AccountCard({ active = false, s, deleting, onOpen, onDelete, compact = false }: { active?: boolean; s: Summary; deleting: string | null; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void; compact?: boolean }) {
  const statusColor: Record<string, string> = { Processing: "text-sky-300 bg-[#091119] border-sky-400/20", Active: "text-emerald-400 bg-[#0b1c12] border-emerald-400/20", Passed: "text-zinc-300 bg-[#0a0a0a] border-white/15", Failed: "text-rose-400 bg-[#1a0d10] border-rose-400/20", Paused: "text-amber-400 bg-[#1a1407] border-amber-400/20" };
  const pnlTone = s.pnl >= 0 ? "text-emerald-400" : "text-rose-400";
  const sourceLabel = s.account.importSource === "mt5_bridge" ? "MT5 sync" : "Manual";
  const currentBalance = s.account.accountSize + s.pnl;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(s.account.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpen(s.account.id); }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${compact ? "min-h-[150px]" : "min-h-[172px]"} ${active ? "border-white/20 bg-[#080808] shadow-[0_12px_32px_rgba(0,0,0,.3)]" : "border-white/10 bg-[#050505] hover:border-white/20 hover:bg-[#080808]"}`}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.45)]" />
              <p className="truncate text-[15px] font-bold text-white">{s.account.name}</p>
            </div>
            <p className="truncate text-[11px] text-zinc-600">{sourceLabel} · {s.account.accountType === "real" ? "Personal" : s.account.firm || "Prop account"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${statusColor[s.account.status] || statusColor.Active}`}>
              {s.account.status}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Actions" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#0a0a0a]" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem variant="destructive" disabled={deleting === s.account.id} onClick={() => onDelete(s.account)}>
                  <Trash2 size={14} /> Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Current balance</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="font-mono text-xl font-black text-white">{cash.format(currentBalance)}</p>
            <p className={`font-mono text-xs font-bold ${pnlTone}`}>{s.pnl >= 0 ? "+" : ""}{cash.format(s.pnl)}</p>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-white/8 pt-2.5">
          <div className="flex min-w-0 items-center gap-3 text-[11px] text-zinc-500">
            <span>{s.trades} trades</span>
            <span className="text-zinc-800">/</span>
            <span>{s.winRate}% win rate</span>
          </div>
          <ChevronRight size={16} className="text-zinc-600 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

function AiCoachCard({ report, loading, error, onRefresh }: { report: AiCoachReport | null; loading: boolean; error: string | null; onRefresh: () => void }) {
  const tone = report?.mood === "protect" ? "border-rose-400/20 bg-[#130a0d]" : report?.mood === "push" ? "border-[#d9f96d]/25 bg-[#101208]" : "border-white/10 bg-[#070707]";
  return (
    <section className={`overflow-hidden rounded-[24px] border ${tone}`}>
      <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-start sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-[#050505] text-[#d9f96d]"><BrainCircuit size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black">{report?.title || "AI Trade Coach"}</h3>
            {report ? <span className="rounded-full border border-white/10 bg-[#050505] px-2 py-0.5 text-[10px] font-black uppercase text-zinc-500">{report.generatedBy}</span> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">{loading ? "Analyzing your execution, risk and discipline..." : error || report?.summary || "Premium AI coach reads your journal and turns trades into concrete next actions."}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="border-white/10 bg-transparent">
          {loading ? <Spinner className="size-[15px]" /> : <Zap size={15} />} Refresh
        </Button>
      </div>
      {report ? (
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[220px_1fr_1fr]">
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Coach score</p>
            <p className="mt-2 font-mono text-4xl font-black text-white">{Math.round(report.score)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#111111]"><div className="h-full rounded-full bg-[#d9f96d]" style={{ width: `${Math.max(0, Math.min(100, report.score))}%` }} /></div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Risk warnings</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-[#d4d4d8]">{(report.riskWarnings.length ? report.riskWarnings : ["No critical risk warning yet."]).map((item) => <li key={item}>- {item}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Next actions</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-[#d4d4d8]">{report.nextSteps.map((item) => <li key={item}>- {item}</li>)}</ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// Workspace.
function Workspace(p: {
  embedded?: boolean;
  forcedTab?: WorkspaceTab;
  account: PropAccount; accounts: PropAccount[]; stats: { pnl: number; wins: number; losses: number; rate: number; r: number; pf: number };
  equity: Array<{ trade: number; equity: number; label: string }>; setups: Array<{ name: string; pnl: number; trades: number; wins: number; rate: number }>;
  mistakes: Array<{ name: string; pnl: number; trades: number }>; planRate: number; monthCount: number;
  calendar: Array<{ day: number; trades: JournalEntry[]; pnl: number } | null>;
  trades: JournalEntry[]; bibleTrades: JournalEntry[]; query: string; month: Date; deleting: boolean; saving: boolean; tradeRange: TradeRange; customStart: string; customEnd: string;
  onRange: (value: TradeRange) => void; onCustomStart: (value: string) => void; onCustomEnd: (value: string) => void;
  onQuery: (v: string) => void; onBack: () => void; onAccountChange: (id: string) => void; onTrade: () => void; onDelete: () => void;
  onCsv: () => void; onPrev: () => void; onNext: () => void; onToday: () => void;
  onUpdateTrade: (id: string, form: FormData) => Promise<void>;
  onRemoveTrade: (id: string) => Promise<void>;
  onMt5Synced: () => Promise<void>;
}) {
  const { account, accounts, stats, equity, setups, mistakes, planRate, monthCount, calendar, trades, bibleTrades, month, embedded = false, forcedTab } = p;
  const { pnlMode, tradeSort, setTradeSort, formatPnl } = useWorkspacePreferences();
  const [selectedTrade, setSelectedTrade] = useState<JournalEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; trades: JournalEntry[]; pnl: number } | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("home");
  const [coachReport, setCoachReport] = useState<AiCoachReport | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [analyticsView, setAnalyticsView] = useState<"overview" | "strategy" | "symbols">("overview");
  const singleTabMode = embedded && Boolean(forcedTab);
  const pnlBase = account.initialBalance || account.accountSize || 1;
  const formatTradePnl = useCallback((amount: number) => formatPnl(amount, pnlBase), [formatPnl, pnlBase]);
  const currentPnl = (equity.at(-1)?.equity ?? account.initialBalance) - account.initialBalance;
  const currentEquity = account.initialBalance + currentPnl;
  const targetProgress = account.profitTarget ? Math.min(100, Math.max(0, currentPnl / account.profitTarget * 100)) : 0;
  const drawdownUsed = account.maxDrawdown && currentPnl < 0 ? Math.min(100, Math.abs(currentPnl) / account.maxDrawdown * 100) : 0;
  const sortedTrades = useMemo(
    () =>
      [...trades].sort((left, right) => {
        const leftValue = String(left.rawDate || "");
        const rightValue = String(right.rawDate || "");
        if (tradeSort === "entryDate") return leftValue.localeCompare(rightValue);
        return rightValue.localeCompare(leftValue);
      }),
    [tradeSort, trades]
  );
  const weeklyStrip = useMemo(() => buildWeeklyStrip(account, month, trades), [account, month, trades]);
  const symbolStats = useMemo(
    () =>
      [...trades.reduce((map, trade) => {
        const current = map.get(trade.symbol) || { symbol: trade.symbol, trades: 0, pnl: 0, wins: 0 };
        current.trades += 1;
        current.pnl += trade.pnl;
        current.wins += trade.pnl > 0 ? 1 : 0;
        map.set(trade.symbol, current);
        return map;
      }, new Map<string, { symbol: string; trades: number; pnl: number; wins: number }>()).values()].sort((left, right) => right.trades - left.trades),
    [trades]
  );
  const recentTrades = sortedTrades.slice(0, 5);
  const averageWin = useMemo(() => {
    const wins = trades.filter((trade) => trade.pnl > 0);
    return wins.length ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length : 0;
  }, [trades]);
  const averageLoss = useMemo(() => {
    const losses = trades.filter((trade) => trade.pnl < 0);
    return losses.length ? losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length : 0;
  }, [trades]);
  const bestTrade = useMemo(() => [...trades].sort((left, right) => right.pnl - left.pnl)[0] || null, [trades]);
  const worstTrade = useMemo(() => [...trades].sort((left, right) => left.pnl - right.pnl)[0] || null, [trades]);
  const scoreRadar = useMemo(() => {
    const pfScore = Math.max(0, Math.min(100, stats.pf * 25));
    const rrScore = Math.max(0, Math.min(100, (stats.r + 2) * 20));
    const recoveryScore = Math.max(0, Math.min(100, currentPnl >= 0 ? 85 + Math.min(15, stats.rate / 10) : 50 - drawdownUsed / 3));
    return [
      { subject: "Winrate", value: stats.rate, fullMark: 100 },
      { subject: "Discipline", value: planRate, fullMark: 100 },
      { subject: "Recovery", value: recoveryScore, fullMark: 100 },
      { subject: "Profit", value: pfScore, fullMark: 100 },
      { subject: "RR", value: rrScore, fullMark: 100 },
    ];
  }, [currentPnl, drawdownUsed, planRate, stats.pf, stats.r, stats.rate]);
  const profitabilityScore = useMemo(() => Math.round(scoreRadar.reduce((sum, item) => sum + item.value, 0) / scoreRadar.length), [scoreRadar]);

  const openTrade = useCallback((trade: JournalEntry) => {
    setSelectedTrade(trade);
    window.history.pushState(null, "", `/trades/${trade.id}`);
  }, []);

  const closeTrade = useCallback(() => {
    setSelectedTrade(null);
    if (window.location.pathname.startsWith("/trades/")) {
      window.history.pushState(null, "", "/trades");
    }
  }, []);

  const loadCoach = useCallback(async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const response = await apiRequest<{ report: AiCoachReport }>(`/api/ai/trade-report?accountId=${encodeURIComponent(account.id)}`);
      setCoachReport(response.report);
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : "AI coach failed to load.");
    } finally {
      setCoachLoading(false);
    }
  }, [account.id]);

  const loadOpenPositions = useCallback(async () => {
    try {
      const response = await apiRequest<{ positions: OpenPosition[]; pendingSetup?: boolean }>(`/api/prop-accounts/${account.id}/mt5/positions`);
      setOpenPositions(response.positions || []);
    } catch {
      setOpenPositions([]);
    }
  }, [account.id]);

  useEffect(() => {
    if (!forcedTab) return;
    setActiveTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    const handleSidebarTab = (event: Event) => {
      const nextTab = (event as CustomEvent<{ tab?: WorkspaceTab }>).detail?.tab;
      if (nextTab && WORKSPACE_TABS.some(([value]) => value === nextTab)) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener("tradeway:journal-tab", handleSidebarTab as EventListener);
    window.addEventListener("tradeway:home-tab", handleSidebarTab as EventListener);
    return () => {
      window.removeEventListener("tradeway:journal-tab", handleSidebarTab as EventListener);
      window.removeEventListener("tradeway:home-tab", handleSidebarTab as EventListener);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "overview") return;
    void loadCoach();
    void loadOpenPositions();
  }, [activeTab, loadCoach, loadOpenPositions, trades.length]);

  useEffect(() => {
    if (!window.location.pathname.startsWith("/trades/")) return;
    const tradeId = window.location.pathname.split("/")[2];
    if (!tradeId) return;
    const nextTrade = trades.find((trade) => trade.id === tradeId) || null;
    setSelectedTrade(nextTrade);
  }, [trades]);

  return (
    <div className="animate-page-in mx-auto max-w-[1540px]">
      <div className="space-y-3 p-3 sm:p-4 lg:space-y-3 lg:p-4">
        {!embedded ? (
          <div className="w-full sm:w-[320px]">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Account</span>
            <Select value={account.id} onValueChange={p.onAccountChange}>
            <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-[#090909]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
          {[
            { title: "Monthly P&L", value: formatTradePnl(stats.pnl), icon: stats.pnl >= 0 ? TrendingUp : TrendingDown, color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
            { title: "Win rate", value: `${stats.rate}%`, icon: Target, color: "text-zinc-300" },
            { title: "Average R", value: `${stats.r.toFixed(2)}R`, icon: BarChart3, color: "text-zinc-300" },
            { title: "Profit factor", value: stats.pf.toFixed(2), icon: TrendingUp, color: "text-amber-400" },
            { title: "Wins / Losses", value: `${stats.wins} / ${stats.losses}`, icon: CalendarDays, color: "text-[#f1f1f1]" },
          ].map((s, index) => (
            <Card key={s.title} size="sm" className={`gap-0 py-0 ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
              <CardContent className="flex min-h-18 items-center gap-2 p-3 sm:min-h-18 sm:gap-3 sm:p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#050505] sm:size-10">
                  <s.icon size={18} className={s.color} />
                </span>
                <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.title}</p>
                  <p className={`truncate font-mono text-[15px] font-black sm:text-[1.05rem] ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="gap-4">
          {!singleTabMode || activeTab === "home" ? (
          <TabsContent value="home" className="space-y-4">
            <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5 sm:p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Selected account</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <PropFirmLogo firm={account.firm} compact />
                    <div className="min-w-0">
                      <h2 className="truncate text-[1.05rem] font-black text-white">{account.name}</h2>
                      <p className="mt-1 text-xs text-zinc-500">{account.accountType === "real" ? "Real account" : "Prop account"} / {account.marketType} / {account.phase}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${account.status === "Active" ? "border-emerald-400/20 bg-[#0b1c12] text-emerald-300" : "border-white/10 bg-[#0a0a0a] text-zinc-300"}`}>
                      {account.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <QuickMetric label="Balance" value={cash.format(account.accountSize)} note="Everything below follows this account" />
                    <QuickMetric label="Trades" value={String(trades.length)} note={`${stats.wins} wins / ${stats.losses} losses`} />
                    <QuickMetric label="Net P&L" value={formatTradePnl(currentPnl)} note={`${stats.rate}% win rate`} tone={currentPnl >= 0 ? "good" : "bad"} />
                  </div>
                </div>
                <div className="grid w-full gap-2.5 xl:w-[280px]">
                  <button type="button" onClick={p.onTrade} className="rounded-[1rem] border border-white/10 bg-white px-4 py-2.5 text-left text-sm font-black text-black transition hover:bg-zinc-200">
                    Add trade
                  </button>
                  <div className="rounded-[1rem] border border-white/8 bg-[#050505] p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Focus</p>
                    <p className="mt-2 text-[13px] leading-5 text-zinc-300">Every workspace section below follows this account instantly when you switch it.</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
              <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-black text-white">Recent trades</h3>
                    <p className="mt-1 text-xs text-zinc-500">Open any trade, review it, then share it to Home from the trade view.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="border-white/10 bg-[#050505] hover:bg-[#101010]" onClick={() => setActiveTab("trades")}>
                    Open log
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {recentTrades.length ? recentTrades.map((trade) => (
                    <button key={trade.id} type="button" onClick={() => openTrade(trade)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[#050505] px-3 py-2.5 text-left transition hover:bg-[#0d0d0d]">
                      <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-[#0b1c12] text-emerald-300" : "bg-[#1a0d10] text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500">{trade.setup || trade.session || trade.rawDate}</p>
                      </div>
                      <strong className={`font-mono text-sm font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatTradePnl(trade.pnl)}</strong>
                    </button>
                  )) : <div className="grid min-h-40 place-items-center rounded-2xl border border-white/8 bg-[#050505] text-center text-sm text-zinc-500">No trades in this account yet.</div>}
                </div>
              </section>

              <div className="grid gap-4">
                <AiCoachCard report={coachReport} loading={coachLoading} error={coachError} onRefresh={loadCoach} />
                <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-black text-white">Sync & Focus</h3>
                      <p className="mt-1 text-xs text-zinc-500">Compact control panel for the selected account.</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-2xl border border-white/8 bg-black px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Auto sync</p>
                      <p className="mt-1 text-sm font-bold text-white">{account.platform === "mt5" ? "MT5 bridge connected flow" : "Manual or CSV workflow"}</p>
                      <p className="mt-1 text-xs text-zinc-500">All dashboard sections below follow this account only.</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Top symbol</p>
                      <p className="mt-1 text-sm font-bold text-white">{symbolStats[0]?.symbol || "No trade edge yet"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{symbolStats[0] ? `${symbolStats[0].trades} trades recorded` : "Add trades to unlock symbol edge."}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Coach mode</p>
                      <p className="mt-1 text-sm font-bold text-white">{coachReport?.mood === "protect" ? "Protect capital" : coachReport?.mood === "push" ? "Push A+ only" : "Stay consistent"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{coachReport?.summary || "AI coach summary appears here when the report is ready."}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </TabsContent>
          ) : null}

          {/* Overview */}
          {!singleTabMode || activeTab === "overview" ? (
          <TabsContent value="overview">
            <DashboardOverview
              account={account}
              stats={stats}
              equity={equity}
              weeklyStrip={weeklyStrip}
              setups={setups}
              mistakes={mistakes}
              planRate={planRate}
              monthCount={monthCount}
              recentTrades={recentTrades}
              openPositions={openPositions}
              currentPnl={currentPnl}
              currentEquity={currentEquity}
              targetProgress={targetProgress}
              drawdownUsed={drawdownUsed}
              balancesHidden={pnlMode === "hidden"}
              formatTradePnl={formatTradePnl}
              onOpenTrade={openTrade}
              onSeeAll={() => setActiveTab("trades")}
              onAddTrade={p.onTrade}
            />
          </TabsContent>
          ) : null}

          {/* Calendar */}
          {!singleTabMode || activeTab === "calendar" ? (
          <TabsContent value="calendar">
            <div className="calendar-workspace space-y-3">
              <div className="calendar-summary-grid grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Net P&L", value: formatTradePnl(stats.pnl), note: `${monthCount} trades this month`, icon: stats.pnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />, tone: stats.pnl >= 0 ? "text-emerald-300 bg-emerald-400/10" : "text-rose-300 bg-rose-400/10" },
                  { label: "Trading days", value: String(calendar.filter((day) => day?.trades.length).length), note: `${month.toLocaleDateString("en-US", { month: "long" })} activity`, icon: <CalendarDays size={15} />, tone: "text-sky-300 bg-sky-400/10" },
                  { label: "Win rate", value: `${stats.rate}%`, note: `${stats.wins} wins / ${stats.losses} losses`, icon: <Target size={15} />, tone: stats.rate >= 50 ? "text-emerald-300 bg-emerald-400/10" : "text-amber-300 bg-amber-400/10" },
                ].map((item) => (
                  <div key={item.label} className="calendar-summary-card min-w-0 rounded-[1rem] border border-white/8 bg-[#070707] p-2.5 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-[10px]">{item.label}</p>
                      <span className={`grid size-6 shrink-0 place-items-center rounded-lg sm:size-7 ${item.tone}`}>{item.icon}</span>
                    </div>
                    <p className="mt-2 truncate font-mono text-[13px] font-black text-white sm:text-xl">{item.value}</p>
                    <p className="mt-1 hidden truncate text-[11px] text-zinc-500 sm:block">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="calendar-surface overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                <div className="calendar-toolbar flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[.035] text-zinc-300"><CalendarDays size={17} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">Performance calendar</p>
                      <h3 className="truncate text-[15px] font-black capitalize text-white">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
                      <p className="hidden text-[11px] text-zinc-500 sm:block">Select a day to review its trades.</p>
                    </div>
                  </div>
                  <div className="calendar-month-switcher grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1 rounded-xl border border-white/8 bg-[#050505] p-1 lg:ml-auto">
                    <Button aria-label="Previous month" variant="ghost" size="icon-sm" onClick={p.onPrev}><ChevronLeft size={16} /></Button>
                    <strong className="min-w-0 px-2 text-center text-xs capitalize sm:min-w-28 sm:text-sm">{month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</strong>
                    <Button aria-label="Next month" variant="ghost" size="icon-sm" onClick={p.onNext}><ChevronRight size={16} /></Button>
                    <Button variant="outline" size="sm" onClick={p.onToday} className="border-white/8 bg-transparent px-2 text-[11px] hover:bg-[#101010] sm:px-3">Today</Button>
                  </div>
                </div>
                <div className="p-2 sm:p-3 md:p-4">
                  <div className="mb-1 grid grid-cols-7 gap-1 sm:mb-1.5 sm:gap-1.5">
                    {WEEKDAYS_FULL.map((d) => (
                      <div key={d} className="py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-zinc-500 sm:py-2 sm:text-[11px]">
                        <span className="sm:hidden">{d.slice(0, 2)}</span>
                        <span className="hidden sm:inline">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="calendar-grid grid grid-cols-7 content-start gap-1 [grid-auto-rows:58px] sm:gap-1.5 sm:[grid-auto-rows:80px] md:[grid-auto-rows:92px] lg:[grid-auto-rows:100px]">
                    {calendar.map((c, i) =>
                      c ? (
                        <button
                          key={`${monthId(month)}-${i}`}
                          type="button"
                          aria-label={`${month.toLocaleDateString("en-US", { month: "long" })} ${c.day}: ${c.trades.length} trades, ${formatTradePnl(c.pnl)}`}
                          onClick={() => (c.trades.length ? setSelectedDay(c) : null)}
                          className={`calendar-day relative h-full w-full overflow-hidden rounded-md border p-1 text-left transition-colors sm:rounded-[0.9rem] sm:p-2.5 ${c.trades.length ? c.pnl >= 0 ? "border-emerald-500/16 bg-[#07110c] hover:border-emerald-400/30 hover:bg-[#0a1710]" : "border-rose-500/16 bg-[#12070a] hover:border-rose-400/30 hover:bg-[#180a0e]" : "border-white/6 bg-[#050505]"} ${c.trades.length ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25" : "cursor-default"}`}
                        >
                          {c.trades.length ? <span className={`absolute inset-x-0 top-0 h-0.5 ${c.pnl >= 0 ? "bg-emerald-400/60" : "bg-rose-400/60"}`} /> : null}
                          <div className="flex items-start justify-between">
                            <span className={`grid size-4 place-items-center rounded text-[9px] font-bold sm:size-6 sm:rounded-md sm:text-[11px] ${c.trades.length ? "bg-[#050505] text-[#f1f1f1]" : "text-zinc-500"}`}>{c.day}</span>
                            {c.trades.length > 0 ? <span className="hidden font-mono text-[10px] text-zinc-500 sm:inline">{c.trades.length}T</span> : null}
                          </div>
                          {c.trades.length > 0 ? (
                            <>
                              <p className={`mt-1 truncate font-mono text-[9px] font-black leading-tight sm:mt-5 sm:text-sm ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                <span className="sm:hidden">{c.pnl >= 0 ? "+" : ""}{cashCompact.format(c.pnl)}</span>
                                <span className="hidden sm:inline">{c.pnl >= 0 ? "+" : ""}{cash.format(c.pnl)}</span>
                              </p>
                              <p className="mt-1 hidden text-[10px] font-medium text-zinc-500 lg:block">{c.trades.length === 1 ? "1 closed trade" : `${c.trades.length} closed trades`}</p>
                            </>
                          ) : null}
                        </button>
                      ) : (
                        <div key={`${monthId(month)}-empty-${i}`} className="h-full rounded-md border border-transparent sm:rounded-[1rem]" />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          ) : null}

          {/* Trades */}
          {!singleTabMode || activeTab === "trades" ? (
          <TabsContent value="trades">
            <TradesArchive
              trades={sortedTrades}
              query={p.query}
              range={p.tradeRange}
              customStart={p.customStart}
              customEnd={p.customEnd}
              sort={tradeSort}
              winRate={stats.rate}
              averageR={stats.r}
              formatPnl={formatTradePnl}
              onQueryChange={p.onQuery}
              onRangeChange={p.onRange}
              onCustomStartChange={p.onCustomStart}
              onCustomEndChange={p.onCustomEnd}
              onSortChange={setTradeSort}
              onOpenTrade={openTrade}
              onAddTrade={p.onTrade}
            />
          </TabsContent>
          ) : null}

          {/* Trading Bible */}
          {!singleTabMode || activeTab === "bible" ? (
          <TabsContent value="bible">
            <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
              <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="flex items-center gap-2 font-bold"><BookOpen size={17} className="text-zinc-300" /> Trading Bible</h3>
                  <p className="text-xs text-zinc-500">Eng yaxshi setup va reviewlar playbook sifatida saqlanadi.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
                  <MiniStat label="BIBLE TRADES" value={String(bibleTrades.length)} />
                  <MiniStat label="REVIEWED" value={String(bibleTrades.filter(t => t.reviewCompleted).length)} />
                </div>
              </div>
              {bibleTrades.length ? (
                <div className="grid gap-3 p-3 lg:grid-cols-2">
                  {bibleTrades.map((trade) => (
                    <button key={trade.id} type="button" onClick={() => openTrade(trade)} className="group overflow-hidden rounded-[1rem] border border-white/8 bg-[#050505] text-left transition hover:border-white/20 hover:bg-[#0d0d0d]">
                      {trade.imageUrl ? (
                        <div className="h-40 overflow-hidden border-b border-white/8 bg-black">
                          <MediaImage src={trade.imageUrl} alt={`${trade.symbol} bible chart`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                        </div>
                      ) : null}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{trade.side}</span>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-base font-black text-white">{trade.symbol}</h4>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{trade.setup || "No setup"} / {trade.session || "No session"} / {trade.date}</p>
                          </div>
                          <span className="rounded-xl bg-[#0d0d0d] px-2.5 py-1 text-[10px] font-black text-zinc-300">{reviewScore(trade)}/6</span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-300">{trade.note || "Review note yozilmagan."}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {trade.reviewCompleted ? <span className="inline-flex items-center gap-1 rounded-lg bg-[#0d0d0d] px-2 py-1 text-[10px] font-bold text-zinc-300"><CheckCircle2 size={11} /> Reviewed</span> : null}
                          {trade.followingPlan ? <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Plan</span> : <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">Off-plan</span>}
                          {trade.riskPercent ? <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">{trade.riskPercent}</span> : null}
                          {(trade.tags ?? []).slice(0, 3).map(tag => <span key={tag} className="rounded-lg bg-[#0d0d0d] px-2 py-1 text-[10px] text-zinc-400">{tag}</span>)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-72 place-items-center px-6 text-center">
                  <div>
                    <BookOpen className="mx-auto text-zinc-700" size={38} />
                    <h3 className="mt-4 text-lg font-black">Trading Bible bo'sh</h3>
                    <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">Trade review ochib "+ to Trading Bible" ni belgilang. Eng yaxshi setup va saboqlar shu yerda playbook bo'lib yig'iladi.</p>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>
          ) : null}

          {/* Analytics */}
          {!singleTabMode || activeTab === "analytics" ? (
          <TabsContent value="analytics" className="space-y-3">
            <div className="grid grid-cols-3 items-center gap-1 rounded-[0.95rem] border border-white/8 bg-[#050505] p-1 sm:flex sm:flex-wrap sm:gap-2">
              {[
                ["overview", "Overview"],
                ["strategy", "Strategy"],
                ["symbols", "Symbols"],
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setAnalyticsView(value as "overview" | "strategy" | "symbols")} className={`min-w-0 rounded-[0.8rem] px-2 py-2 text-xs font-semibold transition sm:px-3 sm:py-1.5 ${analyticsView === value ? "bg-white text-black" : "bg-transparent text-zinc-500 hover:bg-[#0d0d0d] hover:text-white"}`}>
                  {label}
                </button>
              ))}
              <div className="col-span-3 rounded-[0.8rem] bg-[#0d0d0d] px-3 py-1.5 text-center text-xs font-semibold text-white sm:col-span-1 sm:ml-auto">All time</div>
            </div>

            {analyticsView === "overview" ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
                <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                  <div className="border-b border-white/8 px-4 py-3">
                    <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                      {account.name} <span className="mx-1 text-zinc-700">&gt;</span> Analytics
                    </p>
                    <h3 className="text-[14px] font-black text-white">Account Balance</h3>
                    <p className="mt-1 text-xs text-zinc-500">{month.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <div className="h-[240px] p-2 sm:h-[260px] sm:p-4">
                    {equity.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equity} margin={{ left: 8, right: 8, top: 16, bottom: 4 }}>
                          <defs>
                            <linearGradient id="analyticsBalanceFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#171717" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                          <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#707b91" }} />
                          <YAxis width={54} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`} tick={{ fontSize: 10, fill: "#707b91" }} />
                          <Tooltip formatter={v => cash.format(Number(v))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#171717", border: "1px solid #333333", borderRadius: 12, color: "#f1f1f1" }} />
                          <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#analyticsBalanceFill)" strokeWidth={3} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <Empty text="Add trades to unlock analytics charts." />}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                    <div>
                      <h3 className="text-[14px] font-black text-white">TradeWay Profitability Score</h3>
                      <p className="mt-1 text-[11px] text-zinc-500">{trades.length < 5 ? "Early read, score becomes sharper after 5+ trades." : "Live score based on execution quality."}</p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-[#050505] px-2.5 py-1 text-[11px] font-black text-white">{profitabilityScore}</span>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-[1fr_72px]">
                    <div className="h-[210px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={scoreRadar}>
                          <PolarGrid stroke="rgba(255,255,255,.12)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#d4d4d8", fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.36} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-[#050505] px-2.5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Score</p>
                      <p className="text-2xl font-black text-white">{profitabilityScore}</p>
                      <div className="h-full min-h-24 rounded-full bg-[#0d0d0d] p-2">
                        <div className="h-full w-full rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" style={{ clipPath: `inset(${100 - profitabilityScore}% 0 0 0 round 999px)` }} />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
                  <MetricPanel title="Average Win" value={averageWin ? formatTradePnl(averageWin) : "-"} note={bestTrade ? `Best ${bestTrade.symbol}` : "No winning trade"} accent="good" />
                  <MetricPanel title="Average Loss" value={averageLoss ? formatTradePnl(averageLoss) : "-"} note={worstTrade ? `Worst ${worstTrade.symbol}` : "No losing trade"} accent="bad" />
                  <MetricPanel title="Best Trade" value={bestTrade ? formatTradePnl(bestTrade.pnl) : "-"} note={bestTrade?.symbol || "No data"} accent={bestTrade && bestTrade.pnl >= 0 ? "good" : "neutral"} />
                  <MetricPanel title="Worst Trade" value={worstTrade ? formatTradePnl(worstTrade.pnl) : "-"} note={worstTrade?.symbol || "No data"} accent={worstTrade && worstTrade.pnl < 0 ? "bad" : "neutral"} />
                </div>
              </div>
            ) : null}

            {analyticsView === "strategy" ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                  <h3 className="text-[14px] font-black text-white">Setup Performance</h3>
                  <div className="mt-4 space-y-4">
                    {setups.length ? setups.map((setup) => (
                      <div key={setup.name}>
                        <div className="flex text-sm">
                          <span className="text-white">{setup.name}</span>
                          <span className={`ml-auto font-mono font-bold ${setup.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {setup.rate}% / {setup.pnl >= 0 ? "+" : ""}{cash.format(setup.pnl)}
                          </span>
                        </div>
                        <ProgressBar label={`${setup.trades} trades`} value={setup.rate} color="bg-zinc-300" />
                      </div>
                    )) : <Empty text="No setup analytics yet." />}
                  </div>
                </section>
                <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                  <h3 className="text-[14px] font-black text-white">Discipline & Mistakes</h3>
                  <div className="mt-4">
                    <ProgressBar label={`${monthCount} trades reviewed`} value={planRate} color="bg-emerald-500" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <MiniStat label="PLAN ALIGNMENT" value={`${planRate}%`} />
                    <MiniStat label="MISTAKE TRADES" value={String(mistakes.reduce((sum, item) => sum + item.trades, 0))} />
                  </div>
                  <div className="mt-4 space-y-3">
                    {mistakes.length ? mistakes.map((mistake) => (
                      <div key={mistake.name} className="flex items-center justify-between rounded-xl border border-white/8 bg-[#050505] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{mistake.name}</p>
                          <p className="text-[11px] text-zinc-500">{mistake.trades} repeats</p>
                        </div>
                        <b className={`font-mono font-bold ${mistake.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {mistake.pnl >= 0 ? "+" : ""}{cash.format(mistake.pnl)}
                        </b>
                      </div>
                    )) : <Empty text="No mistakes recorded this month." />}
                  </div>
                </section>
              </div>
            ) : null}

            {analyticsView === "symbols" ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                  <h3 className="text-[14px] font-black text-white">Most Traded Symbols</h3>
                  <div className="mt-4 space-y-2">
                    {symbolStats.length ? symbolStats.map((symbol) => (
                      <div key={symbol.symbol} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#050505] px-3 py-3">
                        <div className="flex items-center gap-2">
                          <InstrumentBadge symbol={symbol.symbol} compact className="shrink-0 bg-[#121212]" />
                          <div>
                            <p className="text-xs text-zinc-500">{symbol.trades} trades / {symbol.wins} wins</p>
                          </div>
                        </div>
                        <strong className={`font-mono text-sm font-black ${symbol.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{symbol.pnl >= 0 ? "+" : ""}{cash.format(symbol.pnl)}</strong>
                      </div>
                    )) : <Empty text="No symbol data yet." />}
                  </div>
                </section>
                <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                  <h3 className="text-[14px] font-black text-white">Account Details</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {[
                      ["FIRM", account.firm || "Independent"],
                      ["PHASE", account.phase],
                      ["MARKET", account.marketType],
                      ["PLATFORM", (account.platform || "manual").toUpperCase()],
                      ["START DATE", account.startDate],
                      ["TARGET", cash.format(account.profitTarget)],
                      ["MAX DD", cash.format(account.maxDrawdown)],
                      ["DAILY DD", cash.format(account.dailyDrawdown)],
                    ].map(([label, value]) => <MiniStat key={label} label={label} value={value} />)}
                  </div>
                </section>
              </div>
            ) : null}
          </TabsContent>
          ) : null}
          {!embedded && account.platform === "mt5" && (!singleTabMode || activeTab === "settings") ? (
            <TabsContent value="settings">
              <Mt5Settings account={account} onSynced={p.onMt5Synced} />
            </TabsContent>
          ) : null}
        </Tabs>
      {selectedTrade ? (
          <TradeEditor
            trade={selectedTrade}
            saving={p.saving}
            onClose={closeTrade}
            onSave={async (form) => {
              await p.onUpdateTrade(selectedTrade.id, form);
              closeTrade();
            }}
            onDelete={async () => {
              await p.onRemoveTrade(selectedTrade.id);
              closeTrade();
            }}
          />
        ) : null}
      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => { if (!open) setSelectedDay(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-hidden border-border bg-background p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-white/8 px-5 py-4 text-left">
            <DialogTitle className="text-white">
              {selectedDay ? new Date(`${monthId(month)}-${String(selectedDay.day).padStart(2, "0")}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Day trades"}
            </DialogTitle>
            <DialogDescription>
              {selectedDay ? `${selectedDay.trades.length} trades / ${formatTradePnl(selectedDay.pnl)}` : "Closed trades for this day"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(90dvh-84px)] overflow-y-auto p-3 sm:p-4">
            {selectedDay?.trades.length ? (
              <div className="space-y-2">
                {selectedDay.trades.map((trade) => {
                  const winning = trade.pnl >= 0;
                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => {
                        setSelectedDay(null);
                        openTrade(trade);
                      }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black px-3 py-3 text-left transition hover:bg-[#0b0b0b]"
                    >
                      <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 rounded-xl bg-[#151515]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-[#0b1c12] text-emerald-300" : "bg-[#1a0d10] text-rose-300"}`}>
                            {trade.side === "Long" ? "Buy" : "Sell"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500">{trade.setup || trade.session || trade.note || "Open trade review"}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <strong className={`block font-mono text-sm font-black ${winning ? "text-emerald-300" : "text-rose-300"}`}>
                          {formatTradePnl(trade.pnl)}
                        </strong>
                        <span className="mt-1 block text-[10px] text-zinc-500">{(trade.resultR || 0).toFixed(2)}R</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty text="No trades for this day." />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function TradeEditor({ trade, saving, onClose, onSave, onDelete }: { trade: JournalEntry; saving: boolean; onClose: () => void; onSave: (form: FormData) => Promise<void>; onDelete: () => Promise<void> }) {
  const [imageUrls, setImageUrls] = useState(trade.imageUrls?.length ? trade.imageUrls : trade.imageUrl ? [trade.imageUrl] : []);
  const [previewUrl, setPreviewUrl] = useState("");
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const uploadTradeImages = async (files?: FileList | null) => {
    const selected = Array.from(files ?? []).slice(0, 3 - imageUrls.length);
    if (!selected.length) return;
    setUploadingImages(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/journal/image", { method: "POST", credentials: "same-origin", body: form });
        const payload = (await response.json()) as { imageUrl?: string; error?: string };
        if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Image upload failed.");
        uploaded.push(payload.imageUrl);
      }
      setImageUrls((current) => [...current, ...uploaded].slice(0, 3));
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/88 p-2 pt-[max(.5rem,env(safe-area-inset-top))] pb-[max(.5rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <form action={onSave} className="relative z-10 flex h-[calc(100dvh-1rem)] max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-white/8 bg-[#070707] text-foreground shadow-2xl shadow-black/80 sm:h-auto sm:max-h-[92dvh] sm:rounded-[18px] lg:max-w-6xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:items-center sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1 py-0.5 sm:py-0">
            <h3 className="truncate text-base font-black sm:text-lg">{trade.symbol}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{trade.side}</span>
              <span className={`shrink-0 rounded-lg px-2 py-0.5 font-mono text-[10px] font-black ${trade.pnl >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{trade.pnl >= 0 ? "+" : ""}{cash.format(trade.pnl)}</span>
              <p className="hidden text-xs text-zinc-500 sm:block">Trade review, edit and screenshots</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-500 transition hover:bg-[#111111] hover:text-white" aria-label="Close">
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          <section className="mb-4 overflow-hidden rounded-2xl border border-white/8">
            <div className="flex items-center justify-between border-b border-white/8 bg-[#050505] px-3 py-2 sm:px-4 sm:py-2.5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Chart · TradingView</p>
              <span className="text-[10px] text-zinc-600">{trade.symbol}</span>
            </div>
            <TradingViewChart symbol={trade.symbol} className="h-[240px] sm:h-[380px] lg:h-[440px]" />
          </section>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,.88fr)]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Trade details</p>
                  <h4 className="mt-1 text-sm font-black text-white">Execution snapshot</h4>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">Symbol<Input name="symbol" defaultValue={trade.symbol} className="mt-1" /></label>
                  <label className="min-w-0 text-xs text-zinc-500">
                    Side
                    <Select name="side" defaultValue={trade.side}>
                      <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent position="popper" align="start">
                        <SelectItem value="Long">Long</SelectItem>
                        <SelectItem value="Short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="min-w-0 text-xs text-zinc-500">Date<Input name="tradedAt" type="date" defaultValue={trade.rawDate} className="mt-1" /></label>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="min-w-0 text-xs text-zinc-500">PnL<Input name="pnl" inputMode="decimal" defaultValue={String(trade.pnl)} className="mt-1" /></label>
                  <label className="min-w-0 text-xs text-zinc-500">Quantity<Input name="quantity" inputMode="decimal" defaultValue={String(trade.quantity)} className="mt-1" /></label>
                  <label className="col-span-2 min-w-0 text-xs text-zinc-500 sm:col-span-1">Fees<Input name="fees" inputMode="decimal" defaultValue={String(trade.fees)} className="mt-1" /></label>
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Context</p>
                  <h4 className="mt-1 text-sm font-black text-white">Risk, setup and tagging</h4>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="text-xs text-zinc-500">Risk $<Input name="riskAmount" inputMode="decimal" defaultValue={String(trade.riskAmount ?? 0)} className="mt-1" /></label>
                  <label className="text-xs text-zinc-500">RR<Input name="resultR" inputMode="decimal" defaultValue={String(trade.resultR ?? 0)} className="mt-1" /></label>
                  <label className="col-span-2 text-xs text-zinc-500 sm:col-span-1">Risk %<Input name="riskPercent" defaultValue={trade.riskPercent ?? ""} className="mt-1" /></label>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <label className="col-span-2 text-xs text-zinc-500 sm:col-span-1">Setup<Input name="setup" defaultValue={trade.setup ?? ""} className="mt-1" /></label>
                  <label className="text-xs text-zinc-500">Session<Input name="session" defaultValue={trade.session ?? ""} className="mt-1" /></label>
                  <label className="text-xs text-zinc-500">Tags<Input name="tags" defaultValue={(trade.tags ?? []).join(", ")} className="mt-1" /></label>
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Review note</p>
                  <h4 className="mt-1 text-sm font-black text-white">What happened in this trade?</h4>
                </div>
                <label className="block text-xs text-zinc-500">
                  Notes
                  <Textarea name="note" defaultValue={trade.note} className="mt-1 min-h-36" />
                </label>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Screenshots</p>
                    <h4 className="mt-1 text-sm font-black text-white">Chart capture</h4>
                  </div>
                  <span className="text-xs text-zinc-500">{imageUrls.length}/3</span>
                </div>
                <input ref={imageInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadTradeImages(event.target.files)} />
                <input type="hidden" name="imageUrls" value={JSON.stringify(imageUrls)} />
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black"><button type="button" onClick={() => { setPreviewUrl(url); setScreenshotOpen(true); }} className="h-full w-full"><MediaImage src={url} alt={`${trade.symbol} screenshot ${index + 1}`} className="h-full w-full object-cover" /></button><button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-[#050505] text-rose-200"><Trash2 size={12} /></button></div>)}
                  {imageUrls.length < 3 ? <button type="button" onClick={() => imageInputRef.current?.click()} className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/10 text-zinc-500 transition hover:bg-[#111111] hover:text-white">{uploadingImages ? <Spinner className="size-5" /> : <Plus size={22} />}</button> : null}
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-[#050505] p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Review checklist</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="followingPlan" value="true" defaultChecked={trade.followingPlan} /> Following plan?</label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="reviewCompleted" value="true" defaultChecked={trade.reviewCompleted} /> Review completed</label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="errorMade" value="true" defaultChecked={trade.errorMade} /> Error made?</label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="toTradingBible" value="true" defaultChecked={trade.toTradingBible} /> Add to Trading Bible</label>
                </div>
                <label className="mt-3 block text-xs text-zinc-500">Mistake type<Input name="mistakeType" defaultValue={trade.mistakeType ?? ""} className="mt-1" /></label>
              </section>

              <details className="group overflow-hidden rounded-2xl border">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-bold text-zinc-200 transition hover:bg-[#171717]">
              <ImageIcon size={17} className="text-zinc-500" />
              Share image
              <span className="ml-auto text-xs font-medium text-zinc-600 group-open:hidden">PNG yaratish</span>
              <ChevronDown className="ml-auto hidden text-zinc-500 group-open:block" size={16} />
            </summary>
            <div className="border-t border-white/8 p-3 sm:p-4">
              <TradeReviewImage trade={trade} chartUrls={imageUrls} />
            </div>
              </details>
            </div>
          </div>
        </div>
        <footer className="grid shrink-0 grid-cols-3 gap-2 border-t border-border bg-card p-3 sm:flex sm:p-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={saving} variant="destructive">
                <Trash2 size={15} /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tradeni o&apos;chirish</AlertDialogTitle>
                <AlertDialogDescription>
                  {trade.symbol} trade jurnal va analytics hisobidan butunlay o&apos;chadi. Bu amalni qaytarib bo&apos;lmaydi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                  O&apos;chirish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button disabled={saving} className="bg-white text-black hover:bg-zinc-200 sm:ml-auto">{saving ? <Spinner className="size-[15px]" /> : null}<span className="sm:hidden">Save</span><span className="hidden sm:inline">Save changes</span></Button>
        </footer>
      </form>
      <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[min(1100px,calc(100vw-1rem))] overflow-hidden border-border bg-background p-0 sm:max-w-[min(1100px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-border px-4 py-3 pr-14">
            <DialogTitle>{trade.symbol} screenshot</DialogTitle>
            <DialogDescription>Chart screenshotni to&apos;liq o&apos;lchamda ko&apos;rish</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[calc(92dvh-72px)] place-items-center overflow-auto bg-black p-2 sm:p-4">
            {previewUrl ? <MediaImage src={previewUrl} alt={`${trade.symbol} full chart screenshot`} className="max-h-[calc(92dvh-104px)] max-w-full object-contain" /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeReviewImage({ trade, chartUrls }: { trade: JournalEntry; chartUrls: string[] }) {
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    let active = true;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return;

    const winning = trade.pnl >= 0;
    const accent = winning ? "#42d99b" : "#fb7185";
    const date = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const render = (chart: HTMLImageElement | null) => {
      const background = context.createLinearGradient(0, 0, 1080, 1080);
      background.addColorStop(0, "#0b0b0b");
      background.addColorStop(0.55, "#171717");
      background.addColorStop(1, "#232323");
      context.fillStyle = background;
      context.fillRect(0, 0, 1080, 1080);

      if (chart) {
        const scale = Math.max(1080 / chart.width, 1080 / chart.height);
        const width = chart.width * scale;
        const height = chart.height * scale;
        context.globalAlpha = 0.34;
        context.drawImage(chart, (1080 - width) / 2, (1080 - height) / 2, width, height);
        context.globalAlpha = 1;
      } else {
        const candleHeights = [105, 174, 130, 238, 182, 310, 244];
        candleHeights.forEach((height, index) => {
          const x = 710 + index * 45;
          const y = 620 - height;
          context.strokeStyle = "rgba(212,212,216,.22)";
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(x + 12, y - 42);
          context.lineTo(x + 12, y + height + 42);
          context.stroke();
          context.fillStyle = index % 3 === 0 ? "rgba(66,217,155,.28)" : "rgba(212,212,216,.24)";
          context.fillRect(x, y, 24, height);
        });
      }

      const shade = context.createLinearGradient(0, 0, 1080, 0);
      shade.addColorStop(0, "rgba(11,11,11,.98)");
      shade.addColorStop(0.58, "rgba(11,11,11,.9)");
      shade.addColorStop(1, "rgba(11,11,11,.2)");
      context.fillStyle = shade;
      context.fillRect(0, 0, 1080, 1080);

      context.fillStyle = "#ffffff";
      context.font = "900 58px Arial, sans-serif";
      context.fillText("TRADEWAY", 82, 125);
      context.fillStyle = "#75819b";
      context.font = "500 30px Arial, sans-serif";
      context.fillText(date, 82, 245);

      context.fillStyle = "#ffffff";
      context.font = "900 72px Arial, sans-serif";
      context.fillText(trade.symbol, 82, 355);
      context.font = "700 38px Arial, sans-serif";
      context.fillText(trade.side, 82, 440);
      context.fillStyle = "rgba(255,255,255,.28)";
      context.fillRect(225, 400, 3, 50);
      context.fillStyle = accent;
      context.fillText(trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE", 260, 440);

      context.font = "900 92px Arial, sans-serif";
      context.fillText(`${(trade.resultR ?? 0).toFixed(2)}R`, 82, 565);
      context.font = "800 32px Arial, sans-serif";
      context.fillText(`${trade.pnl >= 0 ? "+" : ""}${cash.format(trade.pnl)}`, 86, 615);

      context.fillStyle = "rgba(255,255,255,.13)";
      context.fillRect(82, 665, 916, 2);

      const drawMetric = (label: string, value: string, x: number, y: number) => {
        context.fillStyle = "#6f7b94";
        context.font = "600 27px Arial, sans-serif";
        context.fillText(label, x, y);
        context.fillStyle = "#ffffff";
        context.font = "800 39px Arial, sans-serif";
        context.fillText(value, x, y + 58);
      };

      drawMetric("Entry Price", String(trade.entry), 82, 750);
      drawMetric("Exit Price", String(trade.exit), 570, 750);
      drawMetric("Lot Size", String(trade.quantity), 82, 900);
      drawMetric("Risk", trade.riskPercent || cash.format(trade.riskAmount || 0), 330, 900);
      drawMetric("Setup", trade.setup || "Unspecified", 570, 900);

      context.strokeStyle = accent;
      context.lineWidth = 8;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(690, 550);
      context.bezierCurveTo(760, 500, 820, 430, 900, 330);
      context.stroke();
      context.fillStyle = accent;
      context.beginPath();
      context.moveTo(900, 330);
      context.lineTo(846, 350);
      context.lineTo(884, 392);
      context.closePath();
      context.fill();

      try {
        const url = canvas.toDataURL("image/png", 1);
        if (active) setGeneratedUrl(url);
      } catch {
        if (chart) render(null);
      }
    };

    const chartUrl = chartUrls[0] ?? "";
    if (chartUrl) {
      const chart = new window.Image();
      chart.crossOrigin = "anonymous";
      chart.onload = () => render(chart);
      chart.onerror = () => render(null);
      chart.src = chartUrl;
    } else {
      render(null);
    }

    return () => {
      active = false;
    };
  }, [chartUrls, trade]);

  const download = () => {
    if (!generatedUrl) return;
    const link = document.createElement("a");
    link.href = generatedUrl;
    link.download = `${trade.symbol}-${trade.rawDate}-tradeway.png`;
    link.click();
  };

  return (
    <section className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-xl shadow-black/25">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-sm font-black text-white">Trade review image</p>
          <p className="text-xs text-zinc-500">1080 x 1080 PNG</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" disabled={!generatedUrl} onClick={download} size="sm" variant="outline" className="border-white/10 bg-[#0d0d0d] hover:bg-[#151515]">
            <Download size={15} /> PNG
          </Button>
        </div>
      </div>
      {generatedUrl ? (
        <MediaImage src={generatedUrl} alt={`${trade.symbol} TradeWay review image`} className="aspect-square w-full bg-[#0b0b0b] object-contain" />
      ) : (
        <div className="grid aspect-square w-full place-items-center text-zinc-500">
          <Spinner className="size-6" />
        </div>
      )}
    </section>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex text-xs">
        <span className="text-zinc-500">{label}</span>
        <b className="ml-auto text-[#f1f1f1]">{value.toFixed(0)}%</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#242424]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function MetricPanel({ title, value, note, accent = "neutral" }: { title: string; value: string; note: string; accent?: "neutral" | "good" | "bad" }) {
  const color = accent === "good" ? "text-emerald-400" : accent === "bad" ? "text-rose-400" : "text-white";
  return (
    <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className={`mt-2 font-mono text-[1.55rem] font-black tracking-tight ${color}`}>{value}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{note}</p>
    </section>
  );
}

function QuickMetric({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-white";
  return (
    <div className="rounded-[1rem] border border-white/8 bg-[#050505] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-1 truncate font-mono text-lg font-black ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#050505] px-3 py-2.5 text-center">
      <small className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{label}</small>
      <b className="mt-1 block truncate font-mono text-sm">{value}</b>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-zinc-500">{text}</div>;
}
