"use client"

import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

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

const MOBILE_ROOT = [
  "w-full min-w-0 max-w-full overflow-x-clip lg:hidden",
  "[&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full",
  "[&>div>:not([hidden])~:not([hidden])]:mt-2.5",
  "[&_[data-slot=card]]:min-w-0 [&_[data-slot=card]]:rounded-[14px]",
  "[&_[data-slot=card-header]]:min-w-0 [&_[data-slot=card-content]]:min-w-0",
  "[&_.recharts-responsive-container]:max-w-full [&_.recharts-wrapper]:max-w-full [&_.recharts-surface]:max-w-full",
  "[&>div>section:first-of-type]:py-1",
  "[&>div>section:first-of-type_h1]:text-[clamp(1.5rem,7vw,1.85rem)] [&>div>section:first-of-type_h1]:leading-[1.08]",
  "[&>div>section:first-of-type_p]:mt-1.5 [&>div>section:first-of-type_p]:text-[13px]",
  "[&>div>[data-slot=card]:first-of-type]:h-[255px] [&>div>[data-slot=card]:first-of-type]:min-h-[255px]",
  "[&>div>[data-slot=card]:first-of-type>[data-slot=card-header]]:px-4 [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]]:pb-1 [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]]:pt-4",
  "[&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:first-child]:pr-[6.75rem]",
  "[&>div>[data-slot=card]:first-of-type_[data-slot=card-description]]:text-[13px] [&>div>[data-slot=card]:first-of-type_[data-slot=card-description]]:leading-4",
  "[&>div>[data-slot=card]:first-of-type_[data-slot=card-title]]:mt-1 [&>div>[data-slot=card]:first-of-type_[data-slot=card-title]]:text-[clamp(1.85rem,9vw,2.2rem)] [&>div>[data-slot=card]:first-of-type_[data-slot=card-title]]:leading-none",
  "[&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:first-child>p:last-child]:mt-2 [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:first-child>p:last-child]:text-[12px]",
  "[&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:last-child]:right-4 [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:last-child]:top-[1.1rem] [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:last-child]:rounded-[10px] [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:last-child]:px-3 [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:last-child]:py-2 [&>div>[data-slot=card]:first-of-type>[data-slot=card-header]>div:last-child]:text-[13px]",
  "[&>div>[data-slot=card]:first-of-type>[data-slot=card-content]]:h-[150px] [&>div>[data-slot=card]:first-of-type>[data-slot=card-content]]:min-h-[150px] [&>div>[data-slot=card]:first-of-type>[data-slot=card-content]]:pt-1",
  "[&>div>section:nth-of-type(2)]:grid-cols-2 [&>div>section:nth-of-type(2)]:gap-2",
  "[&>div>section:nth-of-type(2)>[data-slot=card]]:min-h-[198px]",
  "[&>div>section:nth-of-type(2)_[data-slot=card-header]]:px-3 [&>div>section:nth-of-type(2)_[data-slot=card-header]]:pt-3.5",
  "[&>div>section:nth-of-type(2)_[data-slot=card-title]]:truncate [&>div>section:nth-of-type(2)_[data-slot=card-title]]:text-[12px] [&>div>section:nth-of-type(2)_[data-slot=card-title]]:leading-4",
  "[&>div>section:nth-of-type(2)_[data-slot=card-content]]:px-3 [&>div>section:nth-of-type(2)_[data-slot=card-content]]:pb-3 [&>div>section:nth-of-type(2)_[data-slot=card-content]]:pt-3.5",
  "[&>div>section:nth-of-type(2)_[data-slot=card-content]>p:first-child]:text-[clamp(1.7rem,7.8vw,2.05rem)] [&>div>section:nth-of-type(2)_[data-slot=card-content]>p:first-child]:leading-none",
  "[&>div>section:nth-of-type(2)>[data-slot=card]:nth-child(-n+2)]:min-h-[202px]",
  "[&>div>section:nth-of-type(2)>[data-slot=card]:nth-child(n+3)]:min-h-[176px]",
  "max-[359px]:[&>div>section:nth-of-type(2)]:gap-1.5",
  "max-[359px]:[&>div>section:nth-of-type(2)_[data-slot=card-header]]:px-2.5 max-[359px]:[&>div>section:nth-of-type(2)_[data-slot=card-content]]:px-2.5",
  "max-[359px]:[&>div>section:nth-of-type(2)_[data-slot=card-title]]:text-[11px]",
].join(" ")

function finiteNumber(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
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
      <div className={MOBILE_ROOT}>
        <DashboardOverviewMobile {...dashboardProps} />
      </div>
      <div className="hidden lg:block">
        <DashboardOverviewResponsive {...dashboardProps} />
      </div>
    </>
  )
}
