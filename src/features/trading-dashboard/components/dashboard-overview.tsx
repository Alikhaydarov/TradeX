"use client"

import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import styles from "./dashboard-overview-mobile.module.css"
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
      <div className={`${styles.mobileRoot} lg:hidden`}>
        <DashboardOverviewMobile {...dashboardProps} />
      </div>
      <div className="hidden lg:block">
        <DashboardOverviewResponsive {...dashboardProps} />
      </div>
    </>
  )
}
