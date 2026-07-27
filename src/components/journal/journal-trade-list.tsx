"use client";

import type { JournalEntry } from "@/components/types";
import { useWorkspacePreferences } from "@/components/workspace-preferences-context";
import {
  TradesArchive,
  type TradeRange,
} from "@/features/trades/components/trades-archive";

export function JournalTradeList({
  trades,
  query,
  range,
  customStart,
  customEnd,
  winRate,
  averageR,
  onQueryChange,
  onRangeChange,
  onCustomStartChange,
  onCustomEndChange,
  onOpenTrade,
  onAddTrade,
}: {
  trades: JournalEntry[];
  query: string;
  range: TradeRange;
  customStart: string;
  customEnd: string;
  winRate: number;
  averageR: number;
  onQueryChange: (value: string) => void;
  onRangeChange: (value: TradeRange) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onOpenTrade: (trade: JournalEntry) => void;
  onAddTrade: () => void;
}) {
  const { tradeSort, setTradeSort, formatPnl } = useWorkspacePreferences();

  const sortedTrades = [...trades].sort((left, right) => {
    const comparison = String(left.rawDate || "").localeCompare(
      String(right.rawDate || ""),
    );
    return tradeSort === "entryDate" ? comparison : -comparison;
  });

  return (
    <TradesArchive
      trades={sortedTrades}
      query={query}
      range={range}
      customStart={customStart}
      customEnd={customEnd}
      sort={tradeSort}
      winRate={winRate}
      averageR={averageR}
      formatPnl={formatPnl}
      onQueryChange={onQueryChange}
      onRangeChange={onRangeChange}
      onCustomStartChange={onCustomStartChange}
      onCustomEndChange={onCustomEndChange}
      onSortChange={setTradeSort}
      onOpenTrade={onOpenTrade}
      onAddTrade={onAddTrade}
    />
  );
}
