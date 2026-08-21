"use client";

import { Search } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { SkeletonBlock } from "../app-loader";
import { InstrumentBadge } from "../instrument-badge";
import { TradeShareComposer } from "../trade-share-composer";
import type { JournalEntry } from "../types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function PostComposer({
  open,
  onOpenChange,
  accountOptions,
  accountFilter,
  onAccountFilterChange,
  query,
  onQueryChange,
  loading,
  trades,
  onSelectTrade,
  onOpenJournal,
  shareTarget,
  onCloseShare,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountOptions: Array<{ id: string; label: string }>;
  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  trades: JournalEntry[];
  onSelectTrade: (trade: JournalEntry) => void;
  onOpenJournal: () => void;
  shareTarget: JournalEntry | null;
  onCloseShare: () => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88dvh] overflow-hidden border-border bg-surface-raised p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-4 py-4">
            <DialogTitle className="text-xl font-black">
              {t("shareTrade")}
            </DialogTitle>
            <p className="text-sm text-zinc-500">{t("pickTrade")}</p>
          </DialogHeader>

          <div className="border-b border-border p-3">
            {accountOptions.length > 1 ? (
              <div className="mb-3">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Account
                </span>
                <Select
                  value={accountFilter}
                  onValueChange={onAccountFilterChange}
                >
                  <SelectTrigger className="h-11 rounded-lg border border-border bg-black/15">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    {accountOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-black/15 px-3 focus-within:border-white/25">
              <Search size={17} className="text-zinc-500" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("searchTrade")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
            </label>
          </div>

          <div className="max-h-[55dvh] overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-1" role="status" aria-label="Loading trades">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3"
                  >
                    <SkeletonBlock className="size-8 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <SkeletonBlock className="h-3 w-28" />
                      <SkeletonBlock className="mt-2 h-3 w-20" />
                    </div>
                    <SkeletonBlock className="h-4 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            ) : trades.length ? (
              <div className="space-y-1">
                {trades.map((trade) => {
                  const win = trade.pnl >= 0;
                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => onSelectTrade(trade)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/[.045]"
                    >
                      <InstrumentBadge
                        symbol={trade.symbol}
                        compact
                        className="shrink-0 rounded-xl bg-black/25"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                              trade.side === "Long"
                                ? "bg-emerald-400/15 text-emerald-300"
                                : "bg-rose-400/15 text-rose-300"
                            }`}
                          >
                            {trade.side}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {trade.rawDate}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-zinc-500">
                          {trade.setup ||
                            trade.session ||
                            trade.note ||
                            "No review note"}
                        </span>
                        {trade.accountName ? (
                          <span className="mt-1 block truncate text-[10px] text-zinc-600">
                            {trade.accountName}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-right">
                        <strong
                          className={`block font-mono text-sm font-black ${
                            win ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {win ? "+" : ""}${Math.abs(trade.pnl).toFixed(2)}
                        </strong>
                        <span className="font-mono text-[10px] text-zinc-600">
                          {(trade.resultR || 0).toFixed(2)}R
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center px-6 text-center">
                <div>
                  <p className="text-sm font-bold">{t("noTrades")}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {t("addTradeFirst")}
                  </p>
                  <Button
                    className="mt-4 min-h-11 bg-white text-black hover:bg-zinc-200"
                    onClick={onOpenJournal}
                  >
                    {t("openJournal")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TradeShareComposer trade={shareTarget} onClose={onCloseShare} />
    </>
  );
}
