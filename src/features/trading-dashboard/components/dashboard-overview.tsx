"use client"

import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { LG_BREAKPOINT_QUERY, useMediaQuery } from "@/lib/use-media-query"
import { DASHBOARD_MOBILE_TAILWIND_CLASS } from "./dashboard-overview-mobile-tailwind"
import { DashboardOverviewMobile } from "./dashboard-overview-mobile"
import { DashboardOverviewResponsive } from "./dashboard-overview-responsive"

type DashboardOverviewProps = ComponentProps<typeof DashboardOverviewResponsive>

type DashboardOverviewOwnProps = DashboardOverviewProps & {
  /**
   * Every entry for this account, unfiltered. The journal already holds exactly
   * this list, so passing it down lets the account-wide summary be computed
   * locally instead of refetching /api/journal a second time.
   */
  allEntries?: JournalStatsRow[]
}

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

export function DashboardOverview({
  allEntries,
  ...props
}: DashboardOverviewOwnProps) {
  const [fetched, setFetched] = useState<SyncedStats | null>(null)
  const isDesktop = useMediaQuery(LG_BREAKPOINT_QUERY)
  const hasProvidedEntries = allEntries !== undefined

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
      setFetched(calculateStats(payload.entries ?? []))
    } catch {
      // Keep the existing dashboard values if the refresh request fails.
    }
  }, [props.account.id])

  useEffect(() => {
    // When the parent hands us the account's entries there is nothing to fetch:
    // this component used to request /api/journal for the same rows the journal
    // had already loaded, on mount and again on every window focus.
    if (hasProvidedEntries) return

    setFetched(null)
    void loadStats()

    const refresh = () => void loadStats()
    window.addEventListener("focus", refresh)
    window.addEventListener("tradox:journal-updated", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("tradox:journal-updated", refresh)
    }
  }, [hasProvidedEntries, loadStats])

  const synced = useMemo(
    () => (allEntries ? calculateStats(allEntries) : fetched),
    [allEntries, fetched],
  )

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

  // Both trees used to be rendered and one hidden with `lg:hidden`. That mounted
  // two complete dashboards - including two independent sets of recharts charts -
  // on every render, and CSS only hid the one you were not looking at. Matching
  // the breakpoint in JS means exactly one of them is ever mounted.
  if (isDesktop) {
    return <DashboardOverviewResponsive {...dashboardProps} />
  }

  return (
    <div className={DASHBOARD_MOBILE_TAILWIND_CLASS}>
      <DashboardOverviewMobile {...dashboardProps} />
    </div>
  )
}
