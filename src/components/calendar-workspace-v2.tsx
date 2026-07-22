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
    return {
      mode: "journal",
      year: now.getFullYear(),
      month: now.getMonth(),
      monthly: false,
    };
  }

  const economic = window.location.pathname.match(
    /^\/economic-calendar\/(\d{4})\/(\d{1,2})/,
  );
  if (economic) {
    return {
      mode: "economic",
      year: Number(economic[1]),
      month: Math.min(11, Math.max(0, Number(economic[2]) - 1)),
      monthly: true,
    };
  }

  const journal = window.location.pathname.match(
    /^\/calendar\/(\d{4})\/(\d{1,2})/,
  );
  if (journal) {
    return {
      mode: "journal",
      year: Number(journal[1]),
      month: Math.min(11, Math.max(0, Number(journal[2]) - 1)),
      monthly: true,
    };
  }

  return {
    mode: "journal",
    year: now.getFullYear(),
    month: now.getMonth(),
    monthly: false,
  };
}

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function monthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthShort(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthBounds(year: number, month: number) {
  return {
    start: dateKey(year, month, 1),
    end: dateKey(
      year,
      month,
      new Date(year, month + 1, 0).getDate(),
    ),
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
  return (
    event.currency ||
    countryCurrency[event.country.toLowerCase()] ||
    "FX"
  );
}

function eventFlag(event: MarketNewsEvent) {
  return countryFlags[event.country.toLowerCase()] || "🌐";
}

function tone(value: number) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-zinc-500";
}

function bgTone(value: number) {
  if (value > 0) return "border-emerald-500/25 bg-emerald-500/10";
  if (value < 0) return "border-rose-500/25 bg-rose-500/10";
  return "border-white/8 bg-[#080808]";
}

function CompactStat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[10px] font-medium text-zinc-500 sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold tabular-nums sm:text-lg ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export function CalendarWorkspaceV2() {
  const {
    accounts,
    activeAccountId,
    loading: accountsLoading,
  } = useActiveAccountStore();
  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) || null;

  const [route, setRoute] = useState<RouteState>(currentRoute);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [news, setNews] = useState<MarketNewsEvent[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLimited, setNewsLimited] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
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

    void apiRequest<{ entries: EntryRow[] }>(
      `/api/journal?accountId=${encodeURIComponent(activeAccountId)}`,
    )
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
      const response = await apiRequest<MarketNewsResponse>(
        `/api/market-news?start=${start}&end=${end}`,
      );
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
    for (const entry of entries) {
      const year = parsedEntryDate(entry.date).getFullYear();
      if (Number.isFinite(year)) years.add(year);
    }
    return [...years].sort((left, right) => right - left);
  }, [entries]);

  const monthEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const date = parsedEntryDate(entry.date);
        return (
          date.getFullYear() === route.year &&
          date.getMonth() === route.month
        );
      }),
    [entries, route.month, route.year],
  );

  const entriesByDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    for (const entry of monthEntries) {
      const day = parsedEntryDate(entry.date).getDate();
      map.set(day, [...(map.get(day) || []), entry]);
    }
    return map;
  }, [monthEntries]);

  const newsByDay = useMemo(() => {
    const map = new Map<number, MarketNewsEvent[]>();
    for (const event of news) {
      const date = eventLocalDate(event);
      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== route.year ||
        date.getMonth() !== route.month
      ) {
        continue;
      }
      map.set(date.getDate(), [...(map.get(date.getDate()) || []), event]);
    }
    return map;
  }, [news, route.month, route.year]);

  const cells = useMemo(
    () => monthCells(route.year, route.month),
    [route.month, route.year],
  );
  const weeks = useMemo(
    () =>
      Array.from({ length: cells.length / 7 }, (_, index) =>
        cells.slice(index * 7, index * 7 + 7),
      ),
    [cells],
  );

  useEffect(() => {
    const now = new Date();
    const today =
      now.getFullYear() === route.year && now.getMonth() === route.month
        ? now.getDate()
        : null;
    const firstDataDay =
      route.mode === "economic"
        ? [...newsByDay.keys()][0]
        : [...entriesByDay.keys()][0];
    setSelectedDay(today || firstDataDay || 1);
  }, [entriesByDay, newsByDay, route.mode, route.month, route.year]);

  const monthPnl = monthEntries.reduce((sum, entry) => sum + entry.pnl, 0);
  const wins = monthEntries.filter((entry) => entry.pnl > 0).length;
  const losses = monthEntries.filter((entry) => entry.pnl < 0).length;
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
  const tradingDays = new Set(
    monthEntries.map((entry) => entry.date.slice(0, 10)),
  ).size;
  const realizedR = monthEntries.reduce(
    (sum, entry) => sum + entry.resultR,
    0,
  );
  const mostTraded =
    [
      ...monthEntries
        .reduce(
          (map, entry) =>
            map.set(entry.symbol, (map.get(entry.symbol) || 0) + 1),
          new Map<string, number>(),
        )
        .entries(),
    ].sort((left, right) => right[1] - left[1])[0]?.[0] || "—";
  const monthReturn = activeAccount?.initialBalance
    ? (monthPnl / activeAccount.initialBalance) * 100
    : 0;

  const statsByYear = useMemo(() => {
    const result = new Map<number, MonthStat[]>();
    for (const year of availableYears) {
      result.set(
        year,
        Array.from({ length: 12 }, (_, month) => {
          const selected = entries.filter((entry) => {
            const date = parsedEntryDate(entry.date);
            return date.getFullYear() === year && date.getMonth() === month;
          });
          const pnl = selected.reduce((sum, entry) => sum + entry.pnl, 0);
          const monthWins = selected.filter((entry) => entry.pnl > 0).length;
          const monthLosses = selected.filter((entry) => entry.pnl < 0).length;
          return {
            month,
            trades: selected.length,
            pnl,
            winRate:
              monthWins + monthLosses
                ? Math.round((monthWins / (monthWins + monthLosses)) * 100)
                : 0,
          };
        }),
      );
    }
    return result;
  }, [availableYears, entries]);

  const visibleYears =
    yearFilter === "all" ? availableYears : [Number(yearFilter)];

  const balanceCurve = useMemo(() => {
    const allowedYears = new Set(visibleYears);
    const selected = entries
      .filter((entry) => allowedYears.has(parsedEntryDate(entry.date).getFullYear()))
      .sort(
        (left, right) =>
          parsedEntryDate(left.date).getTime() -
          parsedEntryDate(right.date).getTime(),
      );

    let balance = activeAccount?.initialBalance || activeAccount?.accountSize || 0;
    const points = [
      {
        label: selected[0]?.date
          ? parsedEntryDate(selected[0].date).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          : String(visibleYears[0] || new Date().getFullYear()),
        balance,
      },
    ];

    for (const entry of selected) {
      balance += entry.pnl;
      points.push({
        label: parsedEntryDate(entry.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance,
      });
    }
    return points;
  }, [activeAccount?.accountSize, activeAccount?.initialBalance, entries, visibleYears]);

  const shiftMonth = (delta: number) => {
    const next = new Date(route.year, route.month + delta, 1);
    const base =
      route.mode === "economic" ? "/economic-calendar" : "/calendar";
    navigate(`${base}/${next.getFullYear()}/${next.getMonth() + 1}`);
  };

  const switchMode = (mode: CalendarMode) => {
    if (mode === "journal" && !route.monthly) return;
    const base = mode === "economic" ? "/economic-calendar" : "/calendar";
    navigate(`${base}/${route.year}/${route.month + 1}`);
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
          <h2 className="mt-4 text-xl font-bold text-white">
            Select an account first
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Calendar performance follows the active trading account.
          </p>
          <Button className="mt-5" onClick={() => navigate("/accounts")}>
            Open accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1420px] space-y-3 px-3 py-4 sm:p-4 lg:p-5">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-white/8 bg-[#080808] p-1">
          <button
            type="button"
            onClick={() => switchMode("journal")}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              route.mode === "journal"
                ? "bg-white/[.10] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Journal
          </button>
          <button
            type="button"
            onClick={() => switchMode("economic")}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              route.mode === "economic"
                ? "bg-white/[.10] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Economic Calendar
          </button>
        </div>
      </div>

      {route.mode === "journal" && !route.monthly ? (
        <YearOverview
          accountName={activeAccount.name}
          statsByYear={statsByYear}
          visibleYears={visibleYears}
          availableYears={availableYears}
          yearFilter={yearFilter}
          onYearFilter={setYearFilter}
          onOpen={(year, month) => navigate(`/calendar/${year}/${month + 1}`)}
          curve={balanceCurve}
        />
      ) : route.mode === "journal" ? (
        <JournalMonth
          year={route.year}
          month={route.month}
          weeks={weeks}
          entriesByDay={entriesByDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onBack={() => navigate("/calendar")}
          onShift={shiftMonth}
          stats={{
            total: monthEntries.length,
            tradingDays,
            realizedR,
            mostTraded,
            winRate,
            pnl: monthPnl,
            monthReturn,
          }}
        />
      ) : (
        <EconomicMonth
          year={route.year}
          month={route.month}
          weeks={weeks}
          newsByDay={newsByDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onShift={shiftMonth}
          onRefresh={loadNews}
          loading={newsLoading}
          limited={newsLimited}
        />
      )}
    </div>
  );
}

function YearOverview({
  accountName,
  statsByYear,
  visibleYears,
  availableYears,
  yearFilter,
  onYearFilter,
  onOpen,
  curve,
}: {
  accountName: string;
  statsByYear: Map<number, MonthStat[]>;
  visibleYears: number[];
  availableYears: number[];
  yearFilter: string;
  onYearFilter: (value: string) => void;
  onOpen: (year: number, month: number) => void;
  curve: Array<{ label: string; balance: number }>;
}) {
  return (
    <div className="space-y-4">
      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
        <CardContent className="flex items-center gap-4 p-5 sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Yearly Performance
            </h1>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              Select a month to view its performance
            </p>
          </div>
          <Select value={yearFilter} onValueChange={onYearFilter}>
            <SelectTrigger className="h-12 w-[138px] rounded-xl border-white/10 bg-[#171717] text-sm sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#090909]">
              <SelectItem value="all">All years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {visibleYears.map((year) => {
        const stats = statsByYear.get(year) || [];
        const ytdPnl = stats.reduce((sum, item) => sum + item.pnl, 0);
        const ytdTrades = stats.reduce((sum, item) => sum + item.trades, 0);
        return (
          <Card
            key={year}
            className="gap-0 border-white/8 bg-[#070707] shadow-none"
          >
            <CardHeader className="px-5 pb-0 pt-5">
              <h2 className="text-lg font-semibold text-white">{year}</h2>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
                {stats.map((item) => (
                  <MonthTile
                    key={item.month}
                    year={year}
                    item={item}
                    onOpen={onOpen}
                  />
                ))}
                <div>
                  <p className="mb-2 text-center text-xs text-zinc-500">YTD</p>
                  <div className={`grid min-h-[76px] place-items-center rounded-xl border p-2 text-center ${bgTone(ytdPnl)}`}>
                    <div>
                      <p className={`text-sm font-semibold tabular-nums ${tone(ytdPnl)}`}>
                        {ytdTrades ? cash.format(ytdPnl) : "—"}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {ytdTrades} trade{ytdTrades === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
        <CardHeader className="px-5 pb-0 pt-5">
          <h2 className="text-xl font-semibold text-white">Account Balance</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Equity curve of selected time period · {accountName}
          </p>
        </CardHeader>
        <CardContent className="h-[280px] px-0 pb-2 pt-4 sm:h-[360px] sm:px-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ left: 2, right: 18, top: 12, bottom: 4 }}>
              <defs>
                <linearGradient id="calendarYearBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={34}
                tick={{ fontSize: 10, fill: "#52525b" }}
              />
              <YAxis
                orientation="right"
                width={58}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`}
                tick={{ fontSize: 10, fill: "#52525b" }}
                domain={["dataMin - 100", "dataMax + 100"]}
              />
              <Tooltip
                formatter={(value) => cash.format(Number(value))}
                contentStyle={{
                  background: "#090909",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 12,
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#22c55e"
                strokeWidth={2.2}
                fill="url(#calendarYearBalance)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthTile({
  year,
  item,
  onOpen,
}: {
  year: number;
  item: MonthStat;
  onOpen: (year: number, month: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs text-zinc-500">
        {monthShort(year, item.month)}
      </p>
      <button
        type="button"
        onClick={() => onOpen(year, item.month)}
        className={`grid min-h-[76px] w-full place-items-center rounded-xl border p-2 text-center transition hover:border-white/20 ${bgTone(item.pnl)}`}
      >
        <div>
          <p className={`text-sm font-semibold tabular-nums ${tone(item.pnl)}`}>
            {item.trades ? cash.format(item.pnl) : "—"}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">
            {item.trades ? `${item.trades} trade${item.trades === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </button>
    </div>
  );
}

function JournalMonth({
  year,
  month,
  weeks,
  entriesByDay,
  selectedDay,
  onSelectDay,
  onBack,
  onShift,
  stats,
}: {
  year: number;
  month: number;
  weeks: Array<Array<number | null>>;
  entriesByDay: Map<number, CalendarEntry[]>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onBack: () => void;
  onShift: (delta: number) => void;
  stats: {
    total: number;
    tradingDays: number;
    realizedR: number;
    mostTraded: string;
    winRate: number;
    pnl: number;
    monthReturn: number;
  };
}) {
  const selected = selectedDay ? entriesByDay.get(selectedDay) || [] : [];

  return (
    <div className="space-y-4">
      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none md:hidden">
        <CardContent className="grid grid-cols-4 gap-2 px-3 py-4">
          <CompactStat label="Total trades" value={String(stats.total)} />
          <CompactStat
            label="Realized RR"
            value={stats.total ? `${stats.realizedR.toFixed(2)}R` : "—"}
          />
          <CompactStat label="Trade Winrate" value={`${stats.winRate}%`} />
          <CompactStat
            label="Month P&L"
            value={`${stats.monthReturn >= 0 ? "+" : ""}${stats.monthReturn.toFixed(2)}%`}
            valueClass={tone(stats.pnl)}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
        <CardHeader className="hidden border-b border-white/8 px-4 py-3 md:block">
          <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button variant="ghost" size="icon-sm" onClick={onBack}>
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-sm font-semibold text-white">Monthly Performance</h1>
                <p className="text-[10px] text-zinc-500">Select a day to inspect its trades</p>
              </div>
            </div>
            <MonthNavigation year={year} month={month} onShift={onShift} />
            <div />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="md:hidden">
            <MonthNavigation year={year} month={month} onShift={onShift} large />
          </div>

          <div className="mt-7 md:hidden">
            <MobileCalendar
              year={year}
              month={month}
              weeks={weeks}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
              getCount={(day) => entriesByDay.get(day)?.length || 0}
              getTone={(day) =>
                (entriesByDay.get(day) || []).reduce(
                  (sum, entry) => sum + entry.pnl,
                  0,
                )
              }
            />
          </div>

          <div className="hidden md:block">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <DesktopStat label="Total trades" value={String(stats.total)} />
              <DesktopStat label="Trading days" value={String(stats.tradingDays)} />
              <DesktopStat label="Realized RR" value={stats.total ? `${stats.realizedR.toFixed(2)}R` : "—"} />
              <DesktopStat label="Most traded asset" value={stats.mostTraded} />
              <DesktopStat label="Trade winrate" value={`${stats.winRate}%`} />
              <DesktopStat label="Month P&L" value={`${stats.monthReturn >= 0 ? "+" : ""}${stats.monthReturn.toFixed(2)}%`} valueClass={tone(stats.pnl)} />
            </div>
            <DesktopJournalGrid
              weeks={weeks}
              entriesByDay={entriesByDay}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
            />
          </div>
        </CardContent>
      </Card>

      {selected.length ? (
        <SelectedJournalDay
          year={year}
          month={month}
          day={selectedDay}
          entries={selected}
        />
      ) : null}
    </div>
  );
}

function MonthNavigation({
  year,
  month,
  onShift,
  large = false,
}: {
  year: number;
  month: number;
  onShift: (delta: number) => void;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-5">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onShift(-1)}
        className={large ? "size-11" : "size-8"}
        aria-label="Previous month"
      >
        <ChevronLeft className={large ? "size-6" : "size-4"} />
      </Button>
      <strong
        className={`${large ? "min-w-40 text-2xl" : "min-w-32 text-base"} text-center font-semibold text-white`}
      >
        {monthName(year, month)}
      </strong>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onShift(1)}
        className={large ? "size-11" : "size-8"}
        aria-label="Next month"
      >
        <ChevronRight className={large ? "size-6" : "size-4"} />
      </Button>
    </div>
  );
}

function MobileCalendar({
  year,
  month,
  weeks,
  selectedDay,
  onSelectDay,
  getCount,
  getTone,
}: {
  year: number;
  month: number;
  weeks: Array<Array<number | null>>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  getCount: (day: number) => number;
  getTone: (day: number) => number;
}) {
  const today = new Date();
  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {MOBILE_WEEKDAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className={`grid aspect-square place-items-center rounded-xl border border-white/8 bg-black text-sm font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-300"}`}
          >
            {day}
          </div>
        ))}

        {weeks.flat().map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
          const count = getCount(day);
          const result = getTone(day);
          const active = selectedDay === day;
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

          const resultClass = count
            ? result < 0
              ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-white/8 bg-[#0a0a0a] text-zinc-400";

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`relative grid aspect-square place-items-center rounded-xl border text-base font-semibold transition ${resultClass} ${active ? "ring-1 ring-white/25" : ""} ${isToday ? "shadow-[inset_0_0_0_1px_rgba(34,197,94,.65)]" : ""}`}
            >
              {day}
              {count ? (
                <span
                  className={`absolute bottom-1.5 size-1.5 rounded-full ${result < 0 ? "bg-rose-400" : "bg-emerald-400"}`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesktopStat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#101010] px-3 py-3">
      <p className="truncate text-[10px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-1.5 truncate text-base font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function DesktopJournalGrid({
  weeks,
  entriesByDay,
  selectedDay,
  onSelectDay,
}: {
  weeks: Array<Array<number | null>>;
  entriesByDay: Map<number, CalendarEntry[]>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_96px] gap-1.5">
      {WEEKDAYS.map((day, index) => (
        <div
          key={day}
          className={`rounded-lg border border-white/8 bg-black px-2 py-1.5 text-center text-[11px] font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-300"}`}
        >
          {day}
        </div>
      ))}
      <div className="rounded-lg border border-white/8 bg-black px-2 py-1.5 text-center text-[11px] font-semibold text-zinc-300">
        Week
      </div>

      {weeks.map((week, weekIndex) => {
        const weekTrades = week.flatMap((day) =>
          day ? entriesByDay.get(day) || [] : [],
        );
        const weekPnl = weekTrades.reduce((sum, entry) => sum + entry.pnl, 0);
        return [
          ...week.map((day, dayIndex) => {
            if (!day) {
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className="h-[86px] rounded-xl border border-transparent"
                />
              );
            }
            const dayEntries = entriesByDay.get(day) || [];
            const pnl = dayEntries.reduce((sum, entry) => sum + entry.pnl, 0);
            return (
              <button
                key={`${weekIndex}-${dayIndex}`}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`h-[86px] overflow-hidden rounded-xl border p-2 text-left transition ${day === selectedDay ? "ring-1 ring-white/25" : ""} ${dayEntries.length ? bgTone(pnl) : "border-white/8 bg-[#0a0a0a]"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${dayIndex >= 5 ? "text-zinc-600" : "text-zinc-300"}`}>{day}</span>
                  {dayEntries.length ? <span className="text-[8px] text-zinc-500">{dayEntries.length}T</span> : null}
                </div>
                {dayEntries.length ? (
                  <>
                    <p className={`mt-3 truncate text-xs font-semibold tabular-nums ${tone(pnl)}`}>{cash.format(pnl)}</p>
                    <p className="mt-0.5 truncate text-[9px] text-zinc-500">{[...new Set(dayEntries.map((entry) => entry.symbol))].slice(0, 2).join(" · ")}</p>
                  </>
                ) : null}
              </button>
            );
          }),
          <div
            key={`summary-${weekIndex}`}
            className="grid h-[86px] place-items-center rounded-xl border border-white/8 bg-black p-1.5 text-center"
          >
            <div>
              <p className={`text-xs font-semibold tabular-nums ${tone(weekPnl)}`}>{weekTrades.length ? cash.format(weekPnl) : "0%"}</p>
              <p className="mt-0.5 text-[9px] text-zinc-600">{weekTrades.length} trades</p>
            </div>
          </div>,
        ];
      })}
    </div>
  );
}

function EconomicMonth({
  year,
  month,
  weeks,
  newsByDay,
  selectedDay,
  onSelectDay,
  onShift,
  onRefresh,
  loading,
  limited,
}: {
  year: number;
  month: number;
  weeks: Array<Array<number | null>>;
  newsByDay: Map<number, MarketNewsEvent[]>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onShift: (delta: number) => void;
  onRefresh: () => Promise<void>;
  loading: boolean;
  limited: boolean;
}) {
  const selected = selectedDay ? newsByDay.get(selectedDay) || [] : [];

  return (
    <div className="space-y-4">
      <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
        <CardHeader className="border-b border-white/8 px-4 py-3">
          <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
            <div>
              <h1 className="text-sm font-semibold text-white">Economic Calendar</h1>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {limited ? "High-impact releases · limited live feed" : "High-impact releases for major markets"}
              </p>
            </div>
            <MonthNavigation year={year} month={month} onShift={onShift} />
            <div className="flex justify-end">
              <Button variant="ghost" size="icon-sm" onClick={() => void onRefresh()} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <Skeleton className="h-[480px] rounded-xl bg-white/[.04]" />
          ) : (
            <>
              <div className="md:hidden">
                <MobileCalendar
                  year={year}
                  month={month}
                  weeks={weeks}
                  selectedDay={selectedDay}
                  onSelectDay={onSelectDay}
                  getCount={(day) => newsByDay.get(day)?.length || 0}
                  getTone={() => 1}
                />
              </div>
              <DesktopEconomicGrid
                weeks={weeks}
                newsByDay={newsByDay}
                selectedDay={selectedDay}
                onSelectDay={onSelectDay}
              />
            </>
          )}
        </CardContent>
      </Card>

      {selected.length ? (
        <SelectedNewsDay
          year={year}
          month={month}
          day={selectedDay}
          events={selected}
        />
      ) : null}
    </div>
  );
}

function DesktopEconomicGrid({
  weeks,
  newsByDay,
  selectedDay,
  onSelectDay,
}: {
  weeks: Array<Array<number | null>>;
  newsByDay: Map<number, MarketNewsEvent[]>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}) {
  return (
    <div className="hidden grid-cols-7 gap-1.5 md:grid">
      {WEEKDAYS.map((day, index) => (
        <div
          key={day}
          className={`rounded-lg border border-white/8 bg-black px-2 py-1.5 text-center text-[11px] font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-300"}`}
        >
          {day}
        </div>
      ))}
      {weeks.flat().map((day, index) => {
        if (!day) {
          return <div key={`empty-${index}`} className="h-[106px] rounded-xl border border-transparent" />;
        }
        const events = newsByDay.get(day) || [];
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={`h-[106px] overflow-hidden rounded-xl border bg-[#0a0a0a] p-2 text-left transition ${day === selectedDay ? "border-white/20 ring-1 ring-white/15" : "border-white/8 hover:border-white/14"}`}
          >
            <div className="text-right text-[10px] font-semibold text-zinc-400">{day}</div>
            <div className="mt-1 space-y-1">
              {events.slice(0, 2).map((event) => {
                const date = eventLocalDate(event);
                return (
                  <div key={event.id} className="rounded-md border border-white/8 bg-[#101010] px-1.5 py-1">
                    <p className="truncate text-[9px] font-semibold text-white">{event.event}</p>
                    <div className="mt-0.5 flex items-center justify-between gap-1 text-[8px]">
                      <span className="truncate text-zinc-500">{eventFlag(event)} {eventCurrency(event)}</span>
                      <span className="shrink-0 tabular-nums text-zinc-300">{Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })}
              {events.length > 2 ? <p className="px-1 text-[8px] text-zinc-600">+{events.length - 2} more</p> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SelectedJournalDay({
  year,
  month,
  day,
  entries,
}: {
  year: number;
  month: number;
  day: number | null;
  entries: CalendarEntry[];
}) {
  return (
    <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
      <CardHeader className="px-4 pb-0 pt-4">
        <p className="text-sm font-semibold text-white">
          {day
            ? new Date(year, month, day).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Select a day"}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:p-4">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#101010] px-3 py-3">
            <span className={`grid size-9 place-items-center rounded-lg ${entry.side === "Long" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
              {entry.side === "Long" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{entry.symbol}</p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">{entry.setup || entry.side}</p>
            </div>
            <p className={`text-sm font-semibold tabular-nums ${tone(entry.pnl)}`}>{cash.format(entry.pnl)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SelectedNewsDay({
  year,
  month,
  day,
  events,
}: {
  year: number;
  month: number;
  day: number | null;
  events: MarketNewsEvent[];
}) {
  return (
    <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
      <CardHeader className="px-4 pb-0 pt-4">
        <p className="text-sm font-semibold text-white">
          {day
            ? new Date(year, month, day).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Select a day"}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:p-4">
        {events.map((event) => {
          const date = eventLocalDate(event);
          return (
            <div key={event.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#101010] px-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-black text-base">{eventFlag(event)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-white">{event.event}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-zinc-500">{eventCurrency(event)} · Forecast {event.forecast || "—"} · Previous {event.previous || "—"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold tabular-nums text-zinc-300">{Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                <p className="mt-1 text-[9px] text-rose-300">★★★</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
