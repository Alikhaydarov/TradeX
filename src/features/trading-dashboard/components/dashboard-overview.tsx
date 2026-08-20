"use client"

import { Activity, ShieldAlert, Target, TrendingUp } from "lucide-react"
import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { DASHBOARD_MOBILE_TAILWIND_CLASS } from "./dashboard-overview-mobile-tailwind"
import { DashboardOverviewMobile } from "./dashboard-overview-mobile"
import { DashboardOverviewResponsive } from "./dashboard-overview-responsive"

type DashboardOverviewProps = ComponentProps<typeof DashboardOverviewResponsive>

type JournalStatsRow = {
  pnl?: string | number | null
}

type JournalStatsResponse = {
  entries?: JournalStatsRow[]
}

type SyncedStats = {
  pnl: number
  wins: number
  losses: number
  rate: number
  pf: number
  count: number
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

function finiteNumber(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
}

function calculateStats(entries: JournalStatsRow[]): SyncedStats {
  const normalized = entries.map((entry) => finiteNumber(entry.pnl))
  const wins = normalized.filter((pnl) => pnl > 0)
  const losses = normalized.filter((pnl) => pnl < 0)
  const decidedTrades = wins.length + losses.length
  const grossWins = wins.reduce((total, pnl) => total + pnl, 0)
  const grossLosses = Math.abs(losses.reduce((total, pnl) => total + pnl, 0))

  return {
    pnl: normalized.reduce((total, pnl) => total + pnl, 0),
    wins: wins.length,
    losses: losses.length,
    rate: decidedTrades ? Math.round((wins.length / decidedTrades) * 100) : 0,
    pf: grossLosses ? grossWins / grossLosses : grossWins > 0 ? grossWins : 0,
    count: normalized.length,
  }
}

function DesktopDashboardCommandCenter({
  account,
  currentEquity,
  currentPnl,
  targetProgress,
  drawdownUsed,
  planRate,
  openPositions,
  balancesHidden,
  formatTradePnl,
}: DashboardOverviewProps) {
  const target = clampPercent(targetProgress)
  const drawdown = clampPercent(drawdownUsed)
  const adherence = clampPercent(planRate)
  const statusTone = account.status === "Active" ? "bg-xpositive" : "bg-xwarning"
  const pnlTone = currentPnl >= 0 ? "text-xpositive" : "text-xnegative"

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-xborder bg-xsurface shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_18px_52px_rgba(0,0,0,.22)]">
      <div className="flex items-center justify-between gap-4 border-b border-xborder px-5 py-4 xl:px-6">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-xmuted">
            Performance command center
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-[20px] font-black tracking-[-0.035em] text-white xl:text-[22px]">
              {account.name}
            </h1>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-xborder bg-xpanel px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-300">
              <span className={`size-1.5 rounded-full ${statusTone}`} />
              {account.status}
            </span>
          </div>
        </div>
        <div className="hidden items-center gap-2 xl:flex">
          <span className="rounded-full border border-xborder bg-xpanel px-3 py-1.5 text-[10px] font-semibold text-xmuted-strong">
            {openPositions.length} open position{openPositions.length === 1 ? "" : "s"}
          </span>
          <span className={`rounded-full border border-xborder bg-xpanel px-3 py-1.5 text-[10px] font-bold ${pnlTone}`}>
            {formatTradePnl(currentPnl)} net P&amp;L
          </span>
        </div>
      </div>

      <div className="grid divide-y divide-x-0 divide-xborder md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        <article className="px-5 py-4 xl:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">Equity</p>
            <span className="grid size-8 place-items-center rounded-xl border border-xborder bg-xpanel text-zinc-300">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="mt-2 font-mono text-[21px] font-black tracking-[-0.04em] text-white xl:text-[23px]">
            {balancesHidden ? "******" : money.format(currentEquity)}
          </p>
          <p className={`mt-1 text-[10px] font-bold ${pnlTone}`}>{formatTradePnl(currentPnl)} this period</p>
        </article>

        <article className="px-5 py-4 xl:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">Target progress</p>
            <span className="grid size-8 place-items-center rounded-xl border border-xborder bg-xpanel text-zinc-300">
              <Target size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-mono text-[21px] font-black tracking-[-0.04em] text-white xl:text-[23px]">{Math.round(target)}%</p>
            <span className="text-[9px] font-semibold text-xmuted">goal</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.055]">
            <div className="h-full rounded-full bg-xpositive transition-[width] duration-300" style={{ width: `${target}%` }} />
          </div>
        </article>

        <article className="px-5 py-4 xl:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">Drawdown used</p>
            <span className="grid size-8 place-items-center rounded-xl border border-xborder bg-xpanel text-zinc-300">
              <ShieldAlert size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={`font-mono text-[21px] font-black tracking-[-0.04em] xl:text-[23px] ${drawdown >= 75 ? "text-xnegative" : drawdown >= 50 ? "text-xwarning" : "text-white"}`}>
              {Math.round(drawdown)}%
            </p>
            <span className="text-[9px] font-semibold text-xmuted">risk budget</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.055]">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${drawdown >= 75 ? "bg-xnegative" : drawdown >= 50 ? "bg-xwarning" : "bg-zinc-300"}`}
              style={{ width: `${drawdown}%` }}
            />
          </div>
        </article>

        <article className="px-5 py-4 xl:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">Plan adherence</p>
            <span className="grid size-8 place-items-center rounded-xl border border-xborder bg-xpanel text-zinc-300">
              <Activity size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-mono text-[21px] font-black tracking-[-0.04em] text-white xl:text-[23px]">{Math.round(adherence)}%</p>
            <span className="text-[9px] font-semibold text-xmuted">discipline</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.055]">
            <div className="h-full rounded-full bg-zinc-300 transition-[width] duration-300" style={{ width: `${adherence}%` }} />
          </div>
        </article>
      </div>
    </section>
  )
}

export function DashboardOverview(props: DashboardOverviewProps) {
  const [synced, setSynced] = useState<SyncedStats | null>(null)

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/journal?accountId=${encodeURIComponent(props.account.id)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      )
      if (!response.ok) return
      const payload = (await response.json()) as JournalStatsResponse
      setSynced(calculateStats(payload.entries ?? []))
    } catch {
      // Keep the existing dashboard values if the refresh request fails.
    }
  }, [props.account.id])

  useEffect(() => {
    setSynced(null)
    void loadStats()

    const refresh = () => void loadStats()
    window.addEventListener("focus", refresh)
    window.addEventListener("tradox:journal-updated", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("tradox:journal-updated", refresh)
    }
  }, [loadStats])

  const dashboardProps = useMemo<DashboardOverviewProps>(
    () =>
      synced
        ? {
            ...props,
            stats: {
              ...props.stats,
              pnl: synced.pnl,
              wins: synced.wins,
              losses: synced.losses,
              rate: synced.rate,
              pf: synced.pf,
            },
            monthCount: synced.count,
          }
        : props,
    [props, synced],
  )

  return (
    <>
      <div className={`${DASHBOARD_MOBILE_TAILWIND_CLASS} lg:hidden`}>
        <DashboardOverviewMobile {...dashboardProps} />
      </div>
      <div className="hidden lg:block">
        <DesktopDashboardCommandCenter {...dashboardProps} />
        <div className="mt-4 [&>div>section:first-child]:hidden [&>div]:space-y-4">
          <DashboardOverviewResponsive {...dashboardProps} />
        </div>
      </div>
    </>
  )
}
