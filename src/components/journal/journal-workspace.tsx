"use client";

import { ShieldCheck, WalletCards, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardOverview } from "@/features/trading-dashboard/components/dashboard-overview";
import type { JournalEntry } from "@/components/types";
import { PropAccountDialog } from "@/components/prop-account-dialog";
import { TradeReviewModal } from "@/components/trade-review-modal";
import { Button } from "@/components/ui/button";
import { WorkspaceSectionSkeleton } from "@/components/workspace-section-skeleton";
import { useWorkspacePreferences } from "@/components/workspace-preferences-context";
import { JournalAccounts } from "./journal-accounts";
import { JournalAnalytics } from "./journal-analytics";
import { JournalCalendar } from "./journal-calendar";
import { JournalGallery } from "./journal-gallery";
import { JournalTradeList } from "./journal-trade-list";
import { useJournalData } from "./use-journal-data";

export type WorkspaceTab =
  | "home"
  | "overview"
  | "calendar"
  | "trades"
  | "bible"
  | "analytics"
  | "settings";

export function JournalWorkspace({
  onLogin,
  mode = "accounts",
  forcedTab = "overview",
}: {
  onLogin: () => void;
  mode?: "accounts" | "workspace";
  forcedTab?: WorkspaceTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferences = useWorkspacePreferences();
  const data = useJournalData(mode);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  useEffect(() => {
    if (mode !== "accounts" || searchParams.get("new") !== "1") return;
    setAccountOpen(true);
    router.replace("/accounts");
  }, [mode, router, searchParams]);

  const openTradeComposer = useCallback(() => {
    if (!data.account) {
      data.setError("Select an account before adding a trade.");
      router.push("/accounts");
      return;
    }
    setTradeOpen(true);
  }, [data, router]);

  useEffect(() => {
    if (!data.user) return;
    window.addEventListener("tradox:add-trade", openTradeComposer);
    return () =>
      window.removeEventListener("tradox:add-trade", openTradeComposer);
  }, [data.user, openTradeComposer]);

  const weeklyStrip = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      const trades = data.entries.filter((trade) => trade.rawDate === key);
      const pnl = trades.reduce((total, trade) => total + trade.pnl, 0);
      return {
        key,
        label: day.toLocaleDateString("en-US", {
          weekday: "short",
          day: "2-digit",
        }),
        trades: trades.length,
        pnl,
        percent: data.account?.accountSize
          ? (pnl / data.account.accountSize) * 100
          : 0,
      };
    });
  }, [data.account?.accountSize, data.entries]);

  const currentMonthCount = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return data.entries.filter((trade) => trade.rawDate?.startsWith(prefix)).length;
  }, [data.entries]);

  const recentTrades = useMemo(
    () =>
      [...data.entries]
        .sort((left, right) =>
          String(right.rawDate || "").localeCompare(String(left.rawDate || "")),
        )
        .slice(0, 8),
    [data.entries],
  );

  const openTrade = (trade: JournalEntry) => {
    router.push(`/trades/${encodeURIComponent(trade.id)}`);
  };

  if (!data.user) {
    return (
      <div className="grid min-h-[70dvh] place-items-center p-5 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-xl border border-white/8 bg-[#090909]">
            <ShieldCheck className="size-6 text-zinc-400" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-white">
            Professional trading journal
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Sign in to review accounts, execution and verified performance.
          </p>
          <Button onClick={onLogin} className="mt-5 bg-white text-black hover:bg-zinc-200">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading) return <WorkspaceSectionSkeleton />;

  const createAccount = async (form: FormData) => {
    const account = await data.createAccount(form);
    if (account) {
      setAccountOpen(false);
      data.setActiveAccount(account.id);
    }
    return account;
  };

  const mainContent = (() => {
    if (mode === "accounts") {
      return (
        <JournalAccounts
          summaries={data.summaries}
          activeAccountId={data.activeAccountId}
          deleting={data.deleting}
          onAdd={() => setAccountOpen(true)}
          onOpen={(accountId) => {
            data.setActiveAccount(accountId);
            router.push("/dashboard");
          }}
          onDelete={data.removeAccount}
          formatPnl={preferences.formatPnl}
        />
      );
    }

    if (!data.account) {
      return (
        <div className="mx-auto grid min-h-[60dvh] max-w-2xl place-items-center p-4 text-center">
          <div className="rounded-2xl border border-white/8 bg-[#090909] p-7">
            <WalletCards className="mx-auto size-6 text-zinc-500" />
            <h2 className="mt-4 text-lg font-semibold text-white">
              Select a trading account
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Dashboard, trades and analytics are scoped to one active account.
            </p>
            <Button
              onClick={() => router.push("/accounts")}
              className="mt-5 bg-white text-black hover:bg-zinc-200"
            >
              Open accounts
            </Button>
          </div>
        </div>
      );
    }

    if (forcedTab === "calendar") return <JournalCalendar />;

    if (forcedTab === "trades") {
      return (
        <div className="mx-auto w-full max-w-[1320px] p-3 sm:p-4 lg:p-5">
          <JournalTradeList
            trades={data.filteredEntries}
            query={data.query}
            range={data.range}
            customStart={data.customStart}
            customEnd={data.customEnd}
            winRate={data.metrics.rate}
            averageR={data.metrics.averageR}
            onQueryChange={data.setQuery}
            onRangeChange={data.setRange}
            onCustomStartChange={data.setCustomStart}
            onCustomEndChange={data.setCustomEnd}
            onOpenTrade={openTrade}
            onAddTrade={openTradeComposer}
          />
        </div>
      );
    }

    if (forcedTab === "analytics") {
      return (
        <div className="mx-auto w-full max-w-[1320px] p-3 sm:p-4 lg:p-5">
          <JournalAnalytics
            account={data.account}
            trades={data.entries}
            metrics={data.metrics}
            equity={data.equity}
            setups={data.setups}
            mistakes={data.mistakes}
            planRate={data.planRate}
            formatPnl={preferences.formatPnl}
          />
        </div>
      );
    }

    if (forcedTab === "bible") {
      return (
        <div className="mx-auto w-full max-w-[1320px] p-3 sm:p-4 lg:p-5">
          <JournalGallery
            trades={data.entries.filter((trade) => trade.toTradingBible)}
            formatPnl={preferences.formatPnl}
            onOpenTrade={openTrade}
          />
        </div>
      );
    }

    if (forcedTab === "settings") {
      router.replace("/settings");
      return <WorkspaceSectionSkeleton />;
    }

    const currentPnl = data.metrics.pnl;
    const currentEquity = data.account.initialBalance + currentPnl;
    const targetProgress = data.account.profitTarget
      ? Math.min(100, Math.max(0, (currentPnl / data.account.profitTarget) * 100))
      : 0;
    const drawdownUsed =
      data.account.maxDrawdown && currentPnl < 0
        ? Math.min(100, (Math.abs(currentPnl) / data.account.maxDrawdown) * 100)
        : 0;

    return (
      <DashboardOverview
        account={data.account}
        stats={{
          pnl: data.metrics.pnl,
          wins: data.metrics.wins,
          losses: data.metrics.losses,
          rate: data.metrics.rate,
          pf: data.metrics.profitFactor,
        }}
        equity={data.equity}
        weeklyStrip={weeklyStrip}
        setups={data.setups}
        mistakes={data.mistakes}
        planRate={data.planRate}
        monthCount={currentMonthCount}
        recentTrades={recentTrades}
        openPositions={[]}
        currentPnl={currentPnl}
        currentEquity={currentEquity}
        targetProgress={targetProgress}
        drawdownUsed={drawdownUsed}
        balancesHidden={preferences.hidePersonalInfo}
        formatTradePnl={preferences.formatPnl}
        onOpenTrade={openTrade}
        onSeeAll={() => router.push("/trades")}
        onAddTrade={openTradeComposer}
      />
    );
  })();

  return (
    <>
      {data.error ? (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2.5 text-sm text-rose-300 sm:mx-4 lg:mx-6">
          <X className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{data.error}</span>
          <button
            type="button"
            onClick={() => data.setError(null)}
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/6"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {mainContent}

      <PropAccountDialog
        open={accountOpen}
        saving={data.saving}
        onOpenChange={setAccountOpen}
        onSave={createAccount}
      />
      <TradeReviewModal
        open={tradeOpen}
        saving={data.saving}
        account={data.account}
        onOpenChange={setTradeOpen}
        onSave={data.addTrade}
      />
    </>
  );
}
