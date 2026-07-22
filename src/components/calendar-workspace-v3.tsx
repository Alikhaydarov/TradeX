"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiRequest } from "@/lib/api-client";
import { useActiveAccountStore } from "./active-account-context";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";

type EntryRow = {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  pnl: string | number;
  result_r?: string | number | null;
  traded_at: string;
  setup?: string | null;
};

type CalendarEntry = {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  pnl: number;
  resultR: number;
  date: string;
  setup: string;
};

type MarketNewsEvent = {
  id: string;
  date: string;
  country: string;
  currency: string;
  event: string;
  category: string;
  actual: string;
  forecast: string;
  previous: string;
  importance: number;
  source: string;
};

type MarketNewsResponse = {
  events: MarketNewsEvent[];
  limited: boolean;
};

type CalendarMode = "journal" | "economic";

type RouteState = {
  mode: CalendarMode;
  year: number;
  month: number;
  monthly: boolean;
};

type MonthStat = {
  month: number;
  trades: number;
  pnl: number;
  winRate: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MOBILE_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const countryFlags: Record<string, string> = {
  "united states": "🇺🇸",
  "euro area": "🇪🇺",
  "united kingdom": "🇬🇧",
  japan: "🇯🇵",
  canada: "🇨🇦",
  australia: "🇦🇺",
  "new zealand": "🇳🇿",
  switzerland: "🇨🇭",
  china: "🇨🇳",
};

const countryCurrency: Record<string, string> = {
  "united states": "USD",
  "euro area": "EUR",
  "united kingdom": "GBP",
  japan: "JPY",
  canada: "CAD",
  australia: "AUD",
  "new zealand": "NZD",
  switzerland: "CHF",
  china: "CNY",
};

function currentRoute(): RouteState {
  const now = new Date();
  if (typeof window === "undefined") {
    return { mode: "journal", year: now.getFullYear(), month: now.getMonth(), monthly: false };
  }

  const economic = window.location.pathname.match(/^\/economic-calendar\/(\d{4})\/(\d{1,2})/);
  if (economic) {
    return {
      mode: "economic",
      year: Number(economic[1]),
      month: Math.min(11, Math.max(0, Number(economic[2]) - 1)),
      monthly: true,
    };
  }

  const journal = window.location.pathname.match(/^\/calendar\/(\d{4})\/(\d{1,2})/);
  if (journal) {
    return {
      mode: "journal",
      year: Number(journal[1]),
      month: Math.min(11, Math.max(0, Number(journal[2]) - 1)),
      monthly: true,
    };
  }

  return { mode: "journal", year: now.getFullYear(), month: now.getMonth(), monthly: false };
}

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function monthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthShort(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "short" });
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthBounds(year: number, month: number) {
  return {
    start: dateKey(year, month, 1),
    end: dateKey(year, month, new Date(year, month + 1, 0).getDate()),
  };
}

function monthCells(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = Math.ceil((offset + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= days ? day : null;
  });
}

function parsedEntryDate(value: string) {
  return new Date(value.length <= 10 ? `${value}T00:00:00` : value);
}

function eventLocalDate(event: MarketNewsEvent) {
  const hasZone = /z$|[+-]\d{2}:?\d{2}$/i.test(event.date);
  return new Date(hasZone ? event.date : `${event.date}Z`);
}

function eventCurrency(event: MarketNewsEvent) {
  return event.currency || countryCurrency[event.country.toLowerCase()] || "FX";
}

function eventFlag(event: MarketNewsEvent) {
  return countryFlags[event.country.toLowerCase()] || "🌐";
}

function tone(value: number) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-zinc-500";
}

function resultSurface(value: number) {
  if (value > 0) return "border-emerald-400/25 bg-emerald-400/[.07]";
  if (value < 0) return "border-rose-400/25 bg-rose-400/[.07]";
  return "border-white/8 bg-[#090909]";
}

function isTodayDate(year: number, month: number, day: number) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
}

function CompactStat({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[10px] font-medium text-zinc-500 sm:text-xs">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold tabular-nums sm:text-lg ${valueClass}`}>{value}</p>
    </div>
  );
}

export function CalendarWorkspaceV3() {
  const { accounts, activeAccountId, loading: accountsLoading } = useActiveAccountStore();
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;

  const [route, setRoute] = useState<RouteState>(currentRoute);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [news, setNews] = useState<MarketNewsEvent[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLimited, setNewsLimited] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>("all");

  useEffect(() => {
    const sync = () => {
      setRoute(currentRoute());
      setDayDialogOpen(false);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!activeAccountId) {
      setEntries([]);
      setEntriesLoading(false);
      return;
    }

    let active = true;
    setEntriesLoading(true);
    void apiRequest<{ entries: EntryRow[] }>(`/api/journal?accountId=${encodeURIComponent(activeAccountId)}`)
      .then((response) => {
        if (!active) return;
        setEntries(
          (response.entries || []).map((entry) => ({
            id: entry.id,
            symbol: entry.symbol,
            side: entry.side,
            pnl: Number(entry.pnl || 0),
            resultR: Number(entry.result_r || 0),
            date: entry.traded_at,
            setup: entry.setup || "",
          })),
        );
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setEntriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeAccountId]);

  const loadNews = useCallback(async () => {
    if (route.mode !== "economic") return;
    const { start, end } = monthBounds(route.year, route.month);
    setNewsLoading(true);
    try {
      const response = await apiRequest<MarketNewsResponse>(`/api/market-news?start=${start}&end=${end}`);
      setNews(response.events || []);
      setNewsLimited(Boolean(response.limited));
    } catch {
      setNews([]);
      setNewsLimited(false);
    } finally {
      setNewsLoading(false);
    }
  }, [route.mode, route.month, route.year]);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    entries.forEach((entry) => years.add(parsedEntryDate(entry.date).getFullYear()));
    return [...years].filter(Number.isFinite).sort((a, b) => b - a);
  }, [entries]);

  const monthEntries = useMemo(
    () => entries.filter((entry) => {
      const date = parsedEntryDate(entry.date);
      return date.getFullYear() === route.year && date.getMonth() === route.month;
    }),
    [entries, route.month, route.year],
  );

  const entriesByDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    monthEntries.forEach((entry) => {
      const day = parsedEntryDate(entry.date).getDate();
      map.set(day, [...(map.get(day) || []), entry]);
    });
    return map;
  }, [monthEntries]);

  const newsByDay = useMemo(() => {
    const map = new Map<number, MarketNewsEvent[]>();
    news.forEach((event) => {
      const date = eventLocalDate(event);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== route.year || date.getMonth() !== route.month) return;
      map.set(date.getDate(), [...(map.get(date.getDate()) || []), event]);
    });
    return map;
  }, [news, route.month, route.year]);

  const cells = useMemo(() => monthCells(route.year, route.month), [route.month, route.year]);
  const weeks = useMemo(
    () => Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7)),
    [cells],
  );

  const monthPnl = monthEntries.reduce((sum, entry) => sum + entry.pnl, 0);
  const wins = monthEntries.filter((entry) => entry.pnl > 0).length;
  const losses = monthEntries.filter((entry) => entry.pnl < 0).length;
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
  const tradingDays = new Set(monthEntries.map((entry) => entry.date.slice(0, 10))).size;
  const realizedR = monthEntries.reduce((sum, entry) => sum + entry.resultR, 0);
  const mostTraded = [...monthEntries.reduce((map, entry) => map.set(entry.symbol, (map.get(entry.symbol) || 0) + 1), new Map<string, number>()).entries()]
    .sort((left, right) => right[1] - left[1])[0]?.[0] || "—";
  const monthReturn = activeAccount?.initialBalance ? (monthPnl / activeAccount.initialBalance) * 100 : 0;

  const yearlyStats = useMemo<MonthStat[]>(() => Array.from({ length: 12 }, (_, month) => {
    const selected = entries.filter((entry) => {
      const date = parsedEntryDate(entry.date);
      return date.getFullYear() === route.year && date.getMonth() === month;
    });
    const pnl = selected.reduce((sum, entry) => sum + entry.pnl, 0);
    const monthWins = selected.filter((entry) => entry.pnl > 0).length;
    const monthLosses = selected.filter((entry) => entry.pnl < 0).length;
    return {
      month,
      trades: selected.length,
      pnl,
      winRate: monthWins + monthLosses ? Math.round((monthWins / (monthWins + monthLosses)) * 100) : 0,
    };
  }), [entries, route.year]);

  const shiftMonth = (delta: number) => {
    const next = new Date(route.year, route.month + delta, 1);
    const base = route.mode === "economic" ? "/economic-calendar" : "/calendar";
    navigate(`${base}/${next.getFullYear()}/${next.getMonth() + 1}`);
  };

  const switchMode = (mode: CalendarMode) => {
    const base = mode === "economic" ? "/economic-calendar" : "/calendar";
    navigate(`${base}/${route.year}/${route.month + 1}`);
  };

  const openDay = (day: number) => {
    setSelectedDay(day);
    setDayDialogOpen(true);
  };

  if (accountsLoading || entriesLoading) {
    return (
      <div className="mx-auto max-w-[1420px] space-y-3 p-3 sm:p-4 lg:p-5">
        <Skeleton className="mx-auto h-9 w-60 rounded-xl bg-white/[.05]" />
        <Skeleton className="h-[560px] rounded-2xl bg-white/[.05]" />
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 text-center">
        <div>
          <CalendarDays className="mx-auto size-7 text-zinc-600" />
          <h2 className="mt-4 text-xl font-bold text-white">Select an account first</h2>
          <p className="mt-2 text-sm text-zinc-500">Calendar performance follows the active trading account.</p>
          <Button className="mt-5" onClick={() => navigate("/accounts")}>Open accounts</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[1420px] space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border border-white/8 bg-[#080808] p-1">
            <button type="button" onClick={() => switchMode("journal")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${route.mode === "journal" ? "bg-white/[.10] text-white" : "text-zinc-500 hover:text-zinc-300"}`}>Journal</button>
            <button type="button" onClick={() => switchMode("economic")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${route.mode === "economic" ? "bg-white/[.10] text-white" : "text-zinc-500 hover:text-zinc-300"}`}>Economic Calendar</button>
          </div>
        </div>

        {route.mode === "journal" && !route.monthly ? (
          <YearOverview
            year={route.year}
            accountName={activeAccount.name}
            accountBalance={activeAccount.initialBalance}
            stats={yearlyStats}
            availableYears={availableYears}
            yearFilter={yearFilter}
            onYearFilter={(value) => {
              setYearFilter(value);
              if (value !== "all") setRoute((current) => ({ ...current, year: Number(value) }));
            }}
            onShift={(delta) => setRoute((current) => ({ ...current, year: current.year + delta }))}
            onOpen={(month) => navigate(`/calendar/${route.year}/${month + 1}`)}
          />
        ) : (
          <MonthlyCalendar
            route={route}
            activeAccountName={activeAccount.name}
            weeks={weeks}
            entriesByDay={entriesByDay}
            newsByDay={newsByDay}
            newsLoading={newsLoading}
            newsLimited={newsLimited}
            stats={{ total: monthEntries.length, tradingDays, realizedR, mostTraded, winRate, pnl: monthPnl, monthReturn }}
            onBack={() => navigate("/calendar")}
            onShift={shiftMonth}
            onRefresh={() => void loadNews()}
            onOpenDay={openDay}
          />
        )}
      </div>

      <DayDetailsDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        mode={route.mode}
        year={route.year}
        month={route.month}
        day={selectedDay}
        entries={selectedDay ? entriesByDay.get(selectedDay) || [] : []}
        events={selectedDay ? newsByDay.get(selectedDay) || [] : []}
      />
    </>
  );
}

function YearOverview({
  year,
  accountName,
  accountBalance,
  stats,
  availableYears,
  yearFilter,
  onYearFilter,
  onShift,
  onOpen,
}: {
  year: number;
  accountName: string;
  accountBalance: number;
  stats: MonthStat[];
  availableYears: number[];
  yearFilter: string;
  onYearFilter: (value: string) => void;
  onShift: (delta: number) => void;
  onOpen: (month: number) => void;
}) {
  const totalPnl = stats.reduce((sum, item) => sum + item.pnl, 0);
  const totalTrades = stats.reduce((sum, item) => sum + item.trades, 0);
  let running = accountBalance;
  const curve = stats.map((item) => {
    running += item.pnl;
    return { month: monthShort(year, item.month), balance: running };
  });

  return (
    <div className="space-y-3">
      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
        <CardHeader className="border-b border-white/8 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Yearly Performance</h1>
              <p className="mt-1 text-sm text-zinc-500">Select a month to view its performance</p>
            </div>
            <Select value={yearFilter} onValueChange={onYearFilter}>
              <SelectTrigger className="h-11 w-[138px] rounded-xl border-white/10 bg-[#171717] text-sm">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {availableYears.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={() => onShift(-1)} aria-label="Previous year"><ChevronLeft className="size-4" /></Button>
            <strong className="text-xl font-semibold text-white">{year}</strong>
            <Button variant="ghost" size="icon-sm" onClick={() => onShift(1)} aria-label="Next year"><ChevronRight className="size-4" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
            {stats.map((item) => (
              <button key={item.month} type="button" onClick={() => onOpen(item.month)} className="group text-center">
                <p className="mb-2 text-xs font-medium text-zinc-500">{monthShort(year, item.month)}</p>
                <div className={`grid min-h-[84px] place-items-center rounded-2xl border px-2 py-3 transition group-hover:border-white/20 ${resultSurface(item.pnl)}`}>
                  <div>
                    <p className={`text-sm font-semibold tabular-nums ${tone(item.pnl)}`}>{item.trades ? `${item.pnl >= 0 ? "+" : ""}${cash.format(item.pnl).replace("$", "$")}` : "—"}</p>
                    <p className="mt-1 text-xs text-zinc-400">{item.trades ? `${item.trades} trade${item.trades === 1 ? "" : "s"}` : ""}</p>
                  </div>
                </div>
              </button>
            ))}
            <div className="text-center">
              <p className="mb-2 text-xs font-medium text-zinc-500">YTD</p>
              <div className={`grid min-h-[84px] place-items-center rounded-2xl border px-2 py-3 ${resultSurface(totalPnl)}`}>
                <div>
                  <p className={`text-sm font-semibold tabular-nums ${tone(totalPnl)}`}>{totalPnl >= 0 ? "+" : ""}{cash.format(totalPnl)}</p>
                  <p className="mt-1 text-xs text-zinc-400">{totalTrades} trade{totalTrades === 1 ? "" : "s"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
        <CardHeader className="px-4 py-4">
          <h2 className="text-xl font-semibold text-white">Account Balance</h2>
          <p className="mt-1 text-sm text-zinc-500">{accountName} · equity curve of selected year</p>
        </CardHeader>
        <CardContent className="h-[250px] px-2 pb-4 sm:h-[320px] sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="calendarYearCurve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
              <YAxis hide />
              <Tooltip formatter={(value) => cash.format(Number(value))} contentStyle={{ background: "#0b0b0b", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2} fill="url(#calendarYearCurve)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlyCalendar({
  route,
  activeAccountName,
  weeks,
  entriesByDay,
  newsByDay,
  newsLoading,
  newsLimited,
  stats,
  onBack,
  onShift,
  onRefresh,
  onOpenDay,
}: {
  route: RouteState;
  activeAccountName: string;
  weeks: Array<Array<number | null>>;
  entriesByDay: Map<number, CalendarEntry[]>;
  newsByDay: Map<number, MarketNewsEvent[]>;
  newsLoading: boolean;
  newsLimited: boolean;
  stats: { total: number; tradingDays: number; realizedR: number; mostTraded: string; winRate: number; pnl: number; monthReturn: number };
  onBack: () => void;
  onShift: (delta: number) => void;
  onRefresh: () => void;
  onOpenDay: (day: number) => void;
}) {
  const isJournal = route.mode === "journal";
  return (
    <Card className="gap-0 overflow-hidden border-white/8 bg-[#070707] py-0 shadow-none">
      <CardHeader className="border-b border-white/8 px-3 py-3 sm:px-5 sm:py-4">
        <div className="hidden items-center md:grid md:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center gap-2.5">
            {isJournal ? <Button variant="ghost" size="icon-sm" onClick={onBack}><ArrowLeft className="size-4" /></Button> : null}
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-white">{isJournal ? "Monthly Performance" : "Economic Calendar"}</h1>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{isJournal ? "Select a day to open its trades" : newsLimited ? "High-impact releases · limited feed" : "High-impact releases for major markets"}</p>
            </div>
          </div>
          <MonthNavigation year={route.year} month={route.month} onShift={onShift} />
          <div className="flex justify-end">
            {isJournal ? <span className="truncate text-xs text-zinc-600">{activeAccountName}</span> : <Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={newsLoading}><RefreshCw className={`size-4 ${newsLoading ? "animate-spin" : ""}`} /></Button>}
          </div>
        </div>

        <div className="md:hidden">
          {isJournal ? (
            <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/8 bg-[#090909] px-3 py-4">
              <CompactStat label="Total trades" value={String(stats.total)} />
              <CompactStat label="Realized RR" value={stats.total ? `${stats.realizedR.toFixed(2)}R` : "—"} />
              <CompactStat label="Trade Winrate" value={`${stats.winRate}%`} />
              <CompactStat label="Month P&L" value={cash.format(stats.pnl)} valueClass={tone(stats.pnl)} />
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-5">
        {isJournal ? (
          <div className="mb-4 hidden grid-cols-6 gap-2 md:grid">
            <DesktopStat label="Total trades" value={String(stats.total)} />
            <DesktopStat label="Trading days" value={String(stats.tradingDays)} />
            <DesktopStat label="Realized RR" value={stats.total ? `${stats.realizedR.toFixed(2)}R` : "—"} />
            <DesktopStat label="Most traded asset" value={stats.mostTraded} />
            <DesktopStat label="Trade Winrate" value={`${stats.winRate}%`} />
            <DesktopStat label="Month P&L" value={cash.format(stats.pnl)} valueClass={tone(stats.pnl)} />
          </div>
        ) : null}

        <div className="mb-5 md:hidden">
          <MonthNavigation year={route.year} month={route.month} onShift={onShift} large />
        </div>

        {newsLoading && !isJournal ? (
          <Skeleton className="h-[500px] rounded-2xl bg-white/[.04]" />
        ) : (
          <>
            <div className="hidden md:block">
              <DesktopMonthGrid
                year={route.year}
                month={route.month}
                mode={route.mode}
                weeks={weeks}
                entriesByDay={entriesByDay}
                newsByDay={newsByDay}
                onOpenDay={onOpenDay}
              />
            </div>
            <div className="md:hidden">
              <MobileMonthGrid
                year={route.year}
                month={route.month}
                mode={route.mode}
                weeks={weeks}
                entriesByDay={entriesByDay}
                newsByDay={newsByDay}
                onOpenDay={onOpenDay}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MonthNavigation({ year, month, onShift, large = false }: { year: number; month: number; onShift: (delta: number) => void; large?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="ghost" size={large ? "icon" : "icon-sm"} onClick={() => onShift(-1)} aria-label="Previous month"><ChevronLeft className={large ? "size-6" : "size-4"} /></Button>
      <strong className={`${large ? "min-w-40 text-center text-2xl" : "min-w-32 text-center text-base"} font-semibold text-white`}>{monthName(year, month)}</strong>
      <Button variant="ghost" size={large ? "icon" : "icon-sm"} onClick={() => onShift(1)} aria-label="Next month"><ChevronRight className={large ? "size-6" : "size-4"} /></Button>
    </div>
  );
}

function DesktopStat({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#101010] px-3 py-3">
      <p className="text-[10px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 truncate text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function DesktopMonthGrid({
  year,
  month,
  mode,
  weeks,
  entriesByDay,
  newsByDay,
  onOpenDay,
}: {
  year: number;
  month: number;
  mode: CalendarMode;
  weeks: Array<Array<number | null>>;
  entriesByDay: Map<number, CalendarEntry[]>;
  newsByDay: Map<number, MarketNewsEvent[]>;
  onOpenDay: (day: number) => void;
}) {
  return (
    <div className={`grid gap-1.5 ${mode === "journal" ? "grid-cols-[repeat(7,minmax(0,1fr))_96px]" : "grid-cols-7"}`}>
      {WEEKDAYS.map((day, index) => <div key={day} className={`rounded-lg border border-white/8 bg-black px-2 py-2 text-center text-xs font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-300"}`}>{day}</div>)}
      {mode === "journal" ? <div className="rounded-lg border border-white/8 bg-black px-2 py-2 text-center text-xs font-semibold text-zinc-300">Week</div> : null}

      {weeks.map((week, weekIndex) => {
        const weekEntries = week.flatMap((day) => day ? entriesByDay.get(day) || [] : []);
        const weekPnl = weekEntries.reduce((sum, entry) => sum + entry.pnl, 0);
        const cells = week.map((day, dayIndex) => (
          <DesktopDayCell
            key={`${weekIndex}-${dayIndex}`}
            year={year}
            month={month}
            day={day}
            weekend={dayIndex >= 5}
            mode={mode}
            entries={day ? entriesByDay.get(day) || [] : []}
            events={day ? newsByDay.get(day) || [] : []}
            onOpenDay={onOpenDay}
          />
        ));
        return mode === "journal" ? [
          ...cells,
          <div key={`week-${weekIndex}`} className="grid min-h-[96px] place-items-center rounded-xl border border-white/8 bg-black p-2 text-center">
            <div><p className={`text-sm font-semibold tabular-nums ${tone(weekPnl)}`}>{weekEntries.length ? cash.format(weekPnl) : "$0"}</p><p className="mt-1 text-[10px] text-zinc-600">{weekEntries.length} trades</p></div>
          </div>,
        ] : cells;
      })}
    </div>
  );
}

function DesktopDayCell({
  year,
  month,
  day,
  weekend,
  mode,
  entries,
  events,
  onOpenDay,
}: {
  year: number;
  month: number;
  day: number | null;
  weekend: boolean;
  mode: CalendarMode;
  entries: CalendarEntry[];
  events: MarketNewsEvent[];
  onOpenDay: (day: number) => void;
}) {
  if (!day) return <div className="min-h-[96px] rounded-xl border border-transparent" />;
  const pnl = entries.reduce((sum, entry) => sum + entry.pnl, 0);
  const today = isTodayDate(year, month, day);
  const hasData = mode === "journal" ? entries.length > 0 : events.length > 0;

  return (
    <button type="button" onClick={() => onOpenDay(day)} className={`relative min-h-[96px] overflow-hidden rounded-xl border p-2 text-left transition hover:border-white/20 hover:bg-white/[.03] ${mode === "journal" && entries.length ? resultSurface(pnl) : "border-white/8 bg-[#090909]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`text-xs font-semibold ${weekend ? "text-zinc-600" : "text-zinc-300"}`}>{day}</span>
          {today ? <span className="ml-2 rounded-full bg-emerald-400/12 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-300">Today</span> : null}
        </div>
        {hasData ? <span className="text-[9px] text-zinc-500">{mode === "journal" ? `${entries.length}T` : `${events.length}N`}</span> : null}
      </div>

      {mode === "journal" && entries.length ? (
        <div className="mt-5">
          <p className={`truncate text-sm font-semibold tabular-nums ${tone(pnl)}`}>{cash.format(pnl)}</p>
          <p className="mt-1 truncate text-[10px] text-zinc-500">{[...new Set(entries.map((entry) => entry.symbol))].slice(0, 2).join(" · ")}</p>
        </div>
      ) : null}

      {mode === "economic" && events.length ? (
        <div className="mt-2 space-y-1">
          {events.slice(0, 2).map((event) => {
            const date = eventLocalDate(event);
            return <div key={event.id} className="rounded-lg border border-white/8 bg-[#101010] px-2 py-1.5"><p className="truncate text-[10px] font-semibold text-white">{event.event}</p><p className="mt-0.5 text-[9px] text-zinc-500">{eventFlag(event)} {eventCurrency(event)} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>;
          })}
          {events.length > 2 ? <p className="px-1 text-[9px] text-zinc-600">+{events.length - 2} more</p> : null}
        </div>
      ) : null}

      {today ? <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-emerald-400" /> : null}
    </button>
  );
}

function MobileMonthGrid({
  year,
  month,
  mode,
  weeks,
  entriesByDay,
  newsByDay,
  onOpenDay,
}: {
  year: number;
  month: number;
  mode: CalendarMode;
  weeks: Array<Array<number | null>>;
  entriesByDay: Map<number, CalendarEntry[]>;
  newsByDay: Map<number, MarketNewsEvent[]>;
  onOpenDay: (day: number) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#090909] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
      <div className="grid grid-cols-7 gap-2">
        {MOBILE_WEEKDAYS.map((day, index) => <div key={`${day}-${index}`} className={`grid aspect-square place-items-center rounded-xl border border-white/8 bg-black text-base font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-200"}`}>{day}</div>)}
        {weeks.flat().map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
          const entries = entriesByDay.get(day) || [];
          const events = newsByDay.get(day) || [];
          const pnl = entries.reduce((sum, entry) => sum + entry.pnl, 0);
          const count = mode === "journal" ? entries.length : events.length;
          const today = isTodayDate(year, month, day);
          return (
            <button key={day} type="button" onClick={() => onOpenDay(day)} className={`relative grid aspect-square place-items-center rounded-xl border text-lg font-medium transition active:scale-95 ${count && mode === "journal" ? resultSurface(pnl) : "border-white/10 bg-[#0b0b0b] text-zinc-300"}`}>
              <span>{day}</span>
              {count ? <span className={`absolute bottom-1.5 size-1.5 rounded-full ${mode === "economic" || pnl >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} /> : null}
              {today ? <span className="absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-emerald-400" /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-zinc-600">
        <span className="h-0.5 w-5 rounded-full bg-emerald-400" /> Today
      </div>
    </div>
  );
}

function DayDetailsDialog({
  open,
  onOpenChange,
  mode,
  year,
  month,
  day,
  entries,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CalendarMode;
  year: number;
  month: number;
  day: number | null;
  entries: CalendarEntry[];
  events: MarketNewsEvent[];
}) {
  const title = day ? new Date(year, month, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Day details";
  const dayPnl = entries.reduce((sum, entry) => sum + entry.pnl, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-xl overflow-hidden rounded-2xl border-white/10 bg-[#080808] p-0 shadow-2xl">
        <DialogHeader className="border-b border-white/8 px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-white">{title}</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">{mode === "journal" ? `${entries.length} trade${entries.length === 1 ? "" : "s"} · ${cash.format(dayPnl)}` : `${events.length} high-impact event${events.length === 1 ? "" : "s"}`}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65dvh] overflow-y-auto p-4">
          {mode === "journal" ? (
            entries.length ? <div className="space-y-2.5">{entries.map((entry) => (
              <article key={entry.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#101010] px-3 py-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${entry.side === "Long" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{entry.side === "Long" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{entry.symbol}</p><p className="mt-1 truncate text-xs text-zinc-500">{entry.setup || entry.side}{entry.resultR ? ` · ${entry.resultR.toFixed(2)}R` : ""}</p></div>
                <p className={`shrink-0 text-sm font-semibold tabular-nums ${tone(entry.pnl)}`}>{cash.format(entry.pnl)}</p>
              </article>
            ))}</div> : <EmptyDayState label="No trades on this day." />
          ) : (
            events.length ? <div className="space-y-2.5">{events.map((event) => {
              const date = eventLocalDate(event);
              return (
                <article key={event.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-[#101010] px-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black text-lg">{eventFlag(event)}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5 text-white">{event.event}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{eventCurrency(event)} · Forecast {event.forecast || "—"} · Previous {event.previous || "—"}</p></div>
                  <div className="shrink-0 text-right"><p className="text-xs font-semibold tabular-nums text-zinc-300">{Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p><p className="mt-1 text-[10px] text-rose-300">★★★</p></div>
                </article>
              );
            })}</div> : <EmptyDayState label="No high-impact news on this day." />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyDayState({ label }: { label: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 bg-[#0b0b0b] px-5 text-center">
      <div><CalendarDays className="mx-auto size-5 text-zinc-600" /><p className="mt-3 text-sm text-zinc-500">{label}</p></div>
    </div>
  );
}
