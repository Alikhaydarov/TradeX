"use client"

import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { apiRequest } from "@/lib/api-client"
import { useActiveAccountStore } from "./active-account-context"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

type EntryRow = {
  id: string
  symbol: string
  side: "Long" | "Short"
  pnl: string | number
  result_r?: string | number | null
  traded_at: string
  setup?: string | null
}

type CalendarEntry = {
  id: string
  symbol: string
  side: "Long" | "Short"
  pnl: number
  resultR: number
  date: string
  setup: string
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

type CalendarMode = "journal" | "economic"

type RouteState = {
  mode: CalendarMode
  year: number
  month: number
  monthly: boolean
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

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
}

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
}

function currentRoute(): RouteState {
  const now = new Date()
  if (typeof window === "undefined") {
    return { mode: "journal", year: now.getFullYear(), month: now.getMonth(), monthly: false }
  }

  const economic = window.location.pathname.match(/^\/economic-calendar\/(\d{4})\/(\d{1,2})/)
  if (economic) {
    return {
      mode: "economic",
      year: Number(economic[1]),
      month: Math.min(11, Math.max(0, Number(economic[2]) - 1)),
      monthly: true,
    }
  }

  const journal = window.location.pathname.match(/^\/calendar\/(\d{4})\/(\d{1,2})/)
  if (journal) {
    return {
      mode: "journal",
      year: Number(journal[1]),
      month: Math.min(11, Math.max(0, Number(journal[2]) - 1)),
      monthly: true,
    }
  }

  return { mode: "journal", year: now.getFullYear(), month: now.getMonth(), monthly: false }
}

function navigate(path: string) {
  window.history.pushState(null, "", path)
  window.dispatchEvent(new Event("popstate"))
}

function monthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function monthBounds(year: number, month: number) {
  return {
    start: dateKey(year, month, 1),
    end: dateKey(year, month, new Date(year, month + 1, 0).getDate()),
  }
}

function monthCells(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const count = Math.ceil((offset + days) / 7) * 7
  return Array.from({ length: count }, (_, index) => {
    const day = index - offset + 1
    return day >= 1 && day <= days ? day : null
  })
}

function parsedEntryDate(value: string) {
  return new Date(value.length <= 10 ? `${value}T00:00:00` : value)
}

function eventLocalDate(event: MarketNewsEvent) {
  const hasZone = /z$|[+-]\d{2}:?\d{2}$/i.test(event.date)
  return new Date(hasZone ? event.date : `${event.date}Z`)
}

function eventCurrency(event: MarketNewsEvent) {
  return event.currency || countryCurrency[event.country.toLowerCase()] || "FX"
}

function eventFlag(event: MarketNewsEvent) {
  return countryFlags[event.country.toLowerCase()] || "🌐"
}

function tone(value: number) {
  if (value > 0) return "text-emerald-300"
  if (value < 0) return "text-rose-300"
  return "text-zinc-500"
}

function StatCard({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-h-[68px] rounded-xl border border-white/8 bg-[#101010] px-3 py-2.5">
      <p className="truncate text-[10px] font-semibold text-zinc-500">{label}</p>
      <p className={`mt-1.5 truncate text-base font-bold tabular-nums lg:text-lg ${valueClass}`}>{value}</p>
    </div>
  )
}

export function CalendarWorkspace() {
  const { accounts, activeAccountId, loading: accountsLoading } = useActiveAccountStore()
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null
  const [route, setRoute] = useState<RouteState>(currentRoute)
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [news, setNews] = useState<MarketNewsEvent[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsLimited, setNewsLimited] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    const sync = () => setRoute(currentRoute())
    window.addEventListener("popstate", sync)
    return () => window.removeEventListener("popstate", sync)
  }, [])

  useEffect(() => {
    if (!activeAccountId) {
      setEntries([])
      setEntriesLoading(false)
      return
    }

    let active = true
    setEntriesLoading(true)
    void apiRequest<{ entries: EntryRow[] }>(`/api/journal?accountId=${encodeURIComponent(activeAccountId)}`)
      .then((response) => {
        if (!active) return
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
        )
      })
      .catch(() => {
        if (active) setEntries([])
      })
      .finally(() => {
        if (active) setEntriesLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeAccountId])

  const loadNews = useCallback(async () => {
    if (route.mode !== "economic") return
    const { start, end } = monthBounds(route.year, route.month)
    setNewsLoading(true)
    try {
      const response = await apiRequest<MarketNewsResponse>(`/api/market-news?start=${start}&end=${end}`)
      setNews(response.events || [])
      setNewsLimited(Boolean(response.limited))
    } catch {
      setNews([])
      setNewsLimited(false)
    } finally {
      setNewsLoading(false)
    }
  }, [route.mode, route.month, route.year])

  useEffect(() => {
    void loadNews()
  }, [loadNews])

  const monthEntries = useMemo(
    () => entries.filter((entry) => {
      const date = parsedEntryDate(entry.date)
      return date.getFullYear() === route.year && date.getMonth() === route.month
    }),
    [entries, route.month, route.year],
  )

  const entriesByDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>()
    for (const entry of monthEntries) {
      const day = parsedEntryDate(entry.date).getDate()
      map.set(day, [...(map.get(day) || []), entry])
    }
    return map
  }, [monthEntries])

  const newsByDay = useMemo(() => {
    const map = new Map<number, MarketNewsEvent[]>()
    for (const event of news) {
      const date = eventLocalDate(event)
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== route.year || date.getMonth() !== route.month) continue
      map.set(date.getDate(), [...(map.get(date.getDate()) || []), event])
    }
    return map
  }, [news, route.month, route.year])

  const cells = useMemo(() => monthCells(route.year, route.month), [route.month, route.year])
  const weeks = useMemo(
    () => Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7)),
    [cells],
  )

  useEffect(() => {
    const now = new Date()
    const today = now.getFullYear() === route.year && now.getMonth() === route.month ? now.getDate() : null
    const firstDataDay = route.mode === "economic" ? [...newsByDay.keys()][0] : [...entriesByDay.keys()][0]
    setSelectedDay(today || firstDataDay || 1)
  }, [entriesByDay, newsByDay, route.mode, route.month, route.year])

  const monthPnl = monthEntries.reduce((sum, entry) => sum + entry.pnl, 0)
  const wins = monthEntries.filter((entry) => entry.pnl > 0).length
  const losses = monthEntries.filter((entry) => entry.pnl < 0).length
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0
  const tradingDays = new Set(monthEntries.map((entry) => entry.date.slice(0, 10))).size
  const realizedR = monthEntries.reduce((sum, entry) => sum + entry.resultR, 0)
  const mostTraded = [...monthEntries.reduce((map, entry) => map.set(entry.symbol, (map.get(entry.symbol) || 0) + 1), new Map<string, number>()).entries()]
    .sort((left, right) => right[1] - left[1])[0]?.[0] || "—"
  const monthReturn = activeAccount?.initialBalance ? (monthPnl / activeAccount.initialBalance) * 100 : 0

  const yearlyStats = useMemo(() => Array.from({ length: 12 }, (_, month) => {
    const selected = entries.filter((entry) => {
      const date = parsedEntryDate(entry.date)
      return date.getFullYear() === route.year && date.getMonth() === month
    })
    const pnl = selected.reduce((sum, entry) => sum + entry.pnl, 0)
    const monthWins = selected.filter((entry) => entry.pnl > 0).length
    const monthLosses = selected.filter((entry) => entry.pnl < 0).length
    return {
      month,
      trades: selected.length,
      pnl,
      winRate: monthWins + monthLosses ? Math.round((monthWins / (monthWins + monthLosses)) * 100) : 0,
    }
  }), [entries, route.year])

  const shiftMonth = (delta: number) => {
    const next = new Date(route.year, route.month + delta, 1)
    const base = route.mode === "economic" ? "/economic-calendar" : "/calendar"
    navigate(`${base}/${next.getFullYear()}/${next.getMonth() + 1}`)
  }

  const switchMode = (mode: CalendarMode) => {
    if (mode === "journal" && !route.monthly) return
    const base = mode === "economic" ? "/economic-calendar" : "/calendar"
    navigate(`${base}/${route.year}/${route.month + 1}`)
  }

  if (accountsLoading || entriesLoading) {
    return (
      <div className="mx-auto max-w-[1420px] space-y-3 p-3 sm:p-4 lg:p-5">
        <Skeleton className="mx-auto h-9 w-60 rounded-xl bg-white/[.05]" />
        <Skeleton className="h-[560px] rounded-2xl bg-white/[.05]" />
      </div>
    )
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
    )
  }

  return (
    <div className="mx-auto max-w-[1420px] space-y-2.5 p-3 sm:p-4 lg:p-4">
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
          stats={yearlyStats}
          onShift={(delta) => setRoute((current) => ({ ...current, year: current.year + delta }))}
          onOpen={(month) => navigate(`/calendar/${route.year}/${month + 1}`)}
        />
      ) : (
        <Card className="gap-0 overflow-hidden border-white/8 bg-[#070707] py-0 shadow-none">
          <CardHeader className="border-b border-white/8 px-3 py-3 sm:px-4">
            <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
              <div className="flex min-w-0 items-center gap-2.5">
                {route.mode === "journal" ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => navigate("/calendar")} aria-label="Back to yearly calendar"><ArrowLeft className="size-4" /></Button>
                ) : null}
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold text-white sm:text-base">{route.mode === "journal" ? "Monthly Performance" : "Economic Calendar"}</h1>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-500 sm:text-[11px]">{route.mode === "journal" ? "Select a day to view its trades" : newsLimited ? "High-impact releases · limited live feed" : "High-impact releases for major markets"}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
                <strong className="min-w-28 text-center text-sm text-white sm:min-w-32 sm:text-base">{monthName(route.year, route.month)}</strong>
                <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
              </div>

              <div className="hidden justify-end md:flex">
                {route.mode === "economic" ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => void loadNews()} disabled={newsLoading} aria-label="Refresh economic calendar"><RefreshCw className={`size-4 ${newsLoading ? "animate-spin" : ""}`} /></Button>
                ) : <span className="truncate text-[10px] text-zinc-600">{activeAccount.name}</span>}
              </div>
            </div>
          </CardHeader>

          {route.mode === "journal" ? (
            <JournalMonth
              year={route.year}
              month={route.month}
              weeks={weeks}
              entriesByDay={entriesByDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              stats={{ total: monthEntries.length, tradingDays, realizedR, mostTraded, winRate, pnl: monthPnl, monthReturn }}
            />
          ) : (
            <EconomicMonth
              year={route.year}
              month={route.month}
              weeks={weeks}
              newsByDay={newsByDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              loading={newsLoading}
            />
          )}
        </Card>
      )}
    </div>
  )
}

function YearOverview({
  year,
  accountName,
  stats,
  onShift,
  onOpen,
}: {
  year: number
  accountName: string
  stats: Array<{ month: number; trades: number; pnl: number; winRate: number }>
  onShift: (delta: number) => void
  onOpen: (month: number) => void
}) {
  const totalPnl = stats.reduce((sum, item) => sum + item.pnl, 0)
  const totalTrades = stats.reduce((sum, item) => sum + item.trades, 0)
  const activeMonths = stats.filter((item) => item.trades).length
  const best = stats.filter((item) => item.trades).sort((a, b) => b.pnl - a.pnl)[0]

  return (
    <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
      <CardHeader className="border-b border-white/8 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-base font-bold text-white">Yearly Performance</h1><p className="mt-0.5 text-xs text-zinc-500">{accountName} · choose a month to open its journal</p></div>
          <div className="flex items-center gap-1.5"><Button variant="ghost" size="icon-sm" onClick={() => onShift(-1)}><ChevronLeft className="size-4" /></Button><strong className="min-w-16 text-center text-sm">{year}</strong><Button variant="ghost" size="icon-sm" onClick={() => onShift(1)}><ChevronRight className="size-4" /></Button></div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Net P&L" value={cash.format(totalPnl)} valueClass={tone(totalPnl)} />
          <StatCard label="Total trades" value={String(totalTrades)} />
          <StatCard label="Active months" value={String(activeMonths)} />
          <StatCard label="Best month" value={best ? new Date(year, best.month, 1).toLocaleDateString("en-US", { month: "short" }) : "—"} />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {stats.map((item) => (
            <button key={item.month} type="button" onClick={() => onOpen(item.month)} className={`min-h-24 rounded-xl border p-3 text-left transition hover:border-white/20 hover:bg-white/[.035] ${item.trades ? item.pnl >= 0 ? "border-emerald-400/15 bg-emerald-400/[.035]" : "border-rose-400/15 bg-rose-400/[.035]" : "border-white/8 bg-[#0b0b0b]"}`}>
              <div className="flex items-center justify-between"><strong className="text-sm text-white">{new Date(year, item.month, 1).toLocaleDateString("en-US", { month: "short" })}</strong><span className="text-[10px] text-zinc-600">{item.trades}T</span></div>
              <p className={`mt-5 text-sm font-bold tabular-nums ${tone(item.pnl)}`}>{item.trades ? cash.format(item.pnl) : "—"}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{item.trades ? `${item.winRate}% win rate` : "No trades"}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function JournalMonth({
  year,
  month,
  weeks,
  entriesByDay,
  selectedDay,
  onSelectDay,
  stats,
}: {
  year: number
  month: number
  weeks: Array<Array<number | null>>
  entriesByDay: Map<number, CalendarEntry[]>
  selectedDay: number | null
  onSelectDay: (day: number) => void
  stats: { total: number; tradingDays: number; realizedR: number; mostTraded: string; winRate: number; pnl: number; monthReturn: number }
}) {
  const selected = selectedDay ? entriesByDay.get(selectedDay) || [] : []

  return (
    <CardContent className="p-2.5 sm:p-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total trades" value={String(stats.total)} />
        <StatCard label="Trading days" value={String(stats.tradingDays)} />
        <StatCard label="Realized RR" value={stats.total ? `${stats.realizedR.toFixed(2)}R` : "—"} />
        <StatCard label="Most traded asset" value={stats.mostTraded} />
        <StatCard label="Trade winrate" value={`${stats.winRate}%`} />
        <StatCard label="Month P&L" value={`${stats.monthReturn >= 0 ? "+" : ""}${stats.monthReturn.toFixed(2)}%`} valueClass={tone(stats.pnl)} />
      </div>

      <div className="mt-2.5 hidden md:block">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_96px] gap-1.5">
          {WEEKDAYS.map((day, index) => <div key={day} className={`rounded-lg border border-white/8 bg-black px-2 py-1.5 text-center text-[11px] font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-300"}`}>{day}</div>)}
          <div className="rounded-lg border border-white/8 bg-black px-2 py-1.5 text-center text-[11px] font-semibold text-zinc-300">Week</div>
          {weeks.map((week, weekIndex) => {
            const weekTrades = week.flatMap((day) => day ? entriesByDay.get(day) || [] : [])
            const weekPnl = weekTrades.reduce((sum, entry) => sum + entry.pnl, 0)
            return [
              ...week.map((day, dayIndex) => (
                <JournalDayCell
                  key={`${weekIndex}-${dayIndex}`}
                  day={day}
                  weekend={dayIndex >= 5}
                  entries={day ? entriesByDay.get(day) || [] : []}
                  active={day === selectedDay}
                  onSelect={onSelectDay}
                />
              )),
              <div key={`summary-${weekIndex}`} className="grid h-[78px] place-items-center rounded-xl border border-white/8 bg-black p-1.5 text-center xl:h-[82px]"><div><p className={`text-xs font-bold tabular-nums ${tone(weekPnl)}`}>{weekTrades.length ? cash.format(weekPnl) : "0%"}</p><p className="mt-0.5 text-[9px] text-zinc-600">{weekTrades.length} trades</p></div></div>,
            ]
          })}
        </div>
      </div>

      <MobileCalendar
        year={year}
        month={month}
        weeks={weeks}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        getCount={(day) => entriesByDay.get(day)?.length || 0}
        getTone={(day) => (entriesByDay.get(day) || []).reduce((sum, entry) => sum + entry.pnl, 0)}
      />

      <div className="mt-3 md:hidden">
        <SelectedJournalDay year={year} month={month} day={selectedDay} entries={selected} />
      </div>
    </CardContent>
  )
}

function JournalDayCell({
  day,
  entries,
  weekend,
  active,
  onSelect,
}: {
  day: number | null
  entries: CalendarEntry[]
  weekend: boolean
  active: boolean
  onSelect: (day: number) => void
}) {
  if (!day) return <div className="h-[78px] rounded-xl border border-transparent xl:h-[82px]" />
  const pnl = entries.reduce((sum, entry) => sum + entry.pnl, 0)
  return (
    <button type="button" onClick={() => onSelect(day)} className={`h-[78px] overflow-hidden rounded-xl border p-2 text-left transition xl:h-[82px] ${active ? "ring-1 ring-white/20" : ""} ${entries.length ? pnl >= 0 ? "border-emerald-400/15 bg-emerald-400/[.025]" : "border-rose-400/15 bg-rose-400/[.025]" : "border-white/8 bg-[#0a0a0a] hover:border-white/14"}`}>
      <div className="flex items-center justify-between"><span className={`text-[11px] font-semibold ${weekend ? "text-zinc-600" : "text-zinc-300"}`}>{day}</span>{entries.length ? <span className="text-[8px] text-zinc-600">{entries.length}T</span> : null}</div>
      {entries.length ? <><p className={`mt-3 truncate text-xs font-bold tabular-nums ${tone(pnl)}`}>{cash.format(pnl)}</p><p className="mt-0.5 truncate text-[9px] text-zinc-600">{[...new Set(entries.map((entry) => entry.symbol))].slice(0, 2).join(" · ")}</p></> : null}
    </button>
  )
}

function EconomicMonth({
  year,
  month,
  weeks,
  newsByDay,
  selectedDay,
  onSelectDay,
  loading,
}: {
  year: number
  month: number
  weeks: Array<Array<number | null>>
  newsByDay: Map<number, MarketNewsEvent[]>
  selectedDay: number | null
  onSelectDay: (day: number) => void
  loading: boolean
}) {
  const selected = selectedDay ? newsByDay.get(selectedDay) || [] : []
  return (
    <CardContent className="p-2.5 sm:p-3">
      {loading ? <Skeleton className="h-[500px] rounded-xl bg-white/[.04]" /> : (
        <>
          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day, index) => <div key={day} className={`rounded-lg border border-white/8 bg-black px-2 py-1.5 text-center text-[11px] font-semibold ${index >= 5 ? "text-zinc-600" : "text-zinc-300"}`}>{day}</div>)}
              {weeks.flatMap((week, weekIndex) => week.map((day, dayIndex) => (
                <EconomicDayCell
                  key={`${weekIndex}-${dayIndex}`}
                  day={day}
                  weekend={dayIndex >= 5}
                  events={day ? newsByDay.get(day) || [] : []}
                  active={day === selectedDay}
                  onSelect={onSelectDay}
                />
              )))}
            </div>
          </div>

          <MobileCalendar
            year={year}
            month={month}
            weeks={weeks}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
            getCount={(day) => newsByDay.get(day)?.length || 0}
            getTone={() => 1}
          />

          <div className="mt-3 md:hidden">
            <SelectedNewsDay year={year} month={month} day={selectedDay} events={selected} />
          </div>
        </>
      )}
    </CardContent>
  )
}

function EconomicDayCell({
  day,
  events,
  weekend,
  active,
  onSelect,
}: {
  day: number | null
  events: MarketNewsEvent[]
  weekend: boolean
  active: boolean
  onSelect: (day: number) => void
}) {
  if (!day) return <div className="h-[94px] rounded-xl border border-transparent xl:h-[100px]" />
  return (
    <button type="button" onClick={() => onSelect(day)} className={`h-[94px] overflow-hidden rounded-xl border bg-[#0a0a0a] p-1.5 text-left transition xl:h-[100px] ${active ? "border-white/18 ring-1 ring-white/15" : "border-white/8 hover:border-white/14"}`}>
      <div className="flex items-center justify-end"><span className={`text-[10px] font-semibold ${weekend ? "text-zinc-600" : "text-zinc-300"}`}>{day}</span></div>
      <div className="mt-1 space-y-1">
        {events.slice(0, 2).map((event) => {
          const date = eventLocalDate(event)
          return <div key={event.id} className="rounded-md border border-white/8 bg-[#101010] px-1.5 py-1"><p className="truncate text-[9px] font-semibold text-white">{event.event}</p><div className="mt-0.5 flex items-center justify-between gap-1 text-[8px]"><span className="truncate text-zinc-500">{eventFlag(event)} {eventCurrency(event)}</span><span className="shrink-0 tabular-nums text-zinc-300">{Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div></div>
        })}
        {events.length > 2 ? <p className="px-1 text-[8px] text-zinc-600">+{events.length - 2} more</p> : null}
      </div>
    </button>
  )
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
  year: number
  month: number
  weeks: Array<Array<number | null>>
  selectedDay: number | null
  onSelectDay: (day: number) => void
  getCount: (day: number) => number
  getTone: (day: number) => number
}) {
  const today = new Date()
  return (
    <div className="mt-3 md:hidden">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => <div key={day} className="py-1 text-center text-[9px] font-semibold text-zinc-600">{day.slice(0, 1)}</div>)}
        {weeks.flat().map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="aspect-square" />
          const count = getCount(day)
          const value = getTone(day)
          const active = selectedDay === day
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          return <button key={day} type="button" onClick={() => onSelectDay(day)} className={`relative grid aspect-square place-items-center rounded-lg border text-xs font-semibold transition ${active ? "border-white/30 bg-white/[.10] text-white" : "border-white/7 bg-[#0a0a0a] text-zinc-400"} ${isToday ? "ring-1 ring-emerald-400/60" : ""}`}><span>{day}</span>{count ? <span className={`absolute bottom-1 size-1.5 rounded-full ${value < 0 ? "bg-rose-400" : "bg-emerald-400"}`} /> : null}</button>
        })}
      </div>
    </div>
  )
}

function SelectedJournalDay({ year, month, day, entries }: { year: number; month: number; day: number | null; entries: CalendarEntry[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0a0a] p-3">
      <p className="text-xs font-semibold text-white">{day ? new Date(year, month, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Select a day"}</p>
      <div className="mt-3 space-y-2">
        {entries.length ? entries.map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-[#101010] px-3 py-2.5"><span className={`grid size-8 place-items-center rounded-lg ${entry.side === "Long" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{entry.side === "Long" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{entry.symbol}</p><p className="mt-0.5 truncate text-[10px] text-zinc-600">{entry.setup || entry.side}</p></div><p className={`text-xs font-bold tabular-nums ${tone(entry.pnl)}`}>{cash.format(entry.pnl)}</p></div>) : <p className="py-5 text-center text-xs text-zinc-600">No trades on this day.</p>}
      </div>
    </div>
  )
}

function SelectedNewsDay({ year, month, day, events }: { year: number; month: number; day: number | null; events: MarketNewsEvent[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0a0a] p-3">
      <p className="text-xs font-semibold text-white">{day ? new Date(year, month, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Select a day"}</p>
      <div className="mt-3 space-y-2">
        {events.length ? events.map((event) => {
          const date = eventLocalDate(event)
          return <div key={event.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-[#101010] px-3 py-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black text-sm">{eventFlag(event)}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-5 text-white">{event.event}</p><p className="mt-0.5 text-[10px] text-zinc-600">{eventCurrency(event)} · Forecast {event.forecast || "—"} · Previous {event.previous || "—"}</p></div><div className="shrink-0 text-right"><p className="text-[10px] font-semibold tabular-nums text-zinc-300">{Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p><p className="mt-1 text-[9px] text-rose-300">★★★</p></div></div>
        }) : <p className="py-5 text-center text-xs text-zinc-600">No high-impact news on this day.</p>}
      </div>
    </div>
  )
}
