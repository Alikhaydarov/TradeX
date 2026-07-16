"use client"

import { Activity, ArrowUpRight, BookOpen, ShieldCheck, Target, TrendingUp } from "lucide-react"
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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })

function Metric({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "good" | "bad" }) {
  return (
    <Card size="sm" className="gap-2 bg-[#0a0a0a] shadow-none">
      <CardHeader className="gap-2">
        <CardDescription className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</CardDescription>
        <CardTitle className={`font-mono text-xl ${tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-white"}`}>{value}</CardTitle>
        <p className="text-[11px] text-zinc-500">{detail}</p>
      </CardHeader>
    </Card>
  )
}

function Progress({ label, value, tone }: { label: string; value: number; tone: "good" | "risk" }) {
  const bounded = Math.min(100, Math.max(0, value))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono font-semibold text-zinc-200">{bounded.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bounded)}>
        <div className={`h-full rounded-full ${tone === "good" ? "bg-emerald-400" : bounded >= 70 ? "bg-rose-400" : "bg-amber-400"}`} style={{ width: `${bounded}%` }} />
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
  const totalMistakes = mistakes.reduce((sum, item) => sum + item.trades, 0)
  const formatBalance = (value: number) => balancesHidden ? "******" : money.format(value)

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{account.name}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Trading dashboard</h1>
          <p className="mt-1 text-xs text-zinc-500">Performance, account protection and execution quality.</p>
        </div>
        <Button type="button" size="sm" onClick={onAddTrade} className="w-full bg-zinc-100 text-zinc-950 hover:bg-white sm:w-auto">
          Add trade <ArrowUpRight className="size-3.5" />
        </Button>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Net P&L" value={formatTradePnl(currentPnl)} detail={`${monthCount} closed trades`} tone={currentPnl >= 0 ? "good" : "bad"} />
        <Metric label="Win rate" value={`${stats.rate}%`} detail={`${stats.wins} wins / ${stats.losses} losses`} tone={stats.rate >= 50 ? "good" : "neutral"} />
        <Metric label="Profit factor" value={stats.pf.toFixed(2)} detail={stats.pf >= 1 ? "Positive expectancy" : "Below break-even"} tone={stats.pf >= 1 ? "good" : "bad"} />
        <Metric label="Plan alignment" value={`${planRate}%`} detail={`${totalMistakes} rule-break trades`} tone={planRate >= 80 ? "good" : planRate < 60 ? "bad" : "neutral"} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.7fr)]">
        <Card className="gap-0 bg-[#080808] shadow-none">
          <CardHeader className="border-b border-white/8 pb-3 sm:grid-cols-[1fr_auto]">
            <div>
              <CardTitle>Equity curve</CardTitle>
              <CardDescription>{account.name} across closed trades</CardDescription>
            </div>
            <div className="mt-3 flex gap-6 sm:mt-0 sm:text-right">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Equity</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white">{formatBalance(currentEquity)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Start</p>
                <p className="mt-1 font-mono text-sm font-semibold text-zinc-300">{formatBalance(account.initialBalance)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[250px] px-1 pb-3 pt-2 sm:h-[330px] sm:px-3">
            {equity.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equity} margin={{ left: 8, right: 14, top: 16, bottom: 4 }}>
                  <defs>
                    <linearGradient id="dashboardEquityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                  <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis width={68} axisLine={false} tickLine={false} tickFormatter={(value) => balancesHidden ? "••••" : `$${Number(value / 1000).toFixed(1)}k`} tick={{ fontSize: 10, fill: "#71717a" }} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip formatter={(value) => formatBalance(Number(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#f4f4f5" }} />
                  <Area type="monotone" dataKey="equity" stroke="#34d399" fill="url(#dashboardEquityFill)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#34d399", stroke: "#09090b", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty className="h-full border-0 bg-transparent">
                <EmptyMedia><TrendingUp className="size-4" /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No equity curve yet</EmptyTitle>
                  <EmptyDescription>Add the first closed trade to start tracking account growth.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent><Button size="sm" variant="outline" onClick={onAddTrade}>Add trade</Button></EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#080808] shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Risk guard</CardTitle>
                <CardDescription>Challenge protection at a glance</CardDescription>
              </div>
              <div className="grid size-9 place-items-center rounded-lg border border-white/8 bg-white/[.03] text-zinc-300"><ShieldCheck className="size-4" /></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Progress label="Profit target" value={targetProgress} tone="good" />
            <Progress label="Max drawdown used" value={drawdownUsed} tone="risk" />
            <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-4">
              <div><p className="text-[10px] uppercase tracking-wider text-zinc-600">Daily limit</p><p className="mt-1.5 font-mono text-sm font-semibold text-white">{formatBalance(account.dailyDrawdown)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-zinc-600">Status</p><p className="mt-1.5 text-sm font-semibold capitalize text-white">{account.status}</p></div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[.025] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><Target className="size-3.5 text-emerald-300" /> Next focus</div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                {mistakes[0] ? `Reduce “${mistakes[0].name}” — repeated ${mistakes[0].trades} times.` : setups[0] ? `Prioritize ${setups[0].name}; it has a ${setups[0].rate}% win rate.` : "Review every closed trade to surface a useful execution pattern."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 bg-[#080808] shadow-none">
        <CardHeader className="border-b border-white/8 pb-3 sm:grid-cols-[1fr_auto]">
          <div><CardTitle>Current week</CardTitle><CardDescription>Daily closed-trade performance</CardDescription></div>
          <span className="mt-2 text-xs text-zinc-500 sm:mt-0">{weeklyStrip.reduce((sum, day) => sum + day.trades, 0)} trades</span>
        </CardHeader>
        <CardContent className="overflow-x-auto py-3">
          <div className="grid min-w-[650px] grid-cols-7 divide-x divide-white/8">
            {weeklyStrip.map((day) => (
              <div key={day.key} className="px-3 first:pl-0 last:pr-0">
                <p className="text-xs font-medium text-zinc-400">{day.label}</p>
                <p className={`mt-2 font-mono text-sm font-semibold ${day.pnl > 0 ? "text-emerald-300" : day.pnl < 0 ? "text-rose-300" : "text-zinc-500"}`}>{day.trades ? formatTradePnl(day.pnl) : "—"}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{day.trades} trade{day.trades === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-3 ${openPositions.length ? "xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]" : ""}`}>
        <Card className="gap-0 bg-[#080808] shadow-none">
          <CardHeader className="border-b border-white/8 pb-3 sm:grid-cols-[1fr_auto]">
            <div><CardTitle>Recent trades</CardTitle><CardDescription>Latest entries from this account</CardDescription></div>
            <Button type="button" variant="ghost" size="sm" onClick={onSeeAll} className="mt-2 justify-start text-zinc-300 sm:mt-0">See all <ArrowUpRight className="size-3.5" /></Button>
          </CardHeader>
          <CardContent className="py-2">
            {recentTrades.length ? recentTrades.map((trade) => (
              <button key={trade.id} type="button" onClick={() => onOpenTrade(trade)} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-white/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-zinc-500">{trade.setup || trade.session || trade.rawDate}</p></div>
                <span className={`text-[10px] font-semibold uppercase ${trade.side === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.side}</span>
                <strong className={`min-w-20 text-right font-mono text-sm ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatTradePnl(trade.pnl)}</strong>
              </button>
            )) : (
              <Empty className="my-2 min-h-48">
                <EmptyMedia><BookOpen className="size-4" /></EmptyMedia>
                <EmptyHeader><EmptyTitle>No trades yet</EmptyTitle><EmptyDescription>Register a trade to unlock performance and discipline analytics.</EmptyDescription></EmptyHeader>
                <EmptyContent><Button size="sm" onClick={onAddTrade}>Add first trade</Button></EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        {openPositions.length ? (
          <Card className="gap-0 bg-[#080808] shadow-none">
            <CardHeader className="border-b border-white/8 pb-3">
              <div className="flex items-center justify-between gap-3"><div><CardTitle>Live positions</CardTitle><CardDescription>Synced from MT5</CardDescription></div><span className="flex items-center gap-1.5 text-xs text-emerald-300"><Activity className="size-3.5" /> {openPositions.length} open</span></div>
            </CardHeader>
            <CardContent className="py-2">
              {openPositions.slice(0, 4).map((position) => {
                const positive = (position.unrealizedPnl || 0) >= 0
                return (
                  <div key={position.id} className="flex items-center gap-3 border-b border-white/8 px-1 py-3 last:border-0">
                    <InstrumentBadge symbol={position.symbol} compact className="shrink-0 bg-[#121212]" />
                    <div className="min-w-0 flex-1"><p className="text-[11px] text-zinc-500">{position.side} · {position.volume.toFixed(2)} lots</p></div>
                    <p className={`font-mono text-sm font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>{formatTradePnl(position.unrealizedPnl || 0)}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
