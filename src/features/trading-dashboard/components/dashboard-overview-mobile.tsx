"use client"

import type { ComponentProps } from "react"
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
import { ArrowUpRight, BookOpen, CalendarDays, RefreshCw } from "lucide-react"

import { useAuth } from "@/components/auth-context"
import { InstrumentBadge } from "@/components/instrument-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiRequest } from "@/lib/api-client"

import { DashboardOverviewPolished } from "./dashboard-overview-polished"

type DashboardOverviewMobileProps = ComponentProps<typeof DashboardOverviewPolished>

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

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
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

const MOBILE_CARD =
  "gap-0 overflow-hidden rounded-[18px] border-white/10 bg-[#080808] py-0 shadow-none"

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

function prettySymbol(symbol: string) {
  const value = symbol.trim().toUpperCase()
  if (value.includes("/")) return value
  if (/^[A-Z]{6}$/.test(value)) return `${value.slice(0, 3)}/${value.slice(3)}`
  return value
}

function dashboardDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date())
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("year")}`
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

function StatDivider() {
  return <div className="h-px bg-white/10" />
}

export function DashboardOverviewMobile({
  account,
  stats,
  equity,
  monthCount,
  recentTrades,
  currentPnl,
  currentEquity,
  balancesHidden,
  formatTradePnl,
  onOpenTrade,
  onSeeAll,
  onAddTrade,
}: DashboardOverviewMobileProps) {
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

  useEffect(() => {
    setUsername(fallbackUsername)
    if (!user) return

    let active = true
    void apiRequest<{ profile?: { username?: string | null } }>("/api/profile")
      .then(({ profile }) => {
        if (active && profile?.username) setUsername(cleanUsername(profile.username))
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
    } catch {
      setNews([])
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
      ].sort((left, right) => right.trades - left.trades || right.pnl - left.pnl),
    [recentTrades],
  )

  const topInstrument = instrumentStats[0]
  const breakeven = Math.max(0, monthCount - stats.wins - stats.losses)
  const winRate = clamp(stats.rate)
  const formattedBalance = balancesHidden ? "******" : money.format(currentEquity)
  const formattedPnl = balancesHidden
    ? "******"
    : `${currentPnl >= 0 ? "+" : "-"}${money.format(Math.abs(currentPnl))}`

  return (
    <div className="w-full min-w-0 space-y-3 overflow-x-clip pb-24">
      <section className="px-1 pb-1 pt-2">
        <h1 className="break-words text-[clamp(1.65rem,7.4vw,2.15rem)] font-normal leading-[1.08] tracking-[-0.045em] text-white">
          Welcome back, {username}
        </h1>
        <p className="mt-2 text-[15px] font-semibold text-zinc-600">{dashboardDate()}</p>
      </section>

      <Card className={`${MOBILE_CARD} min-h-[480px]`}>
        <CardHeader className="relative border-b-0 px-4 pb-1 pt-5">
          <div className="min-w-0 pr-28">
            <CardDescription className="text-[15px] font-bold text-zinc-600">
              Account Balance
            </CardDescription>
            <CardTitle className="mt-1 break-words text-[clamp(2.25rem,12vw,3.15rem)] font-normal leading-none tracking-[-0.055em] text-white">
              {formattedBalance}
            </CardTitle>
            <p className="mt-3 text-[14px] font-bold text-zinc-600">Last 30 Days</p>
          </div>
          <div
            className={`absolute right-4 top-7 rounded-xl px-3.5 py-2 text-[15px] font-semibold tabular-nums ${
              currentPnl >= 0
                ? "bg-emerald-950/70 text-emerald-500"
                : "bg-rose-950/70 text-rose-400"
            }`}
          >
            {formattedPnl}
          </div>
        </CardHeader>

        <CardContent className="mt-auto h-[320px] min-h-0 px-0 pb-0 pt-4">
          {equity.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity} margin={{ left: 0, right: 0, top: 16, bottom: 8 }}>
                <defs>
                  <linearGradient id="tradoxMobileEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                    <stop offset="72%" stopColor="#22c55e" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.025)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={44}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "#52525b" }}
                  tickMargin={16}
                />
                <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
                <Tooltip
                  formatter={(value) => (balancesHidden ? "******" : money.format(Number(value)))}
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
                  strokeWidth={2}
                  fill="url(#tradoxMobileEquity)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#22c55e", stroke: "#050505", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="relative grid h-full place-items-center px-6 text-center">
              <div className="absolute inset-x-0 bottom-16 h-px bg-emerald-500/80" />
              <div>
                <p className="text-sm font-semibold text-zinc-300">No balance curve yet</p>
                <Button className="mt-3" size="sm" variant="outline" onClick={onAddTrade}>
                  Add first trade
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-2.5">
        <Card className={`${MOBILE_CARD} min-h-[206px]`}>
          <CardHeader className="px-3.5 pb-0 pt-4">
            <CardTitle className="text-[14px] font-bold leading-tight text-zinc-600">
              Most Traded Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-4">
            <p className="truncate text-[clamp(1.8rem,8vw,2.55rem)] font-normal leading-none tracking-[-0.04em] text-white">
              {topInstrument ? prettySymbol(topInstrument.symbol) : "N/A"}
            </p>
            <div className="mt-7 space-y-3">
              {Array.from({ length: 3 }, (_, index) => {
                const item = instrumentStats[index]
                return (
                  <div key={item?.symbol ?? index}>
                    <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                      <span className="min-w-0 truncate text-zinc-600">
                        {item ? prettySymbol(item.symbol) : "-"}
                      </span>
                      <span className="shrink-0 tabular-nums text-white">{item?.trades ?? "-"}</span>
                    </div>
                    <StatDivider />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className={`${MOBILE_CARD} min-h-[206px]`}>
          <CardHeader className="px-3.5 pb-0 pt-4">
            <CardTitle className="text-[14px] font-bold leading-tight text-zinc-600">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-4">
            <p className="text-[2.55rem] font-normal leading-none tracking-[-0.05em] text-white">
              {monthCount}
            </p>
            <div className="mt-7 space-y-3">
              {[
                ["Winning", stats.wins],
                ["Breakeven", breakeven],
                ["Losing", stats.losses],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                    <span className="truncate text-zinc-600">{label}</span>
                    <span className="shrink-0 tabular-nums text-white">{value}</span>
                  </div>
                  <StatDivider />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`${MOBILE_CARD} relative min-h-[190px]`}>
          <CardHeader className="relative z-10 px-3.5 pb-0 pt-4">
            <CardTitle className="text-[14px] font-bold leading-tight text-zinc-600">
              Trade Winrate
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 px-3.5 pb-3 pt-4">
            <p className="text-[2.35rem] font-normal leading-none tracking-[-0.05em] text-white">
              {Math.round(winRate)}%
            </p>
            <p className="mt-3 text-[12px] font-semibold text-zinc-600">
              {stats.wins}W / {stats.losses}L
            </p>
          </CardContent>
          <div
            className="absolute -bottom-9 -right-7 size-36 rounded-full p-[10px]"
            style={{
              background: `conic-gradient(#22c55e ${winRate * 3.6}deg, rgba(255,255,255,.08) 0deg)`,
            }}
            aria-hidden="true"
          >
            <div className="size-full rounded-full bg-[#080808]" />
          </div>
        </Card>

        <Card className={`${MOBILE_CARD} min-h-[190px]`}>
          <CardHeader className="px-3.5 pb-0 pt-4">
            <CardTitle className="text-[14px] font-bold leading-tight text-zinc-600">
              Profit Factor
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-4">
            <p className="text-[2.35rem] font-normal leading-none tracking-[-0.05em] text-white">
              {stats.pf.toFixed(2)}
            </p>
            <div className="mt-6 flex h-9 items-end gap-1">
              {Array.from({ length: 10 }, (_, index) => {
                const active = index < Math.round(clamp((stats.pf / 2) * 100) / 10)
                return (
                  <span
                    key={index}
                    className={`w-full rounded-sm ${active ? "bg-emerald-500" : "bg-white/8"}`}
                    style={{ height: `${35 + index * 6}%` }}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className={MOBILE_CARD}>
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/8 px-4 py-3.5">
          <div>
            <CardTitle className="text-[15px] font-bold text-white">Recent Trades</CardTitle>
            <CardDescription className="mt-0.5 text-[10px] text-zinc-600">
              Latest journal entries
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={onSeeAll} className="h-8 px-2.5 text-[11px]">
            See all <ArrowUpRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-2">
          {recentTrades.length ? (
            recentTrades.slice(0, 3).map((trade) => (
              <button
                key={trade.id}
                type="button"
                onClick={() => onOpenTrade(trade)}
                className="grid min-h-[54px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl px-2 text-left hover:bg-white/[.04]"
              >
                <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#111111]" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{trade.symbol}</p>
                  <p className="truncate text-[9px] text-zinc-600">
                    {trade.setup || trade.session || trade.rawDate}
                  </p>
                </div>
                <p
                  className={`text-[12px] font-bold tabular-nums ${
                    trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatTradePnl(trade.pnl)}
                </p>
              </button>
            ))
          ) : (
            <div className="grid min-h-32 place-items-center py-5 text-center">
              <div>
                <BookOpen className="mx-auto size-4 text-zinc-600" />
                <p className="mt-2 text-sm font-semibold text-zinc-300">No trades yet</p>
                <Button className="mt-3" size="sm" onClick={onAddTrade}>
                  Add first trade
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={MOBILE_CARD}>
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/8 px-4 py-3.5">
          <div>
            <CardTitle className="text-[15px] font-bold text-white">High Impact News</CardTitle>
            <CardDescription className="mt-0.5 text-[10px] text-zinc-600">
              Today's upcoming releases
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void loadNews()}
            disabled={newsLoading}
            aria-label="Refresh market news"
          >
            <RefreshCw className={`size-3.5 ${newsLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-2">
          {newsLoading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-white/[.04]" />
              ))}
            </div>
          ) : news.length ? (
            news.slice(0, 3).map((item) => {
              const date = eventDate(item.date)
              return (
                <article
                  key={item.id}
                  className="grid min-h-[54px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-white/8 px-1 last:border-0"
                >
                  <span className="grid h-8 min-w-11 place-items-center rounded-lg border border-white/10 bg-[#101010] px-2 text-[10px] font-bold text-zinc-200">
                    {eventCurrency(item)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-white">{item.event}</p>
                    <p className="truncate text-[9px] text-zinc-600">{item.country}</p>
                  </div>
                  <p className="text-[10px] font-semibold tabular-nums text-zinc-300">
                    {Number.isNaN(date.getTime())
                      ? "TBD"
                      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </article>
              )
            })
          ) : (
            <div className="grid min-h-32 place-items-center py-5 text-center">
              <div>
                <CalendarDays className="mx-auto size-4 text-zinc-600" />
                <p className="mt-2 text-sm font-semibold text-zinc-300">
                  No high-impact releases found
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
