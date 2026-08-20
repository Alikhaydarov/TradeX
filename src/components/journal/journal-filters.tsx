"use client";

import type { TradeRange } from "@/features/trades/components/trades-archive";
import { TradesArchive } from "@/features/trades/components/trades-archive";
import type { JournalEntry } from "../types";

export type JournalTradeRange = TradeRange;
type JournalSort = "newest" | "oldest";

const TRADES_WORKSPACE_CLASS = [
  "trades-workspace",
  "[&_[data-slot='card']]:!overflow-visible [&_[data-slot='card']]:!border-xborder [&_[data-slot='card']]:!bg-xsurface [&_[data-slot='card']]:!shadow-[inset_0_1px_0_rgba(255,255,255,.025),0_18px_48px_rgba(0,0,0,.18)]",
  "[&_[data-slot='card-header']]:!border-xborder [&_[data-slot='card-header']]:!bg-xsurface",
  "[&_[data-slot='card-title']]:!text-[17px] [&_[data-slot='card-title']]:!font-black [&_[data-slot='card-title']]:!tracking-[-.025em]",
  "[&_[data-slot='card-description']]:!text-xmuted-strong",
  "[&_input]:!border-xborder [&_input]:!bg-xpanel hover:[&_input]:!border-xborder-strong hover:[&_input]:!bg-xcard focus-visible:[&_input]:!bg-xcard",
  "[&_[data-slot='select-trigger']]:!border-xborder [&_[data-slot='select-trigger']]:!bg-xpanel hover:[&_[data-slot='select-trigger']]:!border-xborder-strong hover:[&_[data-slot='select-trigger']]:!bg-xcard",
  "[&_[data-slot='tabs-list']]:!border [&_[data-slot='tabs-list']]:!border-xborder [&_[data-slot='tabs-list']]:!bg-xpanel [&_[data-slot='tabs-list']]:!p-1",
  "[&_[data-slot='tabs-trigger']]:!rounded-lg [&_[data-slot='tabs-trigger']]:!text-xmuted-strong data-[state=active]:[&_[data-slot='tabs-trigger']]:!bg-xraised data-[state=active]:[&_[data-slot='tabs-trigger']]:!text-white",
  "[&_thead]:sticky [&_thead]:top-[60px] [&_thead]:z-20 [&_thead]:bg-xpanel",
  "[&_thead_tr]:!border-xborder [&_thead_th]:!text-[10px] [&_thead_th]:!font-bold [&_thead_th]:!uppercase [&_thead_th]:!tracking-[.12em] [&_thead_th]:!text-xmuted",
  "[&_tbody_tr]:!border-xborder [&_tbody_tr]:!bg-xsurface hover:[&_tbody_tr]:!bg-xpanel",
  "[&_tbody_td]:!py-3.5",
  "[&_[data-slot='card-content']]:!bg-xsurface",
  "[&_.divide-y]:!divide-xborder",
  "max-lg:[&_thead]:static",
].join(" ");

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
    <div className={TRADES_WORKSPACE_CLASS}>
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
    </div>
  );
}
