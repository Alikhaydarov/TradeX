"use client"

import { CalendarRange, ChevronLeft, ChevronRight, Images, List, Plus, Search, SlidersHorizontal } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { InstrumentBadge } from "@/components/instrument-badge"
import { MediaImage } from "@/components/media-image"
import type { JournalEntry } from "@/components/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type TradeRange = "daily" | "monthly" | "quarter" | "yearly" | "custom"
type TradeView = "list" | "gallery" | "weekly"
type TradeSort = "entryDate" | "exitDate"

interface TradesArchiveProps {
  trades: JournalEntry[]
  query: string
  range: TradeRange
  customStart: string
  customEnd: string
  sort: TradeSort
  winRate: number
  averageR: number
  formatPnl: (amount: number) => string
  onQueryChange: (value: string) => void
  onRangeChange: (value: TradeRange) => void
  onCustomStartChange: (value: string) => void
  onCustomEndChange: (value: string) => void
  onSortChange: (value: TradeSort) => void
  onOpenTrade: (trade: JournalEntry) => void
  onAddTrade: () => void
}

const PAGE_SIZE = 20

function formatDate(rawDate?: string) {
  if (!rawDate) return "—"
  return new Date(`${rawDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function monthLabel(rawDate?: string) {
  if (!rawDate) return "No month"
  return new Date(`${rawDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function groupByMonth(trades: JournalEntry[]) {
  const groups = new Map<string, { label: string; trades: JournalEntry[] }>()
  for (const trade of trades) {
    const key = trade.rawDate?.slice(0, 7) || "unknown"
    const group = groups.get(key)
    if (group) group.trades.push(trade)
    else groups.set(key, { label: monthLabel(trade.rawDate), trades: [trade] })
  }
  return [...groups.entries()].map(([key, value]) => ({ key, ...value }))
}

function currentWeekGroups(trades: JournalEntry[]) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const key = day.toISOString().slice(0, 10)
    return {
      key,
      label: day.toLocaleDateString("en-US", { weekday: "long" }),
      dateLabel: day.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }),
      trades: trades.filter((trade) => trade.rawDate === key),
    }
  }).filter((group) => group.trades.length)
}

function TradeGalleryCard({ trade, formatPnl, onOpen }: { trade: JournalEntry; formatPnl: (amount: number) => string; onOpen: () => void }) {
  const screenshotCount = trade.imageUrls?.length ?? (trade.imageUrl ? 1 : 0)
  return (
    <button type="button" onClick={onOpen} className="group overflow-hidden rounded-xl border border-white/8 bg-[#080808] text-left transition hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      {trade.imageUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-[#101010]">
          <MediaImage src={trade.imageUrl} alt={`${trade.symbol} trade screenshot`} className="h-full w-full object-contain p-2 transition-transform group-hover:scale-[1.015]" />
          {screenshotCount > 1 ? <span className="absolute right-2 top-2 rounded-md bg-black/80 px-2 py-1 text-[9px] font-semibold text-zinc-300">{screenshotCount} images</span> : null}
        </div>
      ) : null}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-zinc-500">{formatDate(trade.rawDate)}</p></div>
          <p className={`font-mono text-sm font-semibold ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPnl(trade.pnl)}</p>
        </div>
        <p className="mt-3 truncate text-xs text-zinc-400">{trade.setup || trade.session || "No setup tagged"}</p>
      </div>
    </button>
  )
}

function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex flex-col gap-2 border-t border-white/8 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-zinc-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft className="size-3.5" /> Previous</Button>
        <span className="min-w-14 text-center text-xs text-zinc-400">{page + 1} / {pages}</span>
        <Button type="button" variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next <ChevronRight className="size-3.5" /></Button>
      </div>
    </div>
  )
}

export function TradesArchive({
  trades, query, range, customStart, customEnd, sort, winRate, averageR, formatPnl,
  onQueryChange, onRangeChange, onCustomStartChange, onCustomEndChange, onSortChange, onOpenTrade, onAddTrade,
}: TradesArchiveProps) {
  const [view, setView] = useState<TradeView>("list")
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))
  const pagedTrades = useMemo(() => trades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [page, trades])
  const galleryGroups = useMemo(() => groupByMonth(pagedTrades), [pagedTrades])
  const weekGroups = useMemo(() => currentWeekGroups(trades), [trades])
  const bestTrade = useMemo(() => trades.reduce<JournalEntry | null>((best, trade) => !best || trade.pnl > best.pnl ? trade : best, null), [trades])

  useEffect(() => setPage(0), [query, range, customStart, customEnd, sort])
  useEffect(() => { if (page >= pages) setPage(Math.max(0, pages - 1)) }, [page, pages])

  const rangeNote = range === "daily" ? "Today" : range === "monthly" ? "Current month" : range === "quarter" ? "Last 3 months" : range === "yearly" ? "Current year" : "Custom dates"

  return (
    <Card className="gap-0 bg-[#070707] shadow-none">
      <CardHeader className="gap-4 border-b border-white/8 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle className="text-base">Trade journal</CardTitle><CardDescription>Review execution, filter results and open a trade for details.</CardDescription></div>
          <Button type="button" size="sm" onClick={onAddTrade} className="w-full bg-white text-black hover:bg-zinc-200 sm:w-auto"><Plus className="size-4" /> Add trade</Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_170px_160px]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} className="h-10 pl-9" placeholder="Search symbol, setup or note" autoCapitalize="none" autoCorrect="off" />
          </div>
          <Select value={range} onValueChange={(value) => onRangeChange(value as TradeRange)}><SelectTrigger className="h-10 w-full"><CalendarRange className="size-4 text-zinc-500" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Today</SelectItem><SelectItem value="monthly">This month</SelectItem><SelectItem value="quarter">Last 3 months</SelectItem><SelectItem value="yearly">This year</SelectItem><SelectItem value="custom">Custom range</SelectItem></SelectContent></Select>
          <Select value={sort} onValueChange={(value) => onSortChange(value as TradeSort)}><SelectTrigger className="h-10 w-full"><SlidersHorizontal className="size-4 text-zinc-500" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entryDate">Oldest first</SelectItem><SelectItem value="exitDate">Newest first</SelectItem></SelectContent></Select>
        </div>

        {range === "custom" ? (
          <div className="grid gap-2 sm:max-w-md sm:grid-cols-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">From<Input type="date" value={customStart} max={customEnd} onChange={(event) => onCustomStartChange(event.target.value)} className="mt-1.5 h-10 text-sm" /></label>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">To<Input type="date" value={customEnd} min={customStart} onChange={(event) => onCustomEndChange(event.target.value)} className="mt-1.5 h-10 text-sm" /></label>
          </div>
        ) : <p className="text-[11px] text-zinc-600">{rangeNote}</p>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[{ label: "Trades", value: String(trades.length) }, { label: "Win rate", value: `${winRate}%` }, { label: "Best trade", value: bestTrade ? formatPnl(bestTrade.pnl) : "—" }, { label: "Average R", value: `${averageR.toFixed(2)}R` }].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/8 bg-white/[.02] px-3 py-2"><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{item.label}</p><p className="mt-1 truncate font-mono text-sm font-semibold text-zinc-200">{item.value}</p></div>
          ))}
        </div>

        <Tabs value={view} onValueChange={(value) => { setView(value as TradeView); setPage(0) }}>
          <TabsList className="grid w-full grid-cols-3 bg-[#0b0b0b] sm:w-fit">
            <TabsTrigger value="list"><List /> Trades</TabsTrigger><TabsTrigger value="gallery"><Images /> Gallery</TabsTrigger><TabsTrigger value="weekly"><CalendarRange /> Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0">
        {!trades.length ? (
          <Empty className="m-3 min-h-64"><EmptyMedia><List className="size-4" /></EmptyMedia><EmptyHeader><EmptyTitle>No trades in this range</EmptyTitle><EmptyDescription>Change the filter or add a closed trade to start the review.</EmptyDescription></EmptyHeader><EmptyContent><Button size="sm" onClick={onAddTrade}>Add trade</Button></EmptyContent></Empty>
        ) : view === "list" ? (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Date</TableHead><TableHead>Instrument</TableHead><TableHead>Side</TableHead><TableHead>Setup / session</TableHead><TableHead>R</TableHead><TableHead className="text-right">P&amp;L</TableHead></TableRow></TableHeader>
                <TableBody>{pagedTrades.map((trade) => (
                  <TableRow key={trade.id} tabIndex={0} role="button" onClick={() => onOpenTrade(trade)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenTrade(trade) } }} className="cursor-pointer">
                    <TableCell><p className="font-medium text-zinc-200">{formatDate(trade.rawDate)}</p><p className="mt-0.5 max-w-52 truncate text-[11px] text-zinc-600">{trade.note || "Open review"}</p></TableCell>
                    <TableCell><InstrumentBadge symbol={trade.symbol} compact className="bg-[#121212]" /></TableCell>
                    <TableCell><span className={`text-xs font-semibold ${trade.side === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span></TableCell>
                    <TableCell className="max-w-56 truncate text-zinc-400">{trade.setup || trade.session || "—"}</TableCell>
                    <TableCell className="font-mono text-zinc-400">{(trade.resultR || 0).toFixed(2)}R</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPnl(trade.pnl)}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <div className="divide-y divide-white/8 sm:hidden">{pagedTrades.map((trade) => (
              <button key={trade.id} type="button" onClick={() => onOpenTrade(trade)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/[.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25">
                <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
                <div className="min-w-0 flex-1"><span className={`text-[10px] font-semibold ${trade.side === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span><p className="mt-1 truncate text-[11px] text-zinc-500">{formatDate(trade.rawDate)} · {trade.setup || trade.session || "No setup"}</p></div>
                <div className="text-right"><p className={`font-mono text-sm font-semibold ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPnl(trade.pnl)}</p><p className="mt-1 text-[10px] text-zinc-600">{(trade.resultR || 0).toFixed(2)}R</p></div>
              </button>
            ))}</div>
            <div className="hidden gap-2 p-3 sm:grid sm:grid-cols-2 lg:hidden">{pagedTrades.map((trade) => (
              <button key={trade.id} type="button" onClick={() => onOpenTrade(trade)} className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-[#0a0a0a] px-3 py-3 text-left transition hover:border-white/15 hover:bg-white/[.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
                <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
                <div className="min-w-0 flex-1"><span className={`text-[10px] font-semibold ${trade.side === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span><p className="mt-1 truncate text-[11px] text-zinc-500">{formatDate(trade.rawDate)} · {trade.setup || trade.session || "No setup"}</p></div>
                <div className="text-right"><p className={`font-mono text-sm font-semibold ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPnl(trade.pnl)}</p><p className="mt-1 text-[10px] text-zinc-600">{(trade.resultR || 0).toFixed(2)}R</p></div>
              </button>
            ))}</div>
            <Pagination page={page} pages={pages} total={trades.length} onPage={setPage} />
          </>
        ) : view === "gallery" ? (
          <><div className="space-y-5 p-3 sm:p-4">{galleryGroups.map((group) => <section key={group.key}><div className="mb-3 flex items-center gap-2"><h3 className="text-sm font-semibold text-white">{group.label}</h3><span className="text-xs text-zinc-600">{group.trades.length}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{group.trades.map((trade) => <TradeGalleryCard key={trade.id} trade={trade} formatPnl={formatPnl} onOpen={() => onOpenTrade(trade)} />)}</div></section>)}</div><Pagination page={page} pages={pages} total={trades.length} onPage={setPage} /></>
        ) : weekGroups.length ? (
          <div className="space-y-5 p-3 sm:p-4">{weekGroups.map((group) => <section key={group.key}><div className="mb-3 flex items-baseline gap-2"><h3 className="text-sm font-semibold text-white">{group.label}</h3><span className="text-xs text-zinc-600">{group.dateLabel} · {group.trades.length} trades</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{group.trades.map((trade) => <TradeGalleryCard key={trade.id} trade={trade} formatPnl={formatPnl} onOpen={() => onOpenTrade(trade)} />)}</div></section>)}</div>
        ) : (
          <Empty className="m-3 min-h-64"><EmptyMedia><CalendarRange className="size-4" /></EmptyMedia><EmptyHeader><EmptyTitle>No trades this week</EmptyTitle><EmptyDescription>Weekly review will appear after the first closed trade.</EmptyDescription></EmptyHeader></Empty>
        )}
      </CardContent>
    </Card>
  )
}
