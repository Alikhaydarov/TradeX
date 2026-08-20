"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useActiveAccountStore } from "@/components/active-account-context";
import { useAuth } from "@/components/auth-context";
import { useJournalData } from "@/components/journal/use-journal-data";
import {
  buildEquityCurve,
  buildJournalStats,
  buildMistakeStats,
  buildSetupStats,
  buildWeeklyStrip,
  calculatePlanRate,
  selectMonthEntries,
  sortTradesNewest,
} from "@/components/journal/journal-selectors";
import { useTradeComposer } from "@/components/journal/trade-composer-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { OpenPosition } from "@/components/types";
import { useWorkspacePreferences } from "@/components/workspace-preferences-context";
import { apiRequest } from "@/lib/api-client";
import { DashboardOverview } from "./dashboard-overview";

function DashboardRouteSkeleton() {
  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-5" role="status" aria-label="Loading dashboard">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl bg-white/[.05]" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-[390px] rounded-2xl bg-white/[.045]" />
        <Skeleton className="h-[390px] rounded-2xl bg-white/[.045]" />
      </div>
    </div>
  );
}

export function DashboardRouteController() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    accounts,
    activeAccountId,
    loading: accountsLoading,
  } = useActiveAccountStore();
  const account = useMemo(
    () => accounts.find((item) => item.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );
  const {
    entries,
    loading: journalLoading,
    error,
  } = useJournalData({
    userId: user?.id ?? null,
    mode: "workspace",
    accountId: activeAccountId,
    accountsLoading,
  });
  const { openTradeComposer } = useTradeComposer();
  const { pnlMode, formatPnl } = useWorkspacePreferences();
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const month = useMemo(() => new Date(), []);

  const monthEntries = useMemo(
    () => selectMonthEntries(entries, month),
    [entries, month],
  );
  const stats = useMemo(() => buildJournalStats(monthEntries), [monthEntries]);
  const equity = useMemo(
    () => (account ? buildEquityCurve(account, entries) : []),
    [account, entries],
  );
  const setups = useMemo(() => buildSetupStats(monthEntries), [monthEntries]);
  const mistakes = useMemo(
    () => buildMistakeStats(monthEntries),
    [monthEntries],
  );
  const planRate = useMemo(
    () => calculatePlanRate(monthEntries),
    [monthEntries],
  );
  const recentTrades = useMemo(
    () => sortTradesNewest(monthEntries).slice(0, 5),
    [monthEntries],
  );
  const weeklyStrip = useMemo(
    () => (account ? buildWeeklyStrip(account, month, monthEntries) : []),
    [account, month, monthEntries],
  );

  useEffect(() => {
    if (!account || account.platform !== "mt5") {
      setOpenPositions([]);
      return;
    }

    let active = true;
    void apiRequest<{ positions: OpenPosition[] }>(
      `/api/prop-accounts/${account.id}/mt5/positions`,
    )
      .then((response) => {
        if (active) setOpenPositions(response.positions || []);
      })
      .catch(() => {
        if (active) setOpenPositions([]);
      });
    return () => {
      active = false;
    };
  }, [account]);

  const formatTradePnl = useCallback(
    (amount: number) =>
      formatPnl(amount, account?.initialBalance || account?.accountSize || 1),
    [account, formatPnl],
  );

  if (accountsLoading || (journalLoading && !entries.length)) {
    return <DashboardRouteSkeleton />;
  }

  if (!account) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-black text-white">Select a trading account</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Dashboard performance follows the active account. Choose one to load its journal instantly.
          </p>
          <Button className="mt-5" onClick={() => router.push("/accounts")}>
            Open accounts
          </Button>
        </div>
      </div>
    );
  }

  const currentEquity = equity.at(-1)?.equity ?? account.initialBalance;
  const currentPnl = currentEquity - account.initialBalance;
  const targetProgress = account.profitTarget
    ? Math.min(100, Math.max(0, (currentPnl / account.profitTarget) * 100))
    : 0;
  const drawdownUsed =
    account.maxDrawdown && currentPnl < 0
      ? Math.min(100, (Math.abs(currentPnl) / account.maxDrawdown) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-[1540px] p-3 sm:p-4 lg:p-4">
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}
      <DashboardOverview
        account={account}
        stats={stats}
        equity={equity}
        weeklyStrip={weeklyStrip}
        setups={setups}
        mistakes={mistakes}
        planRate={planRate}
        monthCount={monthEntries.length}
        recentTrades={recentTrades}
        openPositions={openPositions}
        currentPnl={currentPnl}
        currentEquity={currentEquity}
        targetProgress={targetProgress}
        drawdownUsed={drawdownUsed}
        balancesHidden={pnlMode === "hidden"}
        formatTradePnl={formatTradePnl}
        onOpenTrade={(trade) => router.push(`/trades/${trade.id}`)}
        onSeeAll={() => router.push("/trades")}
        onAddTrade={openTradeComposer}
      />
    </div>
  );
}
