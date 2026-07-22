"use client"

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import CircularProgress from "@mui/material/CircularProgress"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { InstrumentBadge } from "@/components/instrument-badge"
import type { JournalEntry, OpenPosition, PropAccount } from "@/components/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"


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

type SetupStat = { name: string; pnl: number; trades: number; wins: number; rate: number }
type MistakeStat = { name: string; pnl: number; trades: number }

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

function clamp(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
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
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-black tracking-tight text-white sm:text-base">{title}</h2>
        <p className="mt-0.5 text-[11px] text-zinc-600 sm:text-xs">{description}</p>
      </div>
      {action}
    </div>
  )
}

function MetricRing({ value, label }: { value: number; label: string }) {
  const bounded = clamp(value)
  return (
    <div className="relative grid size-[92px] shrink-0 place-items-center sm:size-[104px]">
      <CircularProgress
        variant="determinate"
        value={100}
        size="100%"
        thickness={3.6}
        sx={{ color: "rgba(255,255,255,.08)", position: "absolute" }}
      />
      <CircularProgress
        variant="determinate"
        value={bounded}
        size="100%"
        thickness={3.6}
        sx={{
          color: bounded >= 50 ? "#34d399" : "#f59e0b",
          position: "absolute",
          transform: "rotate(-90deg) !important",
          "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
        }}
      />
      <div className="text-center">
        <p className="font-mono text-xl font-black text-white">{Math.round(bounded)}%</p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</p>
      </div>
    </div>
  )
}

function ProgressLine({ label, value, risk = false }: { label: string; value: number; risk?: boolean }) {
  const bounded = clamp(value)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
        <span className="text-zinc-500">{label}</span>
        <span className="font-mono font-bold text-zinc-300">{bounded.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${risk ? (bounded >= 70 ? "bg-rose-400" : "bg-amber-400") : "bg-emerald-400"}`}
          style={{ width: `${bounded}%` }}
        />
      </div>
    </div>
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
  openPositions,
  currentPnl,
  currentEquity,
  targetProgress,
  drawdownUsed,
  balancesHidden,
  formatTradePnl,
  onOpenTrade,
  onSeeAll,
  onAddTrade,
}: DashboardOverviewProps) {
  const formatBalance = (value: number) => (balancesHidden ? "******" : money.format(value))
  const breakeven = Math.max(0, monthCount - stats.wins - stats.losses)
  const topSetup = setups[0] ?? null
  const topMistake = mistakes[0] ?? null
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date())

  const instrumentStats = [
    ...recentTrades
      .reduce((map, trade) => {
        const current = map.get(trade.symbol) ?? { symbol: trade.symbol, trades: 0, pnl: 0 }
        current.trades += 1
        current.pnl += trade.pnl
        map.set(trade.symbol, current)
        return map
      }, new Map<string, { symbol: string; trades: number; pnl: number }>())
      .values(),
  ].sort((left, right) => right.trades - left.trades || right.pnl - left.pnl)

  const profitSegments = 24
  const positiveSegments = stats.pf > 0
    ? Math.min(profitSegments, Math.max(1, Math.round((stats.pf / (stats.pf + 1)) * profitSegments)))
    : 0

  const aiHeadline = topMistake
    ? `Protect execution: reduce “${topMistake.name}”.`
    : topSetup
      ? `Your strongest edge is ${topSetup.name}.`
      : "Build your edge with reviewed trades."

  const aiDetail = topMistake
    ? `${topMistake.trades} trades carried this mistake and produced ${formatTradePnl(topMistake.pnl)}.`
    : topSetup
      ? `${topSetup.trades} trades, ${topSetup.rate}% win rate and ${formatTradePnl(topSetup.pnl)} net result.`
      : "Add setup, session and review details so Tradox can surface a reliable execution pattern."

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="flex flex-col gap-3 px-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">{account.name} / intelligence</p>
          <h1 className="mt-1 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">Welcome back</h1>
          <p className="mt-1 text-xs text-zinc-500">{todayLabel} · performance, risk and execution in one view.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-white/8 bg-[#080808] px-3 py-2 sm:self-auto">
          <span className={`size-2 rounded-full ${account.status === "Active" ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="text-[11px] font-semibold text-zinc-300">{account.status}</span>
          <span className="text-zinc-700">/</span>
          <span className="text-[11px] text-zinc-500">{account.marketType}</span>
        </div>
      </section>

      <Card className="gap-0 overflow-hidden border-white/8 bg-[#070707] py-0 shadow-none">
        <CardHeader className="border-b border-white/8 px-3 py-3 sm:px-4">
          <SectionHeader
            title="Current week"
            description={`${weeklyStrip.reduce((sum, day) => sum + day.trades, 0)} closed trades across the active week`}
            action={<span className="rounded-lg border border-white/8 bg-black px-2.5 py-1 text-[10px] font-bold text-zinc-500">7 days</span>}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto p-2.5 sm:p-3">
          <div className="grid auto-cols-[minmax(122px,1fr)] grid-flow-col gap-2 lg:grid-flow-row lg:grid-cols-7">
            {weeklyStrip.map((day) => {
              const positive = day.pnl > 0
              const negative = day.pnl < 0
              return (
                <article key={day.key} className="min-h-[82px] rounded-xl border border-white/8 bg-[#0b0b0b] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-zinc-300">{day.label}</p>
                    <span className={`font-mono text-[10px] font-bold ${positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-zinc-600"}`}>
                      {day.percent > 0 ? "+" : ""}{day.percent.toFixed(2)}%
                    </span>
                  </div>
                  <p className={`mt-3 font-mono text-sm font-black ${positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-zinc-600"}`}>
                    {day.trades ? formatTradePnl(day.pnl) : "—"}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">{day.trades} trade{day.trades === 1 ? "" : "s"}</p>
                </article>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 xl:grid-cols-12">
        <Card className="gap-0 overflow-hidden border-white/8 bg-[#070707] shadow-none xl:col-span-7">
          <CardHeader className="border-b border-white/8 px-4 py-3.5 sm:grid-cols-[1fr_auto]">
            <div>
              <CardDescription className="text-[10px] font-bold uppercase tracking-[0.16em]">Account balance</CardDescription>
              <CardTitle className="mt-1 font-mono text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{formatBalance(currentEquity)}</CardTitle>
              <p className={`mt-1 text-xs font-semibold ${currentPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatTradePnl(currentPnl)} across {monthCount} closed trades
              </p>
            </div>
            <div className="mt-3 flex gap-5 sm:mt-0 sm:text-right">
              <div><p className="text-[9px] uppercase tracking-wider text-zinc-600">Start</p><p className="mt-1 font-mono text-xs font-bold text-zinc-300">{formatBalance(account.initialBalance)}</p></div>
              <div><p className="text-[9px] uppercase tracking-wider text-zinc-600">Return</p><p className={`mt-1 font-mono text-xs font-bold ${currentPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{account.initialBalance ? `${currentPnl >= 0 ? "+" : ""}${((currentPnl / account.initialBalance) * 100).toFixed(2)}%` : "0.00%"}</p></div>
            </div>
          </CardHeader>
          <CardContent className="h-[280px] px-1 pb-2 pt-3 sm:h-[360px] sm:px-3">
            {equity.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equity} margin={{ left: 8, right: 16, top: 18, bottom: 4 }}>
                  <defs>
                    <linearGradient id="tradoxDashboardEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                      <stop offset="55%" stopColor="#22c55e" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                  <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#52525b" }} />
                  <YAxis width={66} axisLine={false} tickLine={false} tickFormatter={(value) => balancesHidden ? "••••" : `$${Number(value / 1000).toFixed(1)}k`} tick={{ fontSize: 10, fill: "#52525b" }} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip formatter={(value) => formatBalance(Number(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#0b0b0b", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#f4f4f5" }} />
                  <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#tradoxDashboardEquity)" strokeWidth={2.2} dot={false} activeDot={{ r: 4, fill: "#22c55e", stroke: "#050505", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty className="h-full border-0 bg-transparent">
                <EmptyMedia><TrendingUp className="size-4" /></EmptyMedia>
                <EmptyHeader><EmptyTitle>No balance curve yet</EmptyTitle><EmptyDescription>Add the first closed trade to start tracking account growth.</EmptyDescription></EmptyHeader>
                <EmptyContent><Button size="sm" variant="outline" onClick={onAddTrade}>Add first trade</Button></EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-5">
          <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
            <CardHeader className="px-4 py-3.5"><SectionHeader title="Top instruments" description="Most active in recent trades" /></CardHeader>
            <CardContent className="space-y-1 px-3 pb-3">
              {instrumentStats.length ? instrumentStats.slice(0, 4).map((item, index) => (
                <div key={item.symbol} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/[.025]">
                  <span className="w-4 text-[10px] font-bold text-zinc-700">{index + 1}</span>
                  <InstrumentBadge symbol={item.symbol} compact className="shrink-0 bg-[#111111]" />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{item.symbol}</p><p className="text-[10px] text-zinc-600">{item.trades} recent trade{item.trades === 1 ? "" : "s"}</p></div>
                  <p className={`font-mono text-xs font-bold ${item.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatTradePnl(item.pnl)}</p>
                </div>
              )) : <p className="py-8 text-center text-xs text-zinc-600">No instrument data yet.</p>}
            </CardContent>
          </Card>

          <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
            <CardHeader className="px-4 py-3.5"><SectionHeader title="Total trades" description="Current dashboard period" /></CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="font-mono text-4xl font-black tracking-[-0.05em] text-white">{monthCount}</p>
              <div className="mt-5 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/8 pb-2"><span className="text-zinc-500">Winning</span><strong className="font-mono text-emerald-300">{stats.wins}</strong></div>
                <div className="flex items-center justify-between border-b border-white/8 pb-2"><span className="text-zinc-500">Breakeven</span><strong className="font-mono text-zinc-300">{breakeven}</strong></div>
                <div className="flex items-center justify-between"><span className="text-zinc-500">Losing</span><strong className="font-mono text-rose-300">{stats.losses}</strong></div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
            <CardHeader className="px-4 py-3.5"><SectionHeader title="Trade win rate" description="Closed trade efficiency" /></CardHeader>
            <CardContent className="flex items-center justify-between gap-3 px-4 pb-4">
              <div className="space-y-3 text-xs">
                <div><p className="text-zinc-600">Winning trades</p><p className="mt-1 font-mono font-bold text-emerald-300">{stats.wins}</p></div>
                <div><p className="text-zinc-600">Losing trades</p><p className="mt-1 font-mono font-bold text-rose-300">{stats.losses}</p></div>
              </div>
              <MetricRing value={stats.rate} label="Win rate" />
            </CardContent>
          </Card>

          <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
            <CardHeader className="px-4 py-3.5"><SectionHeader title="Profit factor" description="Gross win / gross loss" /></CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`font-mono text-3xl font-black ${stats.pf >= 1 ? "text-white" : "text-rose-300"}`}>{stats.pf.toFixed(2)}</p>
              <div className="mt-5 flex gap-1" aria-label="Profit factor visual scale">
                {Array.from({ length: profitSegments }, (_, index) => (
                  <span key={index} className={`h-8 w-1 flex-1 rounded-full ${index < positiveSegments ? "bg-emerald-400" : "bg-rose-400"}`} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-600"><span>Loss pressure</span><span>{stats.pf >= 1 ? "Positive expectancy" : "Below break-even"}</span></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Card className="gap-0 border-white/8 bg-[#070707] shadow-none xl:col-span-7">
          <CardHeader className="border-b border-white/8 px-4 py-3.5">
            <SectionHeader
              title="Recent trades"
              description="Latest journal entries for this account"
              action={<Button type="button" variant="ghost" size="sm" onClick={onSeeAll} className="h-8 px-2 text-[11px] text-zinc-400">See all <ArrowUpRight className="size-3.5" /></Button>}
            />
          </CardHeader>
          <CardContent className="p-2">
            {recentTrades.length ? recentTrades.map((trade) => (
              <button key={trade.id} type="button" onClick={() => onOpenTrade(trade)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2.5 py-3 text-left transition hover:bg-white/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
                <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#111111]" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2"><p className="truncate text-xs font-bold text-white">{trade.symbol}</p><span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${trade.side === "Long" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span></div>
                  <p className="mt-1 truncate text-[10px] text-zinc-600">{trade.setup || trade.session || trade.rawDate}</p>
                </div>
                <div className="text-right"><p className={`font-mono text-sm font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatTradePnl(trade.pnl)}</p><p className="mt-1 text-[9px] text-zinc-700">{trade.resultR ? `${trade.resultR.toFixed(2)}R` : trade.rawDate}</p></div>
              </button>
            )) : (
              <Empty className="my-2 min-h-52">
                <EmptyMedia><BookOpen className="size-4" /></EmptyMedia>
                <EmptyHeader><EmptyTitle>No trades yet</EmptyTitle><EmptyDescription>Register a trade to unlock performance and AI execution insights.</EmptyDescription></EmptyHeader>
                <EmptyContent><Button size="sm" onClick={onAddTrade}>Add first trade</Button></EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 xl:col-span-5">
          <Card className="gap-0 overflow-hidden border-emerald-400/15 bg-[linear-gradient(145deg,#08110c_0%,#070707_55%)] shadow-none">
            <CardHeader className="border-b border-white/8 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300"><BrainCircuit className="size-4" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><CardTitle className="text-base">Tradox AI edge brief</CardTitle><Sparkles className="size-3.5 text-emerald-300" /></div><CardDescription className="mt-1">Generated from your journal structure, not generic advice.</CardDescription></div>
                <span className="rounded-full border border-white/8 bg-black/40 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">Live data</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
              <div><p className="text-base font-black leading-6 text-white">{aiHeadline}</p><p className="mt-2 text-xs leading-5 text-zinc-400">{aiDetail}</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/8 bg-black/25 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Plan alignment</p><p className={`mt-1 font-mono text-lg font-black ${planRate >= 80 ? "text-emerald-300" : "text-amber-300"}`}>{planRate}%</p></div>
                <div className="rounded-xl border border-white/8 bg-black/25 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Best setup</p><p className="mt-1 truncate text-sm font-black text-white">{topSetup?.name || "Not enough data"}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
            <CardHeader className="px-4 py-3.5"><SectionHeader title="Account protection" description="Target and drawdown health" action={<ShieldCheck className="size-4 text-zinc-500" />} /></CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              <ProgressLine label="Profit target" value={targetProgress} />
              <ProgressLine label="Max drawdown used" value={drawdownUsed} risk />
              <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-4">
                <div><p className="text-[9px] uppercase tracking-wider text-zinc-600">Daily limit</p><p className="mt-1 font-mono text-xs font-bold text-white">{formatBalance(account.dailyDrawdown)}</p></div>
                <div><p className="text-[9px] uppercase tracking-wider text-zinc-600">Next focus</p><p className="mt-1 truncate text-xs font-bold text-white">{topMistake ? `Avoid ${topMistake.name}` : topSetup ? `Repeat ${topSetup.name}` : "Review trades"}</p></div>
              </div>
            </CardContent>
          </Card>

          {openPositions.length ? (
            <Card className="gap-0 border-white/8 bg-[#070707] shadow-none">
              <CardHeader className="border-b border-white/8 px-4 py-3.5"><SectionHeader title="Live positions" description="Synced open exposure" action={<span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300"><Activity className="size-3.5" />{openPositions.length} open</span>} /></CardHeader>
              <CardContent className="p-2">
                {openPositions.slice(0, 3).map((position) => {
                  const positive = (position.unrealizedPnl || 0) >= 0
                  return <div key={position.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5"><InstrumentBadge symbol={position.symbol} compact className="shrink-0 bg-[#111111]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{position.symbol}</p><p className="mt-0.5 text-[10px] text-zinc-600">{position.side} · {position.volume.toFixed(2)} lots</p></div><p className={`font-mono text-xs font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>{formatTradePnl(position.unrealizedPnl || 0)}</p></div>
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  )
}
