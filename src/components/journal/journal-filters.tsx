"use client";

import dynamic from "next/dynamic";

import type { TradeRange } from "@/features/trades/components/trades-archive";
import type { JournalEntry } from "../types";
import { PageSkeleton } from "../page-skeleton";
import type { TradeSortMode } from "../workspace-preferences-context";

const TradesArchive = dynamic(
  () =>
    import("@/features/trades/components/trades-archive").then(
      (module) => module.TradesArchive,
    ),
  { loading: () => <PageSkeleton label="Loading trades" /> },
);

export type JournalTradeRange = TradeRange;

export function JournalFilters({
  trades,
  query,
  range,
  customStart,
  customEnd,
  sort,
  winRate,
  averageR,
  formatPnl,
  onQueryChange,
  onRangeChange,
  onCustomStartChange,
  onCustomEndChange,
  onSortChange,
  onOpenTrade,
  onAddTrade,
}: {
  trades: JournalEntry[];
  query: string;
  range: TradeRange;
  customStart: string;
  customEnd: string;
  sort: TradeSortMode;
  winRate: number;
  averageR: number;
  formatPnl: (value: number) => string;
  onQueryChange: (value: string) => void;
  onRangeChange: (value: TradeRange) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onSortChange: (value: TradeSortMode) => void;
  onOpenTrade: (trade: JournalEntry) => void;
  onAddTrade: () => void;
}) {
  return (
    <TradesArchive
      trades={trades}
      query={query}
      range={range}
      customStart={customStart}
      customEnd={customEnd}
      sort={sort}
      winRate={winRate}
      averageR={averageR}
      formatPnl={formatPnl}
      onQueryChange={onQueryChange}
      onRangeChange={onRangeChange}
      onCustomStartChange={onCustomStartChange}
      onCustomEndChange={onCustomEndChange}
      onSortChange={onSortChange}
      onOpenTrade={onOpenTrade}
      onAddTrade={onAddTrade}
    />
  );
}
