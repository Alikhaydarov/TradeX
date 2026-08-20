"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useActiveAccountStore } from "@/components/active-account-context";
import { useAuth } from "@/components/auth-context";
import {
  JournalFilters,
  type JournalTradeRange,
} from "@/components/journal/journal-filters";
import {
  buildJournalStats,
  filterJournalEntries,
  sortTradesNewest,
  sortTradesOldest,
} from "@/components/journal/journal-selectors";
import { useTradeComposer } from "@/components/journal/trade-composer-context";
import { useJournalData } from "@/components/journal/use-journal-data";
import type { JournalEntry } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspacePreferences } from "@/components/workspace-preferences-context";
import { setCachedTradeDetail } from "../trade-detail-data-store";

function TradesRouteSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1320px] space-y-3 p-3 sm:p-4 lg:p-5"
      role="status"
      aria-label="Loading trades"
    >
      <Skeleton className="h-28 rounded-2xl bg-white/[.05]" />
      <Skeleton className="h-20 rounded-2xl bg-white/[.045]" />
      <Skeleton className="h-[460px] rounded-2xl bg-white/[.045]" />
    </div>
  );
}

function detailRowFromEntry(trade: JournalEntry) {
  const images = trade.imageUrls?.length
    ? trade.imageUrls
    : trade.imageUrl
      ? [trade.imageUrl]
      : [];

  return {
    id: trade.id,
    prop_account_id: trade.propAccountId ?? null,
    symbol: trade.symbol,
    side: trade.side,
    entry_price: trade.entry,
    exit_price: trade.exit,
    quantity: trade.quantity,
    fees: trade.fees,
    pnl: trade.pnl,
    note: trade.note || "",
    traded_at: trade.rawDate || "",
    account_name: trade.accountName || null,
    market_type: trade.marketType || null,
    setup: trade.setup || null,
    emotion: trade.emotion || null,
    risk_amount: trade.riskAmount ?? 0,
    result_r: trade.resultR ?? 0,
    risk_percent: trade.riskPercent || null,
    session: trade.session || null,
    following_plan: trade.followingPlan ?? true,
    error_made: trade.errorMade ?? false,
    mistake_type: trade.mistakeType || null,
    review_completed: trade.reviewCompleted ?? false,
    to_trading_bible: trade.toTradingBible ?? false,
    image_url: images.length ? JSON.stringify(images) : null,
    tags: trade.tags || [],
  };
}

export function TradesRouteController() {
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
  const { tradeSort, setTradeSort, formatPnl } = useWorkspacePreferences();

  const [query, setQuery] = useState("");
  const [range, setRange] = useState<JournalTradeRange>("monthly");
  const [customStart, setCustomStart] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const anchor = useMemo(() => new Date(), []);

  const rangedEntries = useMemo(
    () =>
      filterJournalEntries(
        entries,
        range,
        anchor,
        customStart,
        customEnd,
      ),
    [anchor, customEnd, customStart, entries, range],
  );
  const searchedEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rangedEntries;
    return rangedEntries.filter((entry) =>
      `${entry.symbol} ${entry.setup || ""} ${entry.session || ""} ${entry.note || ""} ${(entry.tags || []).join(" ")}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, rangedEntries]);
  const sortedEntries = useMemo(
    () =>
      tradeSort === "entryDate"
        ? sortTradesOldest(searchedEntries)
        : sortTradesNewest(searchedEntries),
    [searchedEntries, tradeSort],
  );
  const stats = useMemo(
    () => buildJournalStats(searchedEntries),
    [searchedEntries],
  );

  const formatTradePnl = useCallback(
    (amount: number) =>
      formatPnl(amount, account?.initialBalance || account?.accountSize || 1),
    [account, formatPnl],
  );

  const openTrade = useCallback(
    (trade: JournalEntry) => {
      const path = `/trades/${encodeURIComponent(trade.id)}`;
      setCachedTradeDetail(trade.id, detailRowFromEntry(trade));
      router.prefetch(path);
      router.push(path);
    },
    [router],
  );

  if (accountsLoading || (journalLoading && !entries.length)) {
    return <TradesRouteSkeleton />;
  }

  if (!account) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-black text-white">
            Select a trading account
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Trades are scoped to the active account so filters and journal stats stay consistent.
          </p>
          <Button className="mt-5" onClick={() => router.push("/accounts")}>
            Open accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] p-3 sm:p-4 lg:p-5">
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}
      <JournalFilters
        trades={sortedEntries}
        query={query}
        range={range}
        customStart={customStart}
        customEnd={customEnd}
        sort={tradeSort === "entryDate" ? "oldest" : "newest"}
        winRate={stats.rate}
        averageR={stats.r}
        formatPnl={formatTradePnl}
        onQueryChange={setQuery}
        onRangeChange={setRange}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onSortChange={(value) =>
          setTradeSort(value === "oldest" ? "entryDate" : "exitDate")
        }
        onOpenTrade={openTrade}
        onAddTrade={openTradeComposer}
      />
    </div>
  );
}
