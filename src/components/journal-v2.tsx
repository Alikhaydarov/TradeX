"use client";

import {
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "../lib/api-client";
import { DashboardOverview } from "@/features/trading-dashboard/components/dashboard-overview";
import { JournalAccountList } from "./journal/journal-account-list";
import { JournalTradeEditor } from "./journal/journal-trade-editor";
import { JournalGallery } from "./journal/journal-gallery";
import { JournalFilters, type JournalTradeRange as TradeRange } from "./journal/journal-filters";
import {
  journalEntryFromRow,
  type JournalEntryRow,
  useJournalData,
} from "./journal/use-journal-data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent } from "./ui/tabs";
import { Spinner } from "./ui/spinner";
import { Skeleton } from "./ui/skeleton";
import { useActiveAccountStore } from "./active-account-context";
import { useAuth } from "./auth-context";
import { InstrumentBadge } from "./instrument-badge";
import { PropAccountDialog } from "./prop-account-dialog";
import { PropFirmLogo } from "./prop-firm-logo";
import { Mt5Settings } from "./mt5-settings";
import { TradeReviewModal } from "./trade-review-modal";
import { TradingViewChart } from "./tradingview-chart";
import { useWorkspacePreferences } from "./workspace-preferences-context";
import type { JournalEntry, OpenPosition, PropAccount } from "./types";

type AccountRow = {
  id: string;
  name: string;
  account_type?: "prop" | "real" | null;
  firm: string;
  prop_site?: string | null;
  prop_login?: string | null;
  import_source?:
    | "manual"
    | "mt5_bridge"
    | "ctrader"
    | "tradovate"
    | "ninjatrader"
    | "official_api"
    | null;
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
type EntryRow = JournalEntryRow;
type Summary = {
  account: PropAccount;
  trades: number;
  pnl: number;
  winRate: number;
  target: number;
  dd: number;
};
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
const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const cashCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const WEEKDAYS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WORKSPACE_TABS = [
  ["home", "Home"],
  ["overview", "Dashboard"],
  ["calendar", "Calendar"],
  ["trades", "Trades"],
  ["bible", "Bible"],
  ["analytics", "Analytics"],
  ["settings", "Settings"],
] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number][0];

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
const entryFrom = journalEntryFromRow;
const monthId = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
function calendarMonthFromPath() {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/calendar\/(\d{4})\/(1[0-2]|[1-9])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = new Date(year, month, 1);
  return date.getFullYear() === year && date.getMonth() === month ? date : null;
}
const reviewScore = (entry: JournalEntry) =>
  [
    entry.note,
    entry.setup,
    entry.session,
    entry.imageUrl,
    entry.reviewCompleted,
    entry.toTradingBible,
  ].filter(Boolean).length;
const csvCell = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};
function buildWeeklyStrip(
  account: PropAccount,
  month: Date,
  trades: JournalEntry[],
) {
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === month.getFullYear() &&
    now.getMonth() === month.getMonth();
  const anchor = isCurrentMonth
    ? new Date(now)
    : new Date(month.getFullYear(), month.getMonth(), 1);
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
      label: day.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
      }),
      trades: dayTrades.length,
      pnl,
      percent,
    };
  });
}

function DashboardSkeleton() {
  return (
    <div
      className="space-y-3 p-3 sm:p-4"
      aria-label="Loading trading dashboard"
      role="status"
    >
      <div className="flex items-end justify-between gap-4 px-1 py-1">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/[.06]" />
          <Skeleton className="h-7 w-48 bg-white/[.07]" />
        </div>
        <Skeleton className="h-9 w-24 bg-white/[.07]" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl bg-white/[.055]" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.7fr)]">
        <Skeleton className="h-[360px] rounded-xl bg-white/[.055]" />
        <Skeleton className="h-[360px] rounded-xl bg-white/[.055]" />
      </div>
      <Skeleton className="h-32 rounded-xl bg-white/[.055]" />
    </div>
  );
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
  const router = useRouter();
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    addAccount,
    refreshAccounts,
    loading: accountsLoading,
  } = useActiveAccountStore();
  const [month, setMonth] = useState(() => calendarMonthFromPath() || new Date());
  const [calendarView, setCalendarView] = useState<"year" | "month">(() => calendarMonthFromPath() ? "month" : "year");
  const [accountOpen, setAccountOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tradeRange, setTradeRange] = useState<TradeRange>("monthly");
  const [customStart, setCustomStart] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (mode !== "accounts") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    setAccountOpen(true);
    router.replace("/accounts");
  }, [mode]);

  const requestAccountId = mode === "workspace" ? activeAccountId : null;
  const {
    entries,
    setEntries,
    loading,
    error,
    setError,
    invalidate,
    reload: reloadJournal,
  } = useJournalData({
    userId: user?.id ?? null,
    mode,
    accountId: requestAccountId,
    accountsLoading,
  });

  const openTradeComposer = useCallback(() => {
    if (mode === "workspace" && !activeAccountId) {
      setError("Select an account before adding a trade.");
      router.push("/accounts");
      return;
    }
    setTradeOpen(true);
  }, [activeAccountId, mode, router, setError]);
 
  useEffect(() => {
    const syncCalendarRoute = () => {
      const routeMonth = calendarMonthFromPath();
      if (routeMonth) {
        setMonth(routeMonth);
        setCalendarView("month");
      } else if (window.location.pathname === "/calendar") {
        setCalendarView("year");
      }
    };

    syncCalendarRoute();
    window.addEventListener("popstate", syncCalendarRoute);
    return () => window.removeEventListener("popstate", syncCalendarRoute);
  }, [forcedTab]);

  useEffect(() => {
    if (!user) return;
    const handleOpenTrade = () => openTradeComposer();
    window.addEventListener("tradox:add-trade", handleOpenTrade);
    return () =>
      window.removeEventListener("tradox:add-trade", handleOpenTrade);
  }, [openTradeComposer, user]);

  const account = accounts.find((a) => a.id === activeAccountId) || null;
  const accountEntries = useMemo(() => {
    if (mode === "workspace") return entries;
    return activeAccountId
      ? entries.filter((e) => e.propAccountId === activeAccountId)
      : entries;
  }, [entries, activeAccountId, mode]);
  const bibleEntries = useMemo(
    () =>
      accountEntries
        .filter((e) => e.toTradingBible)
        .sort((a, b) => reviewScore(b) - reviewScore(a)),
    [accountEntries],
  );
  const monthEntries = useMemo(
    () => accountEntries.filter((e) => e.rawDate?.startsWith(monthId(month))),
    [accountEntries, month],
  );
  const rangeEntries = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    if (tradeRange === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      return accountEntries.filter((e) => e.rawDate === today);
    }
    if (tradeRange === "monthly") return monthEntries;
    if (tradeRange === "quarter") {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0);
      return accountEntries.filter((e) => {
        const d = new Date(`${e.rawDate}T00:00:00`);
        return d >= start && d <= end;
      });
    }
    if (tradeRange === "yearly")
      return accountEntries.filter((e) => e.rawDate?.startsWith(String(y)));
    return accountEntries.filter((e) => {
      const date = e.rawDate || "";
      return date >= customStart && date <= customEnd;
    });
  }, [accountEntries, month, monthEntries, tradeRange, customStart, customEnd]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? rangeEntries.filter((e) =>
          `${e.symbol} ${e.setup} ${e.note} ${e.tags?.join(" ")}`
            .toLowerCase()
            .includes(q),
        )
      : rangeEntries;
  }, [rangeEntries, query]);
  const summaries = useMemo<Summary[]>(
    () =>
      accounts.map((account) => {
        const t = entries.filter((e) => e.propAccountId === account.id),
          p = t.reduce((s, e) => s + e.pnl, 0),
          w = t.filter((e) => e.pnl > 0).length;
        return {
          account,
          trades: t.length,
          pnl: p,
          winRate: t.length ? Math.round((w / t.length) * 100) : 0,
          target: account.profitTarget
            ? Math.min(100, Math.max(0, (p / account.profitTarget) * 100))
            : 0,
          dd:
            account.maxDrawdown && p < 0
              ? Math.min(100, (Math.abs(p) / account.maxDrawdown) * 100)
              : 0,
        };
      }),
    [accounts, entries],
  );
  const stats = useMemo(() => {
    const pnl = monthEntries.reduce((s, e) => s + e.pnl, 0),
      wins = monthEntries.filter((e) => e.pnl > 0),
      losses = monthEntries.filter((e) => e.pnl < 0),
      gw = wins.reduce((s, e) => s + e.pnl, 0),
      gl = Math.abs(losses.reduce((s, e) => s + e.pnl, 0));
    return {
      pnl,
      wins: wins.length,
      losses: losses.length,
      rate: monthEntries.length
        ? Math.round((wins.length / monthEntries.length) * 100)
        : 0,
      r: monthEntries.length
        ? monthEntries.reduce((s, e) => s + (e.resultR || 0), 0) /
          monthEntries.length
        : 0,
      pf: gl ? gw / gl : gw ? gw : 0,
    };
  }, [monthEntries]);
  const equity = useMemo(() => {
    const initialBalance = account?.initialBalance || 0;
    const trades = [...accountEntries]
      .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
      .reduce<Array<{ trade: number; equity: number; label: string }>>(
        (points, entry, index) => {
          const previousEquity = points[index - 1]?.equity ?? initialBalance;
          return [
            ...points,
            {
              trade: index + 1,
              equity: previousEquity + entry.pnl,
              label: entry.rawDate || `Trade ${index + 1}`,
            },
          ];
        },
        [],
      );
    return [{ trade: 0, equity: initialBalance, label: "Start" }, ...trades];
  }, [accountEntries, account]);
  const setups = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number; wins: number }>();
    monthEntries.forEach((e) => {
      const k = e.setup || "Uncategorized",
        v = m.get(k) || { pnl: 0, trades: 0, wins: 0 };
      m.set(k, {
        pnl: v.pnl + e.pnl,
        trades: v.trades + 1,
        wins: v.wins + (e.pnl > 0 ? 1 : 0),
      });
    });
    return [...m]
      .map(([name, v]) => ({
        name,
        ...v,
        rate: Math.round((v.wins / v.trades) * 100),
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [monthEntries]);
  const mistakes = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>();
    monthEntries
      .filter((e) => e.errorMade && e.mistakeType)
      .forEach((e) => {
        const k = e.mistakeType as string,
          v = m.get(k) || { pnl: 0, trades: 0 };
        m.set(k, { pnl: v.pnl + e.pnl, trades: v.trades + 1 });
      });
    return [...m]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.pnl - b.pnl);
  }, [monthEntries]);
  const planRate = useMemo(
    () =>
      monthEntries.length
        ? Math.round(
            (monthEntries.filter((e) => e.followingPlan).length /
              monthEntries.length) *
              100,
          )
        : 0,
    [monthEntries],
  );
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
      const trades =
        tradesByDay.get(`${monthId(month)}-${String(day).padStart(2, "0")}`) ??
        [];
      return {
        day,
        trades,
        pnl: trades.reduce((sum, entry) => sum + entry.pnl, 0),
      };
    });
  }, [month, accountEntries]);
  const yearlyCalendar = useMemo(() => {
    const year = month.getFullYear();
    const months = Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex, trades: [] as JournalEntry[] }));
    for (const entry of accountEntries) {
      if (!entry.rawDate?.startsWith(`${year}-`)) continue;
      const entryMonth = Number(entry.rawDate.slice(5, 7)) - 1;
      if (entryMonth >= 0 && entryMonth < 12) months[entryMonth].trades.push(entry);
    }
    return months.map(({ monthIndex, trades }) => ({
      monthIndex,
      trades: trades.length,
      pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
      wins: trades.filter((trade) => trade.pnl > 0).length,
    }));
  }, [accountEntries, month]);

  async function createAccount(form: FormData) {
    setSaving(true);
    try {
      const body: Record<string, string> = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, String(v)]),
      );
      const mt5Login = (body.mt5Login ?? "").trim();
      const mt5Password = (body.mt5Password ?? "").trim();
      const mt5Server = (body.mt5Server ?? "").trim();
      delete body.mt5Login;
      delete body.mt5Password;
      delete body.mt5Server;

      const r = await apiRequest<{ account: AccountRow }>(
        "/api/prop-accounts",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      const next = accountFrom(r.account);
      addAccount(next);
      setAccountOpen(false);

      if (mt5Login && mt5Password && mt5Server) {
        await apiRequest(`/api/prop-accounts/${next.id}/mt5`, {
          method: "PUT",
          body: JSON.stringify({
            login: mt5Login,
            password: mt5Password,
            server: mt5Server,
          }),
        });
      }
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account was not saved.");
    } finally {
      setSaving(false);
    }
    return null;
  }

  async function removeAccount(a: PropAccount) {
    if (!window.confirm(`${a.name} accountini o'chirasizmi?`)) return;
    setDeleting(a.id);
    try {
      await apiRequest(`/api/prop-accounts/${a.id}`, { method: "DELETE" });
      await refreshAccounts();
      if (activeAccountId === a.id) setActiveAccount(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account o'chirilmadi");
    } finally {
      setDeleting(null);
    }
  }

  async function addTrade(form: FormData): Promise<{
    id: string;
    symbol: string;
    side: string;
    pnl: number;
    resultR: number | null;
    note: string | null;
    setup: string | null;
  } | null> {
    if (!account) return null;
    setSaving(true);
    const num = (key: string) =>
      parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const r = await apiRequest<{ entry: EntryRow }>("/api/journal", {
        method: "POST",
        body: JSON.stringify({
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
          tags: String(form.get("tags") || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          note: form.get("note"),
          imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
        }),
      });
      const next = entryFrom(r.entry);
      invalidate();
      setEntries((v) => [next, ...v]);
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
    } finally {
      setSaving(false);
    }
  }

  async function updateTrade(id: string, form: FormData) {
    setSaving(true);
    const num = (key: string) =>
      parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const response = await apiRequest<{ entry: EntryRow }>(
        `/api/journal/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
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
            tags: String(form.get("tags") || "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            note: form.get("note"),
            imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
          }),
        },
      );
      const next = entryFrom(response.entry);
      invalidate();
      setEntries((current) =>
        current.map((entry) => (entry.id === id ? next : entry)),
      );
      setMonth(new Date(`${next.rawDate}T00:00:00`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade yangilanmadi");
    } finally {
      setSaving(false);
    }
  }

  async function removeTrade(id: string) {
    setSaving(true);
    try {
      await apiRequest(`/api/journal/${id}`, { method: "DELETE" });
      invalidate();
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade o'chirilmadi");
    } finally {
      setSaving(false);
    }
  }


  const openCalendarMonth = (monthIndex: number) => {
    const next = new Date(month.getFullYear(), monthIndex, 1);
    setMonth(next);
    setCalendarView("month");
    router.push(`/calendar/${next.getFullYear()}/${next.getMonth() + 1}`);
  };
  const openCalendarOverview = () => {
    setCalendarView("year");
    router.push("/calendar");
  };
  const shiftCalendarYear = (delta: number) => setMonth((current) => new Date(current.getFullYear() + delta, current.getMonth(), 1));
  const shiftMonth = (delta: number) => setMonth((current) => {
    const next = new Date(current.getFullYear(), current.getMonth() + delta, 1);
    if (calendarView === "month") router.push(`/calendar/${next.getFullYear()}/${next.getMonth() + 1}`);
    return next;
  });
  const exportCsv = () => {
    const rows = [
        ["Date", "Symbol", "Side", "PnL", "R", "Setup"],
        ...shown.map((e) => [
          e.rawDate,
          e.symbol,
          e.side,
          e.pnl,
          e.resultR,
          e.setup,
        ]),
      ],
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    a.download = `${account?.name || "journal"}-${monthId(month)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!user)
    return (
      <div className="grid min-h-[75dvh] place-items-center text-center">
        <div className="animate-page-in">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#0d0d0d]">
            <ShieldCheck className="text-zinc-300" size={32} />
          </div>
          <h2 className="mt-5 text-3xl font-black">
            Professional trading journal
          </h2>
          <p className="mt-2 text-zinc-500">
            Track real and prop accounts in one focused workspace.
          </p>
          <Button
            className="mt-6 h-11 bg-white px-8 text-black hover:bg-zinc-200"
            onClick={onLogin}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    );

  if (loading) return <DashboardSkeleton />;

  const embedded = mode === "workspace";

  return (
    <div className={embedded ? "min-h-0" : "min-h-full"}>
      {error && (
        <div
          className={`${embedded ? "mb-4" : "mx-4 mt-4"} flex items-center gap-3 rounded-xl border border-rose-500/20 bg-[#1a0d10] p-3 text-sm text-rose-300`}
        >
          <X size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}
      {mode === "workspace" ? (
        account ? (
          <Workspace
            embedded
            forcedTab={forcedTab}
            account={account}
            accounts={accounts}
            stats={stats}
            equity={equity}
            setups={setups}
            mistakes={mistakes}
            planRate={planRate}
            monthCount={monthEntries.length}
            calendar={calendar}
            yearlyCalendar={yearlyCalendar}
            calendarView={calendarView}
            trades={shown}
            bibleTrades={bibleEntries}
            query={query}
            month={month}
            deleting={deleting === account.id}
            saving={saving}
            tradeRange={tradeRange}
            customStart={customStart}
            customEnd={customEnd}
            onRange={setTradeRange}
            onCustomStart={setCustomStart}
            onCustomEnd={setCustomEnd}
            onQuery={setQuery}
            onBack={() => setActiveAccount(null)}
            onAccountChange={setActiveAccount}
            onTrade={openTradeComposer}
            onDelete={() => removeAccount(account)}
            onCsv={exportCsv}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            onToday={() => {
              const today = new Date();
              setMonth(today);
              if (calendarView === "month") router.push(`/calendar/${today.getFullYear()}/${today.getMonth() + 1}`);
            }}
            onCalendarMonthSelect={openCalendarMonth}
            onCalendarOverview={openCalendarOverview}
            onCalendarYearShift={shiftCalendarYear}
            onUpdateTrade={updateTrade}
            onRemoveTrade={removeTrade}
            onMt5Synced={reloadJournal}
          />
        ) : (
          <div className="rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-5 shadow-[0_18px_46px_rgba(0,0,0,.22)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Workspace
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  Select an account to load dashboard, calendar, trades and
                  analytics.
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Home keeps the feed at the top, and your account workspace
                  opens right under it.
                </p>
              </div>
              <Button
                type="button"
                className="h-11 rounded-2xl bg-white px-4 text-black hover:bg-zinc-200"
                onClick={() => {
                  router.push("/accounts");
                }}
              >
                Open accounts
              </Button>
            </div>
          </div>
        )
      ) : (
        <JournalAccountList
          activeAccountId={activeAccountId}
          summaries={summaries}
          deleting={deleting}
          onAdd={() => setAccountOpen(true)}
          onOpen={(id) => {
            setActiveAccount(id);
            router.push("/dashboard");
          }}
          onDelete={removeAccount}
        />
      )}
      <PropAccountDialog
        open={accountOpen}
        saving={saving}
        onOpenChange={setAccountOpen}
        onSave={createAccount}
      />
      <TradeReviewModal
        open={tradeOpen}
        saving={saving}
        account={account}
        onOpenChange={setTradeOpen}
        onSave={addTrade}
      />
    </div>
  );
}

// Accounts list.
function AiCoachCard({
  report,
  loading,
  error,
  onRefresh,
}: {
  report: AiCoachReport | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const tone =
    report?.mood === "protect"
      ? "border-rose-400/20 bg-[#130a0d]"
      : report?.mood === "push"
        ? "border-[#d9f96d]/25 bg-[#101208]"
        : "border-white/10 bg-[#070707]";
  return (
    <section className={`overflow-hidden rounded-[24px] border ${tone}`}>
      <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-start sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-[#050505] text-[#d9f96d]">
          <BrainCircuit size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black">
              {report?.title || "AI Trade Coach"}
            </h3>
            {report ? (
              <span className="rounded-full border border-white/10 bg-[#050505] px-2 py-0.5 text-[10px] font-black uppercase text-zinc-500">
                {report.generatedBy}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">
            {loading
              ? "Analyzing your execution, risk and discipline..."
              : error ||
                report?.summary ||
                "Premium AI coach reads your journal and turns trades into concrete next actions."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="border-white/10 bg-transparent"
        >
          {loading ? <Spinner className="size-[15px]" /> : <Zap size={15} />}{" "}
          Refresh
        </Button>
      </div>
      {report ? (
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[220px_1fr_1fr]">
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Coach score
            </p>
            <p className="mt-2 font-mono text-4xl font-black text-white">
              {Math.round(report.score)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#111111]">
              <div
                className="h-full rounded-full bg-[#d9f96d]"
                style={{
                  width: `${Math.max(0, Math.min(100, report.score))}%`,
                }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Risk warnings
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-[#d4d4d8]">
              {(report.riskWarnings.length
                ? report.riskWarnings
                : ["No critical risk warning yet."]
              ).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#050505] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Next actions
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-[#d4d4d8]">
              {report.nextSteps.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
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
  account: PropAccount;
  accounts: PropAccount[];
  stats: {
    pnl: number;
    wins: number;
    losses: number;
    rate: number;
    r: number;
    pf: number;
  };
  equity: Array<{ trade: number; equity: number; label: string }>;
  setups: Array<{
    name: string;
    pnl: number;
    trades: number;
    wins: number;
    rate: number;
  }>;
  mistakes: Array<{ name: string; pnl: number; trades: number }>;
  planRate: number;
  monthCount: number;
  calendar: Array<{ day: number; trades: JournalEntry[]; pnl: number } | null>;
  yearlyCalendar: Array<{ monthIndex: number; trades: number; pnl: number; wins: number }>;
  calendarView: "year" | "month";
  trades: JournalEntry[];
  bibleTrades: JournalEntry[];
  query: string;
  month: Date;
  deleting: boolean;
  saving: boolean;
  tradeRange: TradeRange;
  customStart: string;
  customEnd: string;
  onRange: (value: TradeRange) => void;
  onCustomStart: (value: string) => void;
  onCustomEnd: (value: string) => void;
  onQuery: (v: string) => void;
  onBack: () => void;
  onAccountChange: (id: string) => void;
  onTrade: () => void;
  onDelete: () => void;
  onCsv: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCalendarMonthSelect: (monthIndex: number) => void;
  onCalendarOverview: () => void;
  onCalendarYearShift: (delta: number) => void;
  onUpdateTrade: (id: string, form: FormData) => Promise<void>;
  onRemoveTrade: (id: string) => Promise<void>;
  onMt5Synced: () => Promise<void>;
}) {
  const {
    account,
    accounts,
    stats,
    equity,
    setups,
    mistakes,
    planRate,
    monthCount,
    calendar,
    yearlyCalendar,
    calendarView,
    trades,
    bibleTrades,
    month,
    embedded = false,
    forcedTab,
  } = p;
  const router = useRouter();
  const { pnlMode, tradeSort, setTradeSort, formatPnl } =
    useWorkspacePreferences();
  const [selectedTrade, setSelectedTrade] = useState<JournalEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    day: number;
    trades: JournalEntry[];
    pnl: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("home");
  const [coachReport, setCoachReport] = useState<AiCoachReport | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [analyticsView, setAnalyticsView] = useState<
    "overview" | "strategy" | "symbols"
  >("overview");
  const singleTabMode = embedded && Boolean(forcedTab);
  const pnlBase = account.initialBalance || account.accountSize || 1;
  const formatTradePnl = useCallback(
    (amount: number) => formatPnl(amount, pnlBase),
    [formatPnl, pnlBase],
  );
  const currentPnl =
    (equity.at(-1)?.equity ?? account.initialBalance) - account.initialBalance;
  const currentEquity = account.initialBalance + currentPnl;
  const targetProgress = account.profitTarget
    ? Math.min(100, Math.max(0, (currentPnl / account.profitTarget) * 100))
    : 0;
  const drawdownUsed =
    account.maxDrawdown && currentPnl < 0
      ? Math.min(100, (Math.abs(currentPnl) / account.maxDrawdown) * 100)
      : 0;
  const yearlyPnl = yearlyCalendar.reduce((sum, item) => sum + item.pnl, 0);
  const yearlyTrades = yearlyCalendar.reduce((sum, item) => sum + item.trades, 0);
  const activeMonths = yearlyCalendar.filter((item) => item.trades > 0).length;
  const bestMonth = yearlyCalendar.reduce(
    (best, item) => (item.pnl > best.pnl ? item : best),
    yearlyCalendar[0] || { monthIndex: 0, trades: 0, pnl: 0, wins: 0 },
  );
  const sortedTrades = useMemo(
    () =>
      [...trades].sort((left, right) => {
        const leftValue = String(left.rawDate || "");
        const rightValue = String(right.rawDate || "");
        if (tradeSort === "entryDate")
          return leftValue.localeCompare(rightValue);
        return rightValue.localeCompare(leftValue);
      }),
    [tradeSort, trades],
  );
  const weeklyStrip = useMemo(
    () => buildWeeklyStrip(account, month, trades),
    [account, month, trades],
  );
  const symbolStats = useMemo(
    () =>
      [
        ...trades
          .reduce((map, trade) => {
            const current = map.get(trade.symbol) || {
              symbol: trade.symbol,
              trades: 0,
              pnl: 0,
              wins: 0,
            };
            current.trades += 1;
            current.pnl += trade.pnl;
            current.wins += trade.pnl > 0 ? 1 : 0;
            map.set(trade.symbol, current);
            return map;
          }, new Map<string, { symbol: string; trades: number; pnl: number; wins: number }>())
          .values(),
      ].sort((left, right) => right.trades - left.trades),
    [trades],
  );
  const recentTrades = sortedTrades.slice(0, 5);
  const averageWin = useMemo(() => {
    const wins = trades.filter((trade) => trade.pnl > 0);
    return wins.length
      ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length
      : 0;
  }, [trades]);
  const averageLoss = useMemo(() => {
    const losses = trades.filter((trade) => trade.pnl < 0);
    return losses.length
      ? losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length
      : 0;
  }, [trades]);
  const bestTrade = useMemo(
    () => [...trades].sort((left, right) => right.pnl - left.pnl)[0] || null,
    [trades],
  );
  const worstTrade = useMemo(
    () => [...trades].sort((left, right) => left.pnl - right.pnl)[0] || null,
    [trades],
  );
  const scoreRadar = useMemo(() => {
    const pfScore = Math.max(0, Math.min(100, stats.pf * 25));
    const rrScore = Math.max(0, Math.min(100, (stats.r + 2) * 20));
    const recoveryScore = Math.max(
      0,
      Math.min(
        100,
        currentPnl >= 0
          ? 85 + Math.min(15, stats.rate / 10)
          : 50 - drawdownUsed / 3,
      ),
    );
    return [
      { subject: "Winrate", value: stats.rate, fullMark: 100 },
      { subject: "Discipline", value: planRate, fullMark: 100 },
      { subject: "Recovery", value: recoveryScore, fullMark: 100 },
      { subject: "Profit", value: pfScore, fullMark: 100 },
      { subject: "RR", value: rrScore, fullMark: 100 },
    ];
  }, [currentPnl, drawdownUsed, planRate, stats.pf, stats.r, stats.rate]);
  const profitabilityScore = useMemo(
    () =>
      Math.round(
        scoreRadar.reduce((sum, item) => sum + item.value, 0) /
          scoreRadar.length,
      ),
    [scoreRadar],
  );

  const openTrade = useCallback((trade: JournalEntry) => {
    setSelectedTrade(trade);
    router.push(`/trades/${trade.id}`);
  }, [router]);

  const closeTrade = useCallback(() => {
    setSelectedTrade(null);
    if (window.location.pathname.startsWith("/trades/")) {
      router.push("/trades");
    }
  }, [router]);

  const loadCoach = useCallback(async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const response = await apiRequest<{ report: AiCoachReport }>(
        `/api/ai/trade-report?accountId=${encodeURIComponent(account.id)}`,
      );
      setCoachReport(response.report);
    } catch (error) {
      setCoachError(
        error instanceof Error ? error.message : "AI coach failed to load.",
      );
    } finally {
      setCoachLoading(false);
    }
  }, [account.id]);

  const loadOpenPositions = useCallback(async () => {
    try {
      const response = await apiRequest<{
        positions: OpenPosition[];
        pendingSetup?: boolean;
      }>(`/api/prop-accounts/${account.id}/mt5/positions`);
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
      const nextTab = (event as CustomEvent<{ tab?: WorkspaceTab }>).detail
        ?.tab;
      if (nextTab && WORKSPACE_TABS.some(([value]) => value === nextTab)) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener(
      "tradeway:journal-tab",
      handleSidebarTab as EventListener,
    );
    window.addEventListener(
      "tradeway:home-tab",
      handleSidebarTab as EventListener,
    );
    return () => {
      window.removeEventListener(
        "tradeway:journal-tab",
        handleSidebarTab as EventListener,
      );
      window.removeEventListener(
        "tradeway:home-tab",
        handleSidebarTab as EventListener,
      );
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
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Account
            </span>
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
            {
              title: "Monthly P&L",
              value: formatTradePnl(stats.pnl),
              icon: stats.pnl >= 0 ? TrendingUp : TrendingDown,
              color: stats.pnl >= 0 ? "text-emerald-300" : "text-rose-300",
            },
            {
              title: "Win rate",
              value: `${stats.rate}%`,
              icon: Target,
              color: "text-zinc-300",
            },
            {
              title: "Average R",
              value: `${stats.r.toFixed(2)}R`,
              icon: BarChart3,
              color: "text-zinc-300",
            },
            {
              title: "Profit factor",
              value: stats.pf.toFixed(2),
              icon: TrendingUp,
              color: "text-amber-400",
            },
            {
              title: "Wins / Losses",
              value: `${stats.wins} / ${stats.losses}`,
              icon: CalendarDays,
              color: "text-[#f1f1f1]",
            },
          ].map((s, index) => (
            <Card
              key={s.title}
              size="sm"
              className={`gap-0 py-0 ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <CardContent className="flex min-h-18 items-center gap-2 p-3 sm:min-h-18 sm:gap-3 sm:p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#050505] sm:size-10">
                  <s.icon size={18} className={s.color} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {s.title}
                  </p>
                  <p
                    className={`truncate font-mono text-[15px] font-black sm:text-[1.05rem] ${s.color}`}
                  >
                    {s.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section content */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
          className="gap-4"
        >
          {!singleTabMode || activeTab === "home" ? (
            <TabsContent value="home" className="space-y-4">
              <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5 sm:p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      Selected account
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <PropFirmLogo firm={account.firm} compact />
                      <div className="min-w-0">
                        <h2 className="truncate text-[1.05rem] font-black text-white">
                          {account.name}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          {account.accountType === "real"
                            ? "Real account"
                            : "Prop account"}{" "}
                          / {account.marketType} / {account.phase}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold ${account.status === "Active" ? "border-emerald-400/20 bg-[#0b1c12] text-emerald-300" : "border-white/10 bg-[#0a0a0a] text-zinc-300"}`}
                      >
                        {account.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <QuickMetric
                        label="Balance"
                        value={cash.format(account.accountSize)}
                        note="Everything below follows this account"
                      />
                      <QuickMetric
                        label="Trades"
                        value={String(trades.length)}
                        note={`${stats.wins} wins / ${stats.losses} losses`}
                      />
                      <QuickMetric
                        label="Net P&L"
                        value={formatTradePnl(currentPnl)}
                        note={`${stats.rate}% win rate`}
                        tone={currentPnl >= 0 ? "good" : "bad"}
                      />
                    </div>
                  </div>
                  <div className="grid w-full gap-2.5 xl:w-[280px]">
                    <button
                      type="button"
                      onClick={p.onTrade}
                      className="rounded-[1rem] border border-white/10 bg-white px-4 py-2.5 text-left text-sm font-black text-black transition hover:bg-zinc-200"
                    >
                      Add trade
                    </button>
                    <div className="rounded-[1rem] border border-white/8 bg-[#050505] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Focus
                      </p>
                      <p className="mt-2 text-[13px] leading-5 text-zinc-300">
                        Every workspace section below follows this account
                        instantly when you switch it.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
                <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-black text-white">
                        Recent trades
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Open any trade, review it, then share it to Home from
                        the trade view.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-[#050505] hover:bg-[#101010]"
                      onClick={() => setActiveTab("trades")}
                    >
                      Open log
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {recentTrades.length ? (
                      recentTrades.map((trade) => (
                        <button
                          key={trade.id}
                          type="button"
                          onClick={() => openTrade(trade)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[#050505] px-3 py-2.5 text-left transition hover:bg-[#0d0d0d]"
                        >
                          <InstrumentBadge
                            symbol={trade.symbol}
                            compact
                            className="shrink-0 bg-[#121212]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-[#0b1c12] text-emerald-300" : "bg-[#1a0d10] text-rose-300"}`}
                              >
                                {trade.side === "Long" ? "Buy" : "Sell"}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-zinc-500">
                              {trade.setup || trade.session || trade.rawDate}
                            </p>
                          </div>
                          <strong
                            className={`font-mono text-sm font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                          >
                            {formatTradePnl(trade.pnl)}
                          </strong>
                        </button>
                      ))
                    ) : (
                      <div className="grid min-h-40 place-items-center rounded-2xl border border-white/8 bg-[#050505] text-center text-sm text-zinc-500">
                        No trades in this account yet.
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid gap-4">
                  <AiCoachCard
                    report={coachReport}
                    loading={coachLoading}
                    error={coachError}
                    onRefresh={loadCoach}
                  />
                  <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-black text-white">
                          Sync & Focus
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          Compact control panel for the selected account.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-2xl border border-white/8 bg-black px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                          Auto sync
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {account.platform === "mt5"
                            ? "MT5 bridge connected flow"
                            : "Manual or CSV workflow"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          All dashboard sections below follow this account only.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                          Top symbol
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {symbolStats[0]?.symbol || "No trade edge yet"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {symbolStats[0]
                            ? `${symbolStats[0].trades} trades recorded`
                            : "Add trades to unlock symbol edge."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                          Coach mode
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {coachReport?.mood === "protect"
                            ? "Protect capital"
                            : coachReport?.mood === "push"
                              ? "Push A+ only"
                              : "Stay consistent"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {coachReport?.summary ||
                            "AI coach summary appears here when the report is ready."}
                        </p>
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
              {calendarView === "year" ? (
                <div className="calendar-workspace space-y-3">
                  <section className="calendar-surface overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                    <div className="flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[.035] text-zinc-300"><CalendarDays size={17} /></span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">Calendar overview</p>
                          <h3 className="truncate text-[15px] font-black text-white">Yearly performance</h3>
                          <p className="hidden text-[11px] text-zinc-500 sm:block">Choose a month to inspect the trades behind its result.</p>
                        </div>
                      </div>
                      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-xl border border-white/8 bg-[#050505] p-1 lg:ml-auto lg:w-auto">
                        <Button aria-label="Previous year" variant="ghost" size="icon-sm" onClick={() => p.onCalendarYearShift(-1)}><ChevronLeft size={16} /></Button>
                        <strong className="px-3 text-center text-sm">{month.getFullYear()}</strong>
                        <Button aria-label="Next year" variant="ghost" size="icon-sm" onClick={() => p.onCalendarYearShift(1)}><ChevronRight size={16} /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b border-white/8 p-2.5 sm:grid-cols-4 sm:gap-3 sm:p-4">
                      {[
                        { label: "Net P&L", value: formatTradePnl(yearlyPnl), tone: yearlyPnl >= 0 ? "text-emerald-300" : "text-rose-300" },
                        { label: "Total trades", value: String(yearlyTrades), tone: "text-white" },
                        { label: "Active months", value: String(activeMonths), tone: "text-white" },
                        { label: "Best month", value: bestMonth.trades ? new Date(month.getFullYear(), bestMonth.monthIndex, 1).toLocaleDateString("en-US", { month: "short" }) : "-", tone: bestMonth.pnl >= 0 ? "text-emerald-300" : "text-zinc-300" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-white/7 bg-[#050505] px-3 py-2.5 sm:px-3.5">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{item.label}</p>
                          <p className={`mt-1 truncate font-mono text-base font-black sm:text-lg ${item.tone}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-2.5 sm:grid-cols-4 sm:gap-3 sm:p-4 lg:grid-cols-6 xl:grid-cols-12">
                      {yearlyCalendar.map((item) => {
                        const label = new Date(month.getFullYear(), item.monthIndex, 1).toLocaleDateString("en-US", { month: "short" });
                        const isCurrent = new Date().getFullYear() === month.getFullYear() && new Date().getMonth() === item.monthIndex;
                        return <button key={item.monthIndex} type="button" onClick={() => p.onCalendarMonthSelect(item.monthIndex)} className={`min-h-[94px] rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 sm:min-h-[112px] ${item.trades ? item.pnl >= 0 ? "border-emerald-500/18 bg-[#07110c] hover:border-emerald-400/40 hover:bg-[#0a1710]" : "border-rose-500/18 bg-[#12070a] hover:border-rose-400/40 hover:bg-[#180a0e]" : "border-white/7 bg-[#050505] hover:border-white/15 hover:bg-[#0a0a0a]"} ${isCurrent ? "ring-1 ring-white/20" : ""}`}>
                          <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-white">{label}</span>{item.trades ? <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">{item.trades}T</span> : null}</div>
                          {item.trades ? <><p className={`mt-5 truncate font-mono text-sm font-black ${item.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{item.pnl >= 0 ? "+" : ""}{cashCompact.format(item.pnl)}</p><p className="mt-1 text-[10px] text-zinc-500">{item.wins} win{item.wins === 1 ? "" : "s"}</p></> : <p className="mt-6 text-[10px] text-zinc-600">No trades</p>}
                        </button>;
                      })}
                    </div>
                  </section>
                  <section className="calendar-surface overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707] p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">Year rhythm</p><h3 className="mt-1 text-sm font-black text-white">Monthly net performance</h3></div><span className="rounded-lg border border-white/8 bg-[#050505] px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{activeMonths} active months</span></div>
                    <div className="mt-4 grid h-28 grid-cols-12 items-end gap-1.5 sm:h-36 sm:gap-2">
                      {yearlyCalendar.map((item) => {
                        const maxPnl = Math.max(...yearlyCalendar.map((value) => Math.abs(value.pnl)), 1);
                        const height = item.trades ? Math.max(10, Math.round(Math.abs(item.pnl) / maxPnl * 100)) : 3;
                        return <button key={`bar-${item.monthIndex}`} type="button" onClick={() => p.onCalendarMonthSelect(item.monthIndex)} title={`${new Date(month.getFullYear(), item.monthIndex, 1).toLocaleDateString("en-US", { month: "long" })}: ${formatTradePnl(item.pnl)}`} className="group flex h-full min-w-0 flex-col justify-end rounded-md px-0.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"><span style={{ height: `${height}%` }} className={`min-h-[3px] rounded-sm transition group-hover:opacity-80 ${item.pnl > 0 ? "bg-emerald-400" : item.pnl < 0 ? "bg-rose-400" : "bg-white/10"}`} /><span className="mt-1.5 text-[8px] font-semibold text-zinc-600 sm:text-[9px]">{new Date(month.getFullYear(), item.monthIndex, 1).toLocaleDateString("en-US", { month: "short" }).slice(0, 1)}</span></button>;
                      })}
                    </div>
                  </section>
                </div>
              ) : (
              <div className="calendar-workspace space-y-3">
                <div className="calendar-summary-grid grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    {
                      label: "Net P&L",
                      value: formatTradePnl(stats.pnl),
                      note: `${monthCount} trades this month`,
                      icon:
                        stats.pnl >= 0 ? (
                          <TrendingUp size={15} />
                        ) : (
                          <TrendingDown size={15} />
                        ),
                      tone:
                        stats.pnl >= 0
                          ? "text-emerald-300 bg-emerald-400/10"
                          : "text-rose-300 bg-rose-400/10",
                    },
                    {
                      label: "Trading days",
                      value: String(
                        calendar.filter((day) => day?.trades.length).length,
                      ),
                      note: `${month.toLocaleDateString("en-US", { month: "long" })} activity`,
                      icon: <CalendarDays size={15} />,
                      tone: "text-sky-300 bg-sky-400/10",
                    },
                    {
                      label: "Win rate",
                      value: `${stats.rate}%`,
                      note: `${stats.wins} wins / ${stats.losses} losses`,
                      icon: <Target size={15} />,
                      tone:
                        stats.rate >= 50
                          ? "text-emerald-300 bg-emerald-400/10"
                          : "text-amber-300 bg-amber-400/10",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="calendar-summary-card min-w-0 rounded-[1rem] border border-white/8 bg-[#070707] p-2.5 sm:p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-[10px]">
                          {item.label}
                        </p>
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-lg sm:size-7 ${item.tone}`}
                        >
                          {item.icon}
                        </span>
                      </div>
                      <p className="mt-2 truncate font-mono text-[13px] font-black text-white sm:text-xl">
                        {item.value}
                      </p>
                      <p className="mt-1 hidden truncate text-[11px] text-zinc-500 sm:block">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="calendar-surface overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                  <div className="calendar-toolbar flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[.035] text-zinc-300">
                        <CalendarDays size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                          Performance calendar
                        </p>
                        <h3 className="truncate text-[15px] font-black capitalize text-white">
                          {month.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h3>
                        <p className="hidden text-[11px] text-zinc-500 sm:block">
                          Select a day to review its trades.
                        </p>
                      </div>
                    </div>
                    <div className="calendar-month-switcher grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-1 rounded-xl border border-white/8 bg-[#050505] p-1 lg:ml-auto">
                      <Button variant="ghost" size="sm" onClick={p.onCalendarOverview} className="px-2 text-[11px] text-zinc-400 hover:text-white"><ChevronLeft size={14} /><span className="hidden sm:inline">Year</span></Button>
                      <Button
                        aria-label="Previous month"
                        variant="ghost"
                        size="icon-sm"
                        onClick={p.onPrev}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <strong className="min-w-0 px-2 text-center text-xs capitalize sm:min-w-28 sm:text-sm">
                        {month.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                      <Button
                        aria-label="Next month"
                        variant="ghost"
                        size="icon-sm"
                        onClick={p.onNext}
                      >
                        <ChevronRight size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={p.onToday}
                        className="border-white/8 bg-transparent px-2 text-[11px] hover:bg-[#101010] sm:px-3"
                      >
                        Today
                      </Button>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 md:p-4">
                    <div className="mb-1 grid grid-cols-7 gap-1 sm:mb-1.5 sm:gap-1.5">
                      {WEEKDAYS_FULL.map((d) => (
                        <div
                          key={d}
                          className="py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-zinc-500 sm:py-2 sm:text-[11px]"
                        >
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
                            onClick={() =>
                              c.trades.length ? setSelectedDay(c) : null
                            }
                            className={`calendar-day relative h-full w-full overflow-hidden rounded-md border p-1 text-left transition-colors sm:rounded-[0.9rem] sm:p-2.5 ${c.trades.length ? (c.pnl >= 0 ? "border-emerald-500/16 bg-[#07110c] hover:border-emerald-400/30 hover:bg-[#0a1710]" : "border-rose-500/16 bg-[#12070a] hover:border-rose-400/30 hover:bg-[#180a0e]") : "border-white/6 bg-[#050505]"} ${c.trades.length ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25" : "cursor-default"}`}
                          >
                            {c.trades.length ? (
                              <span
                                className={`absolute inset-x-0 top-0 h-0.5 ${c.pnl >= 0 ? "bg-emerald-400/60" : "bg-rose-400/60"}`}
                              />
                            ) : null}
                            <div className="flex items-start justify-between">
                              <span
                                className={`grid size-4 place-items-center rounded text-[9px] font-bold sm:size-6 sm:rounded-md sm:text-[11px] ${c.trades.length ? "bg-[#050505] text-[#f1f1f1]" : "text-zinc-500"}`}
                              >
                                {c.day}
                              </span>
                              {c.trades.length > 0 ? (
                                <span className="hidden font-mono text-[10px] text-zinc-500 sm:inline">
                                  {c.trades.length}T
                                </span>
                              ) : null}
                            </div>
                            {c.trades.length > 0 ? (
                              <>
                                <p
                                  className={`mt-1 truncate font-mono text-[9px] font-black leading-tight sm:mt-5 sm:text-sm ${c.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                                >
                                  <span className="sm:hidden">
                                    {c.pnl >= 0 ? "+" : ""}
                                    {cashCompact.format(c.pnl)}
                                  </span>
                                  <span className="hidden sm:inline">
                                    {c.pnl >= 0 ? "+" : ""}
                                    {cash.format(c.pnl)}
                                  </span>
                                </p>
                                <p className="mt-1 hidden text-[10px] font-medium text-zinc-500 lg:block">
                                  {c.trades.length === 1
                                    ? "1 closed trade"
                                    : `${c.trades.length} closed trades`}
                                </p>
                              </>
                            ) : null}
                          </button>
                        ) : (
                          <div
                            key={`${monthId(month)}-empty-${i}`}
                            className="h-full rounded-md border border-transparent sm:rounded-[1rem]"
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}
            </TabsContent>
          ) : null}

          {/* Trades */}
          {!singleTabMode || activeTab === "trades" ? (
            <TabsContent value="trades">
              <JournalFilters
                trades={sortedTrades}
                query={p.query}
                range={p.tradeRange}
                customStart={p.customStart}
                customEnd={p.customEnd}
                sort={tradeSort === "entryDate" ? "oldest" : "newest"}
                winRate={stats.rate}
                averageR={stats.r}
                formatPnl={formatTradePnl}
                onQueryChange={p.onQuery}
                onRangeChange={p.onRange}
                onCustomStartChange={p.onCustomStart}
                onCustomEndChange={p.onCustomEnd}
                onSortChange={(value) => setTradeSort(value === "oldest" ? "entryDate" : "exitDate")}
                onOpenTrade={openTrade}
                onAddTrade={p.onTrade}
              />
            </TabsContent>
          ) : null}

          {/* Trading Bible */}
          {!singleTabMode || activeTab === "bible" ? (
            <TabsContent value="bible">
              <JournalGallery
                trades={bibleTrades}
                onOpenTrade={openTrade}
              />
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
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setAnalyticsView(
                        value as "overview" | "strategy" | "symbols",
                      )
                    }
                    className={`min-w-0 rounded-[0.8rem] px-2 py-2 text-xs font-semibold transition sm:px-3 sm:py-1.5 ${analyticsView === value ? "bg-white text-black" : "bg-transparent text-zinc-500 hover:bg-[#0d0d0d] hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
                <div className="col-span-3 rounded-[0.8rem] bg-[#0d0d0d] px-3 py-1.5 text-center text-xs font-semibold text-white sm:col-span-1 sm:ml-auto">
                  All time
                </div>
              </div>

              {analyticsView === "overview" ? (
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
                  <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                    <div className="border-b border-white/8 px-4 py-3">
                      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                        {account.name}{" "}
                        <span className="mx-1 text-zinc-700">&gt;</span>{" "}
                        Analytics
                      </p>
                      <h3 className="text-[14px] font-black text-white">
                        Account Balance
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {month.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        -{" "}
                        {new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="h-[240px] p-2 sm:h-[260px] sm:p-4">
                      {equity.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={equity}
                            margin={{ left: 8, right: 8, top: 16, bottom: 4 }}
                          >
                            <defs>
                              <linearGradient
                                id="analyticsBalanceFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#22c55e"
                                  stopOpacity={0.35}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#171717"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              stroke="rgba(255,255,255,.07)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="trade"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: "#707b91" }}
                            />
                            <YAxis
                              width={54}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) =>
                                `$${Number(value / 1000).toFixed(1)}K`
                              }
                              tick={{ fontSize: 10, fill: "#707b91" }}
                            />
                            <Tooltip
                              formatter={(v) => cash.format(Number(v))}
                              labelFormatter={(_, payload) =>
                                payload?.[0]?.payload?.label ?? "Balance"
                              }
                              contentStyle={{
                                background: "#171717",
                                border: "1px solid #333333",
                                borderRadius: 12,
                                color: "#f1f1f1",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="equity"
                              stroke="#22c55e"
                              fill="url(#analyticsBalanceFill)"
                              strokeWidth={3}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty text="Add trades to unlock analytics charts." />
                      )}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                      <div>
                        <h3 className="text-[14px] font-black text-white">
                          TradeWay Profitability Score
                        </h3>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {trades.length < 5
                            ? "Early read, score becomes sharper after 5+ trades."
                            : "Live score based on execution quality."}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/8 bg-[#050505] px-2.5 py-1 text-[11px] font-black text-white">
                        {profitabilityScore}
                      </span>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_72px]">
                      <div className="h-[210px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={scoreRadar}>
                            <PolarGrid stroke="rgba(255,255,255,.12)" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: "#d4d4d8", fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                              angle={30}
                              domain={[0, 100]}
                              tick={false}
                              axisLine={false}
                            />
                            <Radar
                              dataKey="value"
                              stroke="#22c55e"
                              fill="#22c55e"
                              fillOpacity={0.36}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-[#050505] px-2.5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                          Score
                        </p>
                        <p className="text-2xl font-black text-white">
                          {profitabilityScore}
                        </p>
                        <div className="h-full min-h-24 rounded-full bg-[#0d0d0d] p-2">
                          <div
                            className="h-full w-full rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600"
                            style={{
                              clipPath: `inset(${100 - profitabilityScore}% 0 0 0 round 999px)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
                    <MetricPanel
                      title="Average Win"
                      value={averageWin ? formatTradePnl(averageWin) : "-"}
                      note={
                        bestTrade
                          ? `Best ${bestTrade.symbol}`
                          : "No winning trade"
                      }
                      accent="good"
                    />
                    <MetricPanel
                      title="Average Loss"
                      value={averageLoss ? formatTradePnl(averageLoss) : "-"}
                      note={
                        worstTrade
                          ? `Worst ${worstTrade.symbol}`
                          : "No losing trade"
                      }
                      accent="bad"
                    />
                    <MetricPanel
                      title="Best Trade"
                      value={bestTrade ? formatTradePnl(bestTrade.pnl) : "-"}
                      note={bestTrade?.symbol || "No data"}
                      accent={
                        bestTrade && bestTrade.pnl >= 0 ? "good" : "neutral"
                      }
                    />
                    <MetricPanel
                      title="Worst Trade"
                      value={worstTrade ? formatTradePnl(worstTrade.pnl) : "-"}
                      note={worstTrade?.symbol || "No data"}
                      accent={
                        worstTrade && worstTrade.pnl < 0 ? "bad" : "neutral"
                      }
                    />
                  </div>
                </div>
              ) : null}

              {analyticsView === "strategy" ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                    <h3 className="text-[14px] font-black text-white">
                      Setup Performance
                    </h3>
                    <div className="mt-4 space-y-4">
                      {setups.length ? (
                        setups.map((setup) => (
                          <div key={setup.name}>
                            <div className="flex text-sm">
                              <span className="text-white">{setup.name}</span>
                              <span
                                className={`ml-auto font-mono font-bold ${setup.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                              >
                                {setup.rate}% / {setup.pnl >= 0 ? "+" : ""}
                                {cash.format(setup.pnl)}
                              </span>
                            </div>
                            <ProgressBar
                              label={`${setup.trades} trades`}
                              value={setup.rate}
                              color="bg-zinc-300"
                            />
                          </div>
                        ))
                      ) : (
                        <Empty text="No setup analytics yet." />
                      )}
                    </div>
                  </section>
                  <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                    <h3 className="text-[14px] font-black text-white">
                      Discipline & Mistakes
                    </h3>
                    <div className="mt-4">
                      <ProgressBar
                        label={`${monthCount} trades reviewed`}
                        value={planRate}
                        color="bg-emerald-500"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <MiniStat label="PLAN ALIGNMENT" value={`${planRate}%`} />
                      <MiniStat
                        label="MISTAKE TRADES"
                        value={String(
                          mistakes.reduce((sum, item) => sum + item.trades, 0),
                        )}
                      />
                    </div>
                    <div className="mt-4 space-y-3">
                      {mistakes.length ? (
                        mistakes.map((mistake) => (
                          <div
                            key={mistake.name}
                            className="flex items-center justify-between rounded-xl border border-white/8 bg-[#050505] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-white">
                                {mistake.name}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {mistake.trades} repeats
                              </p>
                            </div>
                            <b
                              className={`font-mono font-bold ${mistake.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                            >
                              {mistake.pnl >= 0 ? "+" : ""}
                              {cash.format(mistake.pnl)}
                            </b>
                          </div>
                        ))
                      ) : (
                        <Empty text="No mistakes recorded this month." />
                      )}
                    </div>
                  </section>
                </div>
              ) : null}

              {analyticsView === "symbols" ? (
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                    <h3 className="text-[14px] font-black text-white">
                      Most Traded Symbols
                    </h3>
                    <div className="mt-4 space-y-2">
                      {symbolStats.length ? (
                        symbolStats.map((symbol) => (
                          <div
                            key={symbol.symbol}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#050505] px-3 py-3"
                          >
                            <div className="flex items-center gap-2">
                              <InstrumentBadge
                                symbol={symbol.symbol}
                                compact
                                className="shrink-0 bg-[#121212]"
                              />
                              <div>
                                <p className="text-xs text-zinc-500">
                                  {symbol.trades} trades / {symbol.wins} wins
                                </p>
                              </div>
                            </div>
                            <strong
                              className={`font-mono text-sm font-black ${symbol.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                            >
                              {symbol.pnl >= 0 ? "+" : ""}
                              {cash.format(symbol.pnl)}
                            </strong>
                          </div>
                        ))
                      ) : (
                        <Empty text="No symbol data yet." />
                      )}
                    </div>
                  </section>
                  <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
                    <h3 className="text-[14px] font-black text-white">
                      Account Details
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      {[
                        ["FIRM", account.firm || "Independent"],
                        ["PHASE", account.phase],
                        ["MARKET", account.marketType],
                        [
                          "PLATFORM",
                          (account.platform || "manual").toUpperCase(),
                        ],
                        ["START DATE", account.startDate],
                        ["TARGET", cash.format(account.profitTarget)],
                        ["MAX DD", cash.format(account.maxDrawdown)],
                        ["DAILY DD", cash.format(account.dailyDrawdown)],
                      ].map(([label, value]) => (
                        <MiniStat key={label} label={label} value={value} />
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </TabsContent>
          ) : null}
          {!embedded &&
          account.platform === "mt5" &&
          (!singleTabMode || activeTab === "settings") ? (
            <TabsContent value="settings">
              <Mt5Settings account={account} onSynced={p.onMt5Synced} />
            </TabsContent>
          ) : null}
        </Tabs>
        {selectedTrade ? (
          <JournalTradeEditor
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
        <Dialog
          open={Boolean(selectedDay)}
          onOpenChange={(open) => {
            if (!open) setSelectedDay(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-hidden border-border bg-background p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-white/8 px-5 py-4 text-left">
              <DialogTitle className="text-white">
                {selectedDay
                  ? new Date(
                      `${monthId(month)}-${String(selectedDay.day).padStart(2, "0")}T00:00:00`,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Day trades"}
              </DialogTitle>
              <DialogDescription>
                {selectedDay
                  ? `${selectedDay.trades.length} trades / ${formatTradePnl(selectedDay.pnl)}`
                  : "Closed trades for this day"}
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
                        <InstrumentBadge
                          symbol={trade.symbol}
                          compact
                          className="shrink-0 rounded-xl bg-[#151515]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-[#0b1c12] text-emerald-300" : "bg-[#1a0d10] text-rose-300"}`}
                            >
                              {trade.side === "Long" ? "Buy" : "Sell"}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-zinc-500">
                            {trade.setup ||
                              trade.session ||
                              trade.note ||
                              "Open trade review"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <strong
                            className={`block font-mono text-sm font-black ${winning ? "text-emerald-300" : "text-rose-300"}`}
                          >
                            {formatTradePnl(trade.pnl)}
                          </strong>
                          <span className="mt-1 block text-[10px] text-zinc-500">
                            {(trade.resultR || 0).toFixed(2)}R
                          </span>
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

function ProgressBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex text-xs">
        <span className="text-zinc-500">{label}</span>
        <b className="ml-auto text-[#f1f1f1]">{value.toFixed(0)}%</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#242424]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function MetricPanel({
  title,
  value,
  note,
  accent = "neutral",
}: {
  title: string;
  value: string;
  note: string;
  accent?: "neutral" | "good" | "bad";
}) {
  const color =
    accent === "good"
      ? "text-emerald-300"
      : accent === "bad"
        ? "text-rose-300"
        : "text-white";
  return (
    <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </p>
      <p
        className={`mt-2 font-mono text-[1.55rem] font-black tracking-tight ${color}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">{note}</p>
    </section>
  );
}

function QuickMetric({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-rose-300"
        : "text-white";
  return (
    <div className="rounded-[1rem] border border-white/8 bg-[#050505] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 truncate font-mono text-lg font-black ${color}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#050505] px-3 py-2.5 text-center">
      <small className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </small>
      <b className="mt-1 block truncate font-mono text-sm">{value}</b>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}
