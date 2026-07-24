"use client"

import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  RefreshCw,
  TrendingUp,
} from "lucide-react"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useAuth } from "@/components/auth-context"
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
import { apiRequest } from "@/lib/api-client"

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

const CARD_SURFACE =
  "flex min-h-0 flex-col gap-0 overflow-hidden rounded-xl border-white/10 bg-[#080808] py-0 shadow-none sm:rounded-2xl"

function cleanUsername(value: unknown) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 30) || "trader"
  )
}

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
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-[14px] font-bold leading-5 tracking-[-0.02em] text-white sm:text-[15px]">
          {title}
        </h2>
        <p className="truncate text-[10px] font-medium leading-4 text-zinc-500 sm:text-[11px]">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function MetricRing({ value }: { value: number }) {
  const bounded = clamp(value)
  const tone = bounded >= 50 ? "#22c55e" : "#f59e0b"

  return (
    <div
      className="grid size-[64px] shrink-0 place-items-center rounded-full p-[5px] min-[380px]:size-[70px] sm:size-[78px]"
      style={{
        background: `conic-gradient(${tone} ${bounded * 3.6}deg, rgba(255,255,255,.09) 0deg)`,
      }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-[#080808] text-center">
        <div>
          <p className="text-base font-bold leading-none tabular-nums text-white sm:text-lg">
            {Math.round(bounded)}%
          </p>
          <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-[8px]">
            Win rate
          </p>
        </div>
      </div>
    </div>
  )
}

function WeeklyStrip({
  weeklyStrip,
  formatTradePnl,
}: {
  weeklyStrip: WeeklyDay[]
  formatTradePnl: (amount: number) => string
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="grid auto-cols-[minmax(126px,1fr)] grid-flow-col gap-2 lg:grid-flow-row lg:grid-cols-7">
        {weeklyStrip.map((day) => {
          const positive = day.pnl > 0
          const negative = day.pnl < 0
          const tone = positive
            ? "text-emerald-400"
            : negative
              ? "text-rose-400"
              : "text-zinc-500"

          return (
            <article
              key={day.key}
              className="h-[64px] overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 transition hover:border-white/20 hover:bg-[#0d0d0d]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-semibold text-zinc-200">
                  {day.label}
                </p>
                <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${tone}`}>
                  {day.percent > 0 ? "+" : ""}
                  {day.percent.toFixed(2)}%
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className={`truncate text-[12px] font-bold tabular-nums ${tone}`}>
                  {day.trades ? formatTradePnl(day.pnl) : "—"}
                </p>
                <p className="shrink-0 text-[10px] text-zinc-500">
                  {day.trades} trade{day.trades === 1 ? "" : "s"}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "positive" | "negative" | "neutral"
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "text-zinc-200"

  return (
    <div className="flex min-h-0 items-center justify-between gap-3 py-1.5">
      <span className="truncate text-[10px] leading-none text-zinc-400 sm:text-[11px]">
        {label}
      </span>
      <strong className={`shrink-0 text-[10px] leading-none tabular-nums sm:text-[11px] ${valueClass}`}>
        {value}
      </strong>
    </div>
  )
}

export function DashboardOverviewResponsive({
  account,
  stats,
  equity,
  weeklyStrip,
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
  const { user } = useAuth()
  const fallbackUsername = useMemo(
    () =>
      cleanUsername(
        user?.user_metadata.user_name ??
          user?.user_metadata.preferred_username ??
          user?.email?.split("@")[0],
      ),
    [user],
  )
  const [username, setUsername] = useState(fallbackUsername)
  const [news, setNews] = useState<MarketNewsEvent[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsLimited, setNewsLimited] = useState(false)

  useEffect(() => {
    setUsername(fallbackUsername)
    if (!user) return

    let active = true
    void apiRequest<{ profile?: { username?: string | null } }>("/api/profile")
      .then(({ profile }) => {
        if (active && profile?.username) {
          setUsername(cleanUsername(profile.username))
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [fallbackUsername, user])

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

  const breakeven = Math.max(0, monthCount - stats.wins - stats.losses)
  const profitSegments = 14
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
  const returnPercent = account.initialBalance
    ? (currentPnl / account.initialBalance) * 100
    : 0
  const formatBalance = (value: number) =>
    balancesHidden ? "******" : money.format(value)

  return (
    <div className="space-y-3 pb-24 sm:pb-5">
      <section className="flex min-h-[52px] items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-medium tracking-[-0.04em] text-white min-[420px]:text-[25px] sm:text-[27px]">
            Welcome back, {username}
          </h1>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500 sm:text-[12px]">
            {todayLabel}
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-lg border border-white/10 bg-[#0b0b0b] px-3 py-2 text-[11px] font-semibold text-zinc-300">
            Current week
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b0b0b] px-3 py-2 text-[11px] font-semibold text-zinc-300">
            <span
              className={`size-1.5 rounded-full ${
                account.status === "Active" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {account.status}
          </span>
        </div>
      </section>

      <WeeklyStrip weeklyStrip={weeklyStrip} formatTradePnl={formatTradePnl} />

      <section className="grid items-stretch gap-3 xl:h-[392px] xl:grid-cols-2">
        <Card className={`${CARD_SURFACE} h-full`}>
          <CardHeader className="flex shrink-0 flex-col gap-3 border-b border-white/8 px-3.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4 sm:py-3.5">
            <div className="min-w-0">
              <CardDescription className="text-[10px] font-medium text-zinc-500 sm:text-[11px]">
                Account Balance
              </CardDescription>
              <CardTitle className="mt-1 truncate text-[27px] font-medium tracking-[-0.05em] text-white sm:text-[32px]">
                {formatBalance(currentEquity)}
              </CardTitle>
              <p
                className={`mt-1 text-[11px] font-semibold sm:text-[12px] ${
                  currentPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatTradePnl(currentPnl)} · last 30 days
              </p>
            </div>
            <div className="flex shrink-0 gap-5 text-left sm:text-right">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Start
                </p>
                <p className="mt-1 text-[11px] font-semibold tabular-nums text-zinc-200 sm:text-[12px]">
                  {formatBalance(account.initialBalance)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Return
                </p>
                <p
                  className={`mt-1 text-[11px] font-semibold tabular-nums sm:text-[12px] ${
                    returnPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {returnPercent > 0 ? "+" : ""}
                  {returnPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[290px] min-h-0 flex-1 px-0.5 pb-1 pt-2 min-[480px]:h-[320px] sm:px-3 xl:h-auto">
            {equity.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={equity}
                  margin={{ left: 0, right: 10, top: 14, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="tradoxResponsiveEquity"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.24} />
                      <stop offset="62%" stopColor="#22c55e" stopOpacity={0.07} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis
                    dataKey="trade"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#71717a" }}
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
                      borderRadius: 12,
                      color: "#f4f4f5",
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#22c55e"
                    fill="url(#tradoxResponsiveEquity)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#22c55e",
                      stroke: "#050505",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="relative h-full">
                <div className="absolute inset-x-0 bottom-7 h-px bg-emerald-500/80" />
                <Empty className="h-full border-0 bg-transparent">
                  <EmptyMedia>
                    <TrendingUp className="size-4" />
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

        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:h-[392px] xl:grid-rows-2">
          <Card className={`${CARD_SURFACE} h-full min-h-[168px] xl:min-h-0`}>
            <CardHeader className="h-[52px] shrink-0 border-b border-white/8 px-3.5 py-2.5">
              <SectionHeader title="Most Traded Assets" description="Recent activity" />
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 grid-rows-2 px-3.5 py-1.5">
              {instrumentStats.length ? (
                instrumentStats.slice(0, 2).map((item) => (
                  <div
                    key={item.symbol}
                    className="flex min-h-0 items-center gap-2 border-b border-white/8 last:border-0"
                  >
                    <InstrumentBadge
                      symbol={item.symbol}
                      compact
                      className="hidden shrink-0 bg-[#111111] min-[390px]:grid"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold leading-4 text-white">
                        {item.symbol}
                      </p>
                      <p className="truncate text-[9px] leading-3 text-zinc-500">
                        {item.trades} trade{item.trades === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p
                      className={`hidden shrink-0 text-[9px] font-semibold tabular-nums min-[450px]:block ${
                        item.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatTradePnl(item.pnl)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-full grid h-full place-items-center text-center">
                  <div>
                    <p className="text-2xl font-medium text-white">N/A</p>
                    <p className="mt-1 text-[10px] text-zinc-500">No symbol data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${CARD_SURFACE} h-full min-h-[168px] xl:min-h-0`}>
            <CardHeader className="h-[52px] shrink-0 border-b border-white/8 px-3.5 py-2.5">
              <SectionHeader title="Total Trades" description="Current period" />
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] px-3.5 pb-2 pt-2">
              <p className="text-[28px] font-medium leading-none tracking-[-0.05em] tabular-nums text-white sm:text-[30px]">
                {monthCount}
              </p>
              <div className="mt-1 grid min-h-0 grid-rows-3 divide-y divide-white/8 overflow-hidden">
                <BreakdownRow label="Winning" value={stats.wins} tone="positive" />
                <BreakdownRow label="Breakeven" value={breakeven} />
                <BreakdownRow label="Losing" value={stats.losses} tone="negative" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${CARD_SURFACE} h-full min-h-[168px] xl:min-h-0`}>
            <CardHeader className="h-[52px] shrink-0 border-b border-white/8 px-3.5 py-2.5">
              <SectionHeader title="Trade Winrate" description="Efficiency" />
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 items-center justify-between gap-2 px-3.5 py-2">
              <div className="min-w-0 text-[10px] leading-none sm:text-[11px]">
                <p className="truncate text-zinc-400">Winning trades</p>
                <p className="mt-1.5 font-semibold tabular-nums text-emerald-400">
                  {stats.wins}
                </p>
                <p className="mt-3 truncate text-zinc-400">Losing trades</p>
                <p className="mt-1.5 font-semibold tabular-nums text-rose-400">
                  {stats.losses}
                </p>
              </div>
              <MetricRing value={stats.rate} />
            </CardContent>
          </Card>

          <Card className={`${CARD_SURFACE} h-full min-h-[168px] xl:min-h-0`}>
            <CardHeader className="h-[52px] shrink-0 border-b border-white/8 px-3.5 py-2.5">
              <SectionHeader title="Profit Factor" description="Win / loss" />
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)] px-3.5 pb-2.5 pt-2">
              <p
                className={`text-[25px] font-medium leading-none tabular-nums sm:text-[27px] ${
                  stats.pf >= 1 ? "text-white" : "text-rose-400"
                }`}
              >
                {stats.pf.toFixed(2)}
              </p>
              <div className="mt-3 flex gap-0.5" aria-label="Profit factor visual scale">
                {Array.from({ length: profitSegments }, (_, index) => (
                  <span
                    key={index}
                    className={`h-6 min-w-0 flex-1 rounded-full ${
                      index < positiveSegments ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                ))}
              </div>
              <p className="self-end truncate pt-2 text-[9px] leading-none text-zinc-500 sm:text-[10px]">
                {stats.pf >= 1 ? "Positive expectancy" : "Below break-even"}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid items-stretch gap-3 lg:grid-cols-2 xl:h-[156px]">
        <Card className={`${CARD_SURFACE} h-full min-h-[156px]`}>
          <CardHeader className="h-[52px] shrink-0 border-b border-white/8 px-3.5 py-2.5 sm:px-4">
            <SectionHeader
              title="Recent Trades"
              description="Latest journal entries"
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onSeeAll}
                  className="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-zinc-200"
                >
                  See all <ArrowUpRight className="size-3.5" />
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden p-2">
            {recentTrades.length ? (
              recentTrades.slice(0, 2).map((trade) => (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => onOpenTrade(trade)}
                  className="grid h-[43px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 text-left transition hover:bg-white/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 min-[420px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[420px]:gap-3 min-[420px]:px-2.5"
                >
                  <InstrumentBadge
                    symbol={trade.symbol}
                    compact
                    className="hidden shrink-0 bg-[#111111] min-[420px]:grid"
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[12px] font-semibold text-white">
                        {trade.symbol}
                      </p>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                          trade.side === "Long"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-rose-400/10 text-rose-400"
                        }`}
                      >
                        {trade.side === "Long" ? "Buy" : "Sell"}
                      </span>
                    </div>
                    <p className="truncate text-[9px] text-zinc-500">
                      {trade.setup || trade.session || trade.rawDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[12px] font-bold tabular-nums ${
                        trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatTradePnl(trade.pnl)}
                    </p>
                    <p className="text-[8px] text-zinc-500">
                      {trade.resultR
                        ? `${trade.resultR.toFixed(2)}R`
                        : trade.rawDate}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <Empty className="h-full border-0 bg-transparent py-1">
                <EmptyMedia>
                  <BookOpen className="size-4" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No trades yet</EmptyTitle>
                  <EmptyDescription>Add a trade to begin tracking performance.</EmptyDescription>
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

        <Card className={`${CARD_SURFACE} h-full min-h-[156px]`}>
          <CardHeader className="h-[52px] shrink-0 border-b border-white/8 px-3.5 py-2.5 sm:px-4">
            <SectionHeader
              title="High Impact News"
              description={
                newsLimited ? "Live calendar · limited feed" : "Today's upcoming releases"
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
                  <RefreshCw className={`size-3.5 ${newsLoading ? "animate-spin" : ""}`} />
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden p-2">
            {newsLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 2 }, (_, index) => (
                  <div
                    key={index}
                    className="h-[38px] animate-pulse rounded-lg bg-white/[.04]"
                  />
                ))}
              </div>
            ) : news.length ? (
              <div>
                {news.slice(0, 2).map((item) => {
                  const date = eventDate(item.date)
                  return (
                    <article
                      key={item.id}
                      className="grid h-[43px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/8 px-1 last:border-0 min-[420px]:gap-2.5 min-[420px]:px-1.5"
                    >
                      <span className="grid h-7 min-w-9 place-items-center rounded-lg border border-white/10 bg-[#101010] px-1 text-[8px] font-bold text-zinc-200 min-[420px]:min-w-10 min-[420px]:px-1.5 min-[420px]:text-[9px]">
                        {eventCurrency(item)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold text-white min-[420px]:text-[11px]">
                          {item.event}
                        </p>
                        <p className="truncate text-[8px] text-zinc-500 min-[420px]:text-[9px]">
                          {item.country}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-semibold tabular-nums text-zinc-200 min-[420px]:text-[10px]">
                          {Number.isNaN(date.getTime())
                            ? "TBD"
                            : date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                        </p>
                        <div className="mt-1 flex justify-end gap-0.5" aria-label="High impact">
                          {Array.from({ length: 3 }, (_, index) => (
                            <span key={index} className="size-1.5 rounded-full bg-rose-400" />
                          ))}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <CalendarDays className="mx-auto size-4 text-zinc-500" />
                  <p className="mt-2 text-[12px] font-semibold text-zinc-300">
                    No high-impact releases found
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
