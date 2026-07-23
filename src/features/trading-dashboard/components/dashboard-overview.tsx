"use client"

import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  RefreshCw,
  TrendingUp,
} from "lucide-react"
import CircularProgress from "@mui/material/CircularProgress"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { apiRequest } from "@/lib/api-client"
import { InstrumentBadge } from "@/components/instrument-badge"
import type { JournalEntry, OpenPosition, PropAccount } from "@/components/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type WeeklyDay = {
  key: string
  label: string
  trades: number
  pnl: number
  percent: number
}

type DashboardStats = {
  pnl: number
  wins: number
  losses: number
  rate: number
  pf: number
}

type SetupStat = {
  name: string
  pnl: number
  trades: number
  wins: number
  rate: number
}

type MistakeStat = {
  name: string
  pnl: number
  trades: number
}

type MarketNewsEvent = {
  id: string
  date: string
  country: string
  currency: string
  event: string
  category: string
  actual: string
  forecast: string
  previous: string
  importance: number
  source: string
}

type MarketNewsResponse = {
  events: MarketNewsEvent[]
  date: string
  provider: string
  limited: boolean
}

interface DashboardOverviewProps {
  account: PropAccount
  stats: DashboardStats
  equity: Array<{ trade: number; equity: number; label: string }>
  weeklyStrip: WeeklyDay[]
  setups: SetupStat[]
  mistakes: MistakeStat[]
  planRate: number
  monthCount: number
  recentTrades: JournalEntry[]
  openPositions: OpenPosition[]
  currentPnl: number
  currentEquity: number
  targetProgress: number
  drawdownUsed: number
  balancesHidden: boolean
  formatTradePnl: (amount: number) => string
  onOpenTrade: (trade: JournalEntry) => void
  onSeeAll: () => void
  onAddTrade: () => void
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const COUNTRY_CURRENCY: Record<string, string> = {
  "united states": "USD",
  "euro area": "EUR",
  "united kingdom": "GBP",
  japan: "JPY",
  canada: "CAD",
  australia: "AUD",
  "new zealand": "NZD",
  switzerland: "CHF",
  china: "CNY",
}

const DASHBOARD_CARD =
  "gap-0 overflow-hidden rounded-[22px] border-white/10 bg-gradient-to-b from-[#0b0b0b] to-[#060606] shadow-[0_18px_55px_rgba(0,0,0,.22)]"

function clamp(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
}

function eventDate(value: string) {
  const timezoneIncluded = /z$|[+-]\d{2}:?\d{2}$/i.test(value)
  return new Date(timezoneIncluded ? value : `${value}Z`)
}

function eventCurrency(event: MarketNewsEvent) {
  return (
    event.currency ||
    COUNTRY_CURRENCY[event.country.toLowerCase()] ||
    event.country.slice(0, 3).toUpperCase()
  )
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-bold tracking-[-0.02em] text-white sm:text-[17px]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] font-medium leading-4 text-zinc-400 sm:text-xs">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function MetricRing({ value }: { value: number }) {
  const bounded = clamp(value)

  return (
    <div className="relative grid size-[82px] shrink-0 place-items-center sm:size-[104px]">
      <CircularProgress
        variant="determinate"
        value={100}
        size="100%"
        thickness={3.5}
        sx={{ color: "rgba(255,255,255,.09)", position: "absolute" }}
      />
      <CircularProgress
        variant="determinate"
        value={bounded}
        size="100%"
        thickness={3.5}
        sx={{
          color: bounded >= 50 ? "#34d399" : "#f59e0b",
          position: "absolute",
          transform: "rotate(-90deg) !important",
          "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
        }}
      />
      <div className="text-center">
        <p className="text-xl font-bold tabular-nums text-white sm:text-2xl">
          {Math.round(bounded)}%
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-[10px]">
          Win rate
        </p>
      </div>
    </div>
  )
}

function WeeklyPerformanceCard({
  weeklyStrip,
  formatTradePnl,
}: {
  weeklyStrip: WeeklyDay[]
  formatTradePnl: (amount: number) => string
}) {
  const tradeCount = weeklyStrip.reduce((sum, day) => sum + day.trades, 0)

  return (
    <Card className={`${DASHBOARD_CARD} py-0`}>
      <CardHeader className="border-b border-white/8 px-4 py-4 sm:px-5">
        <SectionHeader
          title="Current week"
          description={`${tradeCount} closed trades`}
          action={
            <span className="rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-bold text-zinc-400">
              7 days
            </span>
          }
        />
      </CardHeader>
      <CardContent className="overflow-x-auto p-3 sm:p-4">
        <div className="grid auto-cols-[minmax(132px,1fr)] grid-flow-col gap-2.5 lg:grid-flow-row lg:grid-cols-7">
          {weeklyStrip.map((day) => {
            const positive = day.pnl > 0
            const negative = day.pnl < 0

            return (
              <article
                key={day.key}
                className="min-h-[96px] rounded-2xl border border-white/9 bg-white/[0.025] p-3.5 transition hover:border-white/16 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-zinc-200">
                    {day.label}
                  </p>
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      positive
                        ? "text-emerald-300"
                        : negative
                          ? "text-rose-300"
                          : "text-zinc-500"
                    }`}
                  >
                    {day.percent > 0 ? "+" : ""}
                    {day.percent.toFixed(2)}%
                  </span>
                </div>
                <p
                  className={`mt-3.5 text-base font-bold tabular-nums ${
                    positive
                      ? "text-emerald-300"
                      : negative
                        ? "text-rose-300"
                        : "text-zinc-400"
                  }`}
                >
                  {day.trades ? formatTradePnl(day.pnl) : "—"}
                </p>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {day.trades} trade{day.trades === 1 ? "" : "s"}
                </p>
              </article>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardOverview({
  account,
  stats,
  equity,
  weeklyStrip,
  setups,
  mistakes,
  planRate,
  monthCount,
  recentTrades,
  currentPnl,
  currentEquity,
  balancesHidden,
  formatTradePnl,
  onOpenTrade,
  onSeeAll,
  onAddTrade,
}: DashboardOverviewProps) {
  const formatBalance = (value: number) =>
    balancesHidden ? "******" : money.format(value)
  const breakeven = Math.max(0, monthCount - stats.wins - stats.losses)
  const [news, setNews] = useState<MarketNewsEvent[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsLimited, setNewsLimited] = useState(false)

  const loadNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const response = await apiRequest<MarketNewsResponse>("/api/market-news")
      setNews(response.events || [])
      setNewsLimited(Boolean(response.limited))
    } catch {
      setNews([])
      setNewsLimited(false)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNews()
  }, [loadNews])

  const instrumentStats = useMemo(
    () =>
      [
        ...recentTrades
          .reduce((map, trade) => {
            const current = map.get(trade.symbol) ?? {
              symbol: trade.symbol,
              trades: 0,
              pnl: 0,
            }
            current.trades += 1
            current.pnl += trade.pnl
            map.set(trade.symbol, current)
            return map
          }, new Map<string, { symbol: string; trades: number; pnl: number }>())
          .values(),
      ].sort(
        (left, right) =>
          right.trades - left.trades || right.pnl - left.pnl,
      ),
    [recentTrades],
  )

  const topSetup = setups[0] ?? null
  const topMistake = mistakes[0] ?? null
  const aiFocus = topMistake
    ? `Reduce ${topMistake.name}; it appeared in ${topMistake.trades} trades.`
    : planRate < 80
      ? `Plan alignment is ${planRate}%. Review entries before increasing risk.`
      : topSetup
        ? `Keep prioritizing ${topSetup.name}; current win rate is ${topSetup.rate}%.`
        : "Complete trade reviews to unlock a reliable execution insight."

  const profitSegments = 16
  const positiveSegments =
    stats.pf > 0
      ? Math.min(
          profitSegments,
          Math.max(
            1,
            Math.round((stats.pf / (stats.pf + 1)) * profitSegments),
          ),
        )
      : 0

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="flex flex-col gap-3 px-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            {account.name} / dashboard
          </p>
          <h1 className="mt-1.5 truncate text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[32px]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[13px] font-medium text-zinc-400">
            {todayLabel}
          </p>
          <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-zinc-500">
            AI focus: {aiFocus}
          </p>
        </div>
        <div className="hidden items-center gap-2.5 self-start rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 sm:flex sm:self-auto">
          <span
            className={`size-2 rounded-full ${
              account.status === "Active" ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          <span className="text-xs font-semibold text-zinc-200">
            {account.status}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-xs text-zinc-400">{account.marketType}</span>
        </div>
      </section>

      <div className="hidden lg:block">
        <WeeklyPerformanceCard
          weeklyStrip={weeklyStrip}
          formatTradePnl={formatTradePnl}
        />
      </div>

      <section className="grid items-stretch gap-4 xl:grid-cols-12">
        <Card className={`${DASHBOARD_CARD} h-full xl:col-span-7`}>
          <CardHeader className="border-b border-white/8 px-5 py-5 sm:grid-cols-[1fr_auto] sm:py-4">
            <div>
              <CardDescription className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Account balance
              </CardDescription>
              <CardTitle className="mt-2 text-[38px] font-medium tracking-[-0.055em] text-white sm:text-[40px]">
                {formatBalance(currentEquity)}
              </CardTitle>
              <p
                className={`mt-2 text-[13px] font-semibold ${
                  currentPnl >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatTradePnl(currentPnl)} · last 30 days
              </p>
            </div>
            <div className="mt-4 flex gap-6 sm:mt-0 sm:text-right">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Start
                </p>
                <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-200">
                  {formatBalance(account.initialBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Return
                </p>
                <p
                  className={`mt-1.5 text-[13px] font-semibold tabular-nums ${
                    currentPnl >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {account.initialBalance
                    ? `${currentPnl >= 0 ? "+" : ""}${(
                        (currentPnl / account.initialBalance) *
                        100
                      ).toFixed(2)}%`
                    : "0.00%"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[360px] px-1 pb-2 pt-4 sm:h-[390px] sm:px-4 sm:pt-3">
            {equity.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={equity}
                  margin={{ left: 0, right: 12, top: 18, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="tradoxDashboardEquity"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                      <stop offset="58%" stopColor="#22c55e" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="rgba(255,255,255,.055)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="trade"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    formatter={(value) => formatBalance(Number(value))}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.label ?? "Balance"
                    }
                    contentStyle={{
                      background: "#0b0b0b",
                      border: "1px solid rgba(255,255,255,.12)",
                      borderRadius: 14,
                      color: "#f4f4f5",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#22c55e"
                    fill="url(#tradoxDashboardEquity)"
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{
                      r: 4.5,
                      fill: "#22c55e",
                      stroke: "#050505",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="relative h-full">
                <div className="absolute inset-x-0 bottom-8 h-px bg-emerald-500/80" />
                <Empty className="h-full border-0 bg-transparent">
                  <EmptyMedia>
                    <TrendingUp className="size-5" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No balance curve yet</EmptyTitle>
                    <EmptyDescription>
                      Add the first closed trade to start tracking account growth.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button size="sm" variant="outline" onClick={onAddTrade}>
                      Add first trade
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid auto-rows-fr grid-cols-2 gap-4 xl:col-span-5">
          <Card className={`${DASHBOARD_CARD} min-h-[205px]`}>
            <CardHeader className="px-4 py-4 sm:px-5">
              <SectionHeader title="Most traded assets" description="Recent activity" />
            </CardHeader>
            <CardContent className="space-y-1 px-4 pb-4 sm:px-5">
              {instrumentStats.length ? (
                instrumentStats.slice(0, 3).map((item) => (
                  <div
                    key={item.symbol}
                    className="flex items-center gap-2.5 border-b border-white/8 py-2.5 last:border-0"
                  >
                    <InstrumentBadge
                      symbol={item.symbol}
                      compact
                      className="hidden shrink-0 bg-[#111111] min-[390px]:grid"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {item.symbol}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {item.trades} trade{item.trades === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p
                      className={`hidden text-[11px] font-semibold tabular-nums min-[430px]:block ${
                        item.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {formatTradePnl(item.pnl)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-4">
                  <p className="text-3xl font-medium text-white">N/A</p>
                  <div className="mt-5 space-y-3">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="h-px bg-white/10" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD} min-h-[205px]`}>
            <CardHeader className="px-4 py-4 sm:px-5">
              <SectionHeader title="Total trades" description="Current period" />
            </CardHeader>
            <CardContent className="px-4 pb-5 sm:px-5">
              <p className="text-[42px] font-medium tracking-[-0.05em] tabular-nums text-white">
                {monthCount}
              </p>
              <div className="mt-4 space-y-2.5 text-xs sm:text-[13px]">
                <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                  <span className="text-zinc-400">Winning</span>
                  <strong className="tabular-nums text-emerald-300">
                    {stats.wins}
                  </strong>
                </div>
                <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                  <span className="text-zinc-400">Breakeven</span>
                  <strong className="tabular-nums text-zinc-200">
                    {breakeven}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Losing</span>
                  <strong className="tabular-nums text-rose-300">
                    {stats.losses}
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD} min-h-[205px]`}>
            <CardHeader className="px-4 py-4 sm:px-5">
              <SectionHeader title="Trade win rate" description="Efficiency" />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3 px-4 pb-5 sm:px-5">
              <div className="min-w-0 text-xs sm:text-[13px]">
                <p className="text-zinc-400">Wins</p>
                <p className="mt-1 font-semibold tabular-nums text-emerald-300">
                  {stats.wins}
                </p>
                <p className="mt-3.5 text-zinc-400">Losses</p>
                <p className="mt-1 font-semibold tabular-nums text-rose-300">
                  {stats.losses}
                </p>
              </div>
              <MetricRing value={stats.rate} />
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD} min-h-[205px]`}>
            <CardHeader className="px-4 py-4 sm:px-5">
              <SectionHeader title="Profit factor" description="Win / loss" />
            </CardHeader>
            <CardContent className="px-4 pb-5 sm:px-5">
              <p
                className={`text-[34px] font-medium tabular-nums ${
                  stats.pf >= 1 ? "text-white" : "text-rose-300"
                }`}
              >
                {stats.pf.toFixed(2)}
              </p>
              <div
                className="mt-5 flex gap-1"
                aria-label="Profit factor visual scale"
              >
                {Array.from({ length: profitSegments }, (_, index) => (
                  <span
                    key={index}
                    className={`h-8 w-1 flex-1 rounded-full ${
                      index < positiveSegments
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-3 truncate text-[11px] text-zinc-500">
                {stats.pf >= 1 ? "Positive expectancy" : "Below break-even"}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="lg:hidden">
        <WeeklyPerformanceCard
          weeklyStrip={weeklyStrip}
          formatTradePnl={formatTradePnl}
        />
      </div>

      <section className="grid items-stretch gap-4 xl:grid-cols-12">
        <Card className={`${DASHBOARD_CARD} min-h-[350px] xl:col-span-7`}>
          <CardHeader className="border-b border-white/8 px-5 py-4">
            <SectionHeader
              title="Recent trades"
              description="Latest journal entries for this account"
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onSeeAll}
                  className="h-9 rounded-xl px-3 text-xs font-semibold text-zinc-200"
                >
                  See all <ArrowUpRight className="size-3.5" />
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-2.5">
            {recentTrades.length ? (
              recentTrades.slice(0, 5).map((trade) => (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => onOpenTrade(trade)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl px-3 py-3.5 text-left transition hover:bg-white/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                >
                  <InstrumentBadge
                    symbol={trade.symbol}
                    compact
                    className="shrink-0 bg-[#111111]"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {trade.symbol}
                      </p>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          trade.side === "Long"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        {trade.side === "Long" ? "Buy" : "Sell"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">
                      {trade.setup || trade.session || trade.rawDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[15px] font-bold tabular-nums ${
                        trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {formatTradePnl(trade.pnl)}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {trade.resultR
                        ? `${trade.resultR.toFixed(2)}R`
                        : trade.rawDate}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <Empty className="my-2 min-h-64">
                <EmptyMedia>
                  <BookOpen className="size-5" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No trades yet</EmptyTitle>
                  <EmptyDescription>
                    Register a trade to unlock performance analytics.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={onAddTrade}>
                    Add first trade
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className={`${DASHBOARD_CARD} min-h-[350px] xl:col-span-5`}>
          <CardHeader className="border-b border-white/8 px-5 py-4">
            <SectionHeader
              title="Daily high-impact news"
              description={
                newsLimited
                  ? "Live economic calendar · limited feed"
                  : "Today's upcoming high-impact releases"
              }
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void loadNews()}
                  disabled={newsLoading}
                  aria-label="Refresh market news"
                  className="text-zinc-400"
                >
                  <RefreshCw
                    className={`size-4 ${newsLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-2.5">
            {newsLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-[72px] animate-pulse rounded-xl bg-white/[.04]"
                  />
                ))}
              </div>
            ) : news.length ? (
              <div className="space-y-1">
                {news.slice(0, 6).map((item) => {
                  const date = eventDate(item.date)
                  return (
                    <article
                      key={item.id}
                      className="grid min-h-[68px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition hover:border-white/8 hover:bg-white/[.025]"
                    >
                      <span className="grid h-10 min-w-12 shrink-0 place-items-center rounded-lg border border-white/9 bg-white/[0.035] px-2 text-[11px] font-bold text-zinc-200">
                        {eventCurrency(item)}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 break-words text-[13px] font-semibold leading-[18px] text-white">
                          {item.event}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-zinc-500">
                          <span className="truncate">{item.country}</span>
                          {item.forecast ? (
                            <span className="hidden truncate min-[430px]:inline">
                              F {item.forecast}
                            </span>
                          ) : null}
                          {item.previous ? (
                            <span className="hidden truncate sm:inline">
                              P {item.previous}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="rounded-lg bg-black/80 px-2.5 py-2 text-[11px] font-semibold tabular-nums text-zinc-200">
                          {Number.isNaN(date.getTime())
                            ? "TBD"
                            : date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                        </p>
                        <div
                          className="mt-1.5 flex justify-end gap-0.5"
                          aria-label="High impact"
                        >
                          {Array.from({ length: 3 }, (_, index) => (
                            <span
                              key={index}
                              className="size-1.5 rounded-full bg-rose-400"
                            />
                          ))}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center px-5 text-center">
                <div>
                  <CalendarDays className="mx-auto size-6 text-zinc-500" />
                  <p className="mt-3 text-[15px] font-semibold text-zinc-200">
                    No high-impact releases found
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                    The feed may be quiet today or the limited calendar source may
                    not include current events.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
