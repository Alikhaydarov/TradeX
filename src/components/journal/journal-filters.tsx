"use client";

import type { TradeRange } from "@/features/trades/components/trades-archive";
import { TradesArchive } from "@/features/trades/components/trades-archive";
import type { JournalEntry } from "../types";

export type JournalTradeRange = TradeRange;
type JournalSort = "newest" | "oldest";

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
  sort: JournalSort;
  winRate: number;
  averageR: number;
  formatPnl: (value: number) => string;
  onQueryChange: (value: string) => void;
  onRangeChange: (value: TradeRange) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onSortChange: (value: JournalSort) => void;
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
      sort={sort === "oldest" ? "entryDate" : "exitDate"}
      winRate={winRate}
      averageR={averageR}
      formatPnl={formatPnl}
      onQueryChange={onQueryChange}
      onRangeChange={onRangeChange}
      onCustomStartChange={onCustomStartChange}
      onCustomEndChange={onCustomEndChange}
      onSortChange={(value) =>
        onSortChange(value === "entryDate" ? "oldest" : "newest")
      }
      onOpenTrade={onOpenTrade}
      onAddTrade={onAddTrade}
    />
  );
}
