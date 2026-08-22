"use client"

import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowUpRight, BookOpen, CalendarDays, RefreshCw, ShieldCheck } from "lucide-react"

import dynamic from "next/dynamic"

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

// Loaded after paint; the placeholder holds the chart's height so the card
// does not jump when it arrives.
const MobileEquityChart = dynamic(
  () => import("./mobile-equity-chart").then((m) => m.MobileEquityChart),
  { ssr: false, loading: () => <div className="h-full w-full" /> },
)

// Type-only. This used to be a value import of the (now deleted) polished
// dashboard, which dragged 866 unused lines into the mobile bundle just to
// read its props off a `ComponentProps` lookup.
import type { DashboardOverviewResponsive } from "./dashboard-overview-responsive"

type DashboardOverviewMobileProps = ComponentProps<typeof DashboardOverviewResponsive>

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
  "gap-0 overflow-hidden rounded-xl border-white/10 bg-surface py-0 shadow-none"

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
  stats,
  equity,
  weeklyStrip,
  setups,
  planRate,
  monthCount,
  recentTrades,
  activityEntries,
  openPositions,
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
        ...(activityEntries ?? recentTrades)
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
    [activityEntries, recentTrades],
  )

  const topInstrument = instrumentStats[0]
  const breakeven = Math.max(0, monthCount - stats.wins - stats.losses)
  const winRate = clamp(stats.rate)
  const formattedBalance = balancesHidden ? "******" : money.format(currentEquity)
  const formattedPnl = balancesHidden
    ? "******"
    : `${currentPnl >= 0 ? "+" : "-"}${money.format(Math.abs(currentPnl))}`
  const topSetup = setups[0]
  const focus =
    planRate < 70
      ? "Follow the plan before adding risk."
      : stats.pf < 1 && monthCount > 2
        ? "Protect downside and filter weaker entries."
        : "Stay patient and execute only A+ setups."

  return (
    <div className="w-full min-w-0 space-y-3 overflow-x-clip pb-24">
      <section className="px-0.5 pb-0.5 pt-1">
        <h1 className="truncate text-xl font-semibold leading-tight tracking-[-0.025em] text-white">
          Welcome back, {username}
        </h1>
        <p className="mt-1 text-[11px] font-medium text-ink-mute">{dashboardDate()}</p>
      </section>

      <div className="-mx-0.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2">
          {weeklyStrip.map((day) => (
            <div key={day.key} className="w-[104px] rounded-lg border border-white/8 bg-surface px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-semibold text-zinc-300">{day.label}</span>
                <span className={`text-[9px] font-semibold tabular-nums ${day.pnl > 0 ? "text-emerald-300" : day.pnl < 0 ? "text-rose-300" : "text-ink-mute"}`}>{day.trades}</span>
              </div>
              <p className={`mt-1 truncate text-[10px] font-bold tabular-nums ${day.pnl > 0 ? "text-emerald-300" : day.pnl < 0 ? "text-rose-300" : "text-ink-mute"}`}>{day.trades ? formatTradePnl(day.pnl) : "No trades"}</p>
            </div>
          ))}
        </div>
      </div>

      <Card className={MOBILE_CARD}>
        <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3">
          <span className="grid size-8 place-items-center rounded-lg bg-white/[.05] text-zinc-300"><ShieldCheck className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-mute">Today&apos;s focus</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-200">{focus}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold tabular-nums ${planRate >= 70 ? "text-emerald-300" : "text-amber-300"}`}>{Math.round(planRate)}%</p>
            <p className="text-[8px] text-ink-mute">{topSetup?.name || `${openPositions.length} open`}</p>
          </div>
        </CardContent>
      </Card>

      <Card className={`${MOBILE_CARD} min-h-[360px]`}>
        <CardHeader className="relative border-b-0 px-4 pb-1 pt-4">
          <div className="min-w-0 pr-24">
            <CardDescription className="text-xs font-semibold text-ink-mute">
              Account Balance
            </CardDescription>
            <CardTitle className="mt-1 break-words text-[clamp(1.75rem,9vw,2.35rem)] font-semibold leading-none tracking-[-0.04em] text-white">
              {formattedBalance}
            </CardTitle>
            <p className="mt-2 text-[11px] font-medium text-ink-mute">Last 30 days</p>
          </div>
          <div
            className={`absolute right-4 top-5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums ${
              currentPnl >= 0
                ? "bg-emerald-950/70 text-emerald-500"
                : "bg-rose-950/70 text-rose-300"
            }`}
          >
            {formattedPnl}
          </div>
        </CardHeader>

        <CardContent className="mt-auto h-[245px] min-h-0 px-0 pb-0 pt-3">
          {equity.length > 1 ? (
            <MobileEquityChart
              equity={equity}
              formatBalance={(value) => (balancesHidden ? "******" : money.format(value))}
            />
          ) : (
            <div className="relative grid h-full place-items-center px-6 text-center">
              <div className="absolute inset-x-0 bottom-16 h-px bg-emerald-500/80" />
              <div>
                <p className="text-sm font-semibold text-ink-strong">No balance curve yet</p>
                <Button className="mt-3" size="sm" variant="outline" onClick={onAddTrade}>
                  Add first trade
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-2.5">
        <Card className={`${MOBILE_CARD} min-h-[174px]`}>
          <CardHeader className="px-3.5 pb-0 pt-4">
            <CardTitle className="text-xs font-semibold leading-tight text-ink-mute">
              Most Traded Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-4">
            <p className="truncate text-[clamp(1.35rem,6vw,1.8rem)] font-semibold leading-none tracking-[-0.03em] text-white">
              {topInstrument ? prettySymbol(topInstrument.symbol) : "N/A"}
            </p>
            <div className="mt-5 space-y-2.5">
              {Array.from({ length: 3 }, (_, index) => {
                const item = instrumentStats[index]
                return (
                  <div key={item?.symbol ?? index}>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                      <span className="min-w-0 truncate text-ink-subtle">
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

        <Card className={`${MOBILE_CARD} min-h-[174px]`}>
          <CardHeader className="px-3.5 pb-0 pt-4">
            <CardTitle className="text-xs font-semibold leading-tight text-ink-mute">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-4">
            <p className="text-[1.8rem] font-semibold leading-none tracking-[-0.04em] text-white">
              {monthCount}
            </p>
            <div className="mt-5 space-y-2.5">
              {[
                ["Winning", stats.wins],
                ["Breakeven", breakeven],
                ["Losing", stats.losses],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                    <span className="truncate text-ink-subtle">{label}</span>
                    <span className="shrink-0 tabular-nums text-white">{value}</span>
                  </div>
                  <StatDivider />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`${MOBILE_CARD} relative min-h-[164px]`}>
          <CardHeader className="relative z-10 px-3.5 pb-0 pt-4">
            <CardTitle className="text-xs font-semibold leading-tight text-ink-mute">
              Trade Winrate
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 px-3.5 pb-3 pt-4">
            <p className="text-[1.8rem] font-semibold leading-none tracking-[-0.04em] text-white">
              {Math.round(winRate)}%
            </p>
            <p className="mt-3 text-[12px] font-semibold text-ink-subtle">
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
            <div className="size-full rounded-full bg-surface" />
          </div>
        </Card>

        <Card className={`${MOBILE_CARD} min-h-[164px]`}>
          <CardHeader className="px-3.5 pb-0 pt-4">
            <CardTitle className="text-xs font-semibold leading-tight text-ink-mute">
              Profit Factor
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-4">
            <p className="text-[1.8rem] font-semibold leading-none tracking-[-0.04em] text-white">
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
            <CardDescription className="mt-0.5 text-[10px] text-ink-subtle">
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
                <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-surface-raised" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{trade.symbol}</p>
                  <p className="truncate text-[10px] text-ink-subtle">
                    {trade.setup || trade.session || trade.rawDate}
                  </p>
                </div>
                <p
                  className={`text-[12px] font-bold tabular-nums ${
                    trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {formatTradePnl(trade.pnl)}
                </p>
              </button>
            ))
          ) : (
            <div className="grid min-h-32 place-items-center py-5 text-center">
              <div>
                <BookOpen className="mx-auto size-4 text-ink-subtle" />
                <p className="mt-2 text-sm font-semibold text-ink-strong">No trades yet</p>
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
            <CardDescription className="mt-0.5 text-[10px] text-ink-subtle">
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
                  <span className="grid h-8 min-w-11 place-items-center rounded-lg border border-white/10 bg-surface-raised px-2 text-[10px] font-bold text-zinc-200">
                    {eventCurrency(item)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-white">{item.event}</p>
                    <p className="truncate text-[10px] text-ink-subtle">{item.country}</p>
                  </div>
                  <p className="text-[10px] font-semibold tabular-nums text-ink-strong">
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
                <CalendarDays className="mx-auto size-4 text-ink-subtle" />
                <p className="mt-2 text-sm font-semibold text-ink-strong">
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
