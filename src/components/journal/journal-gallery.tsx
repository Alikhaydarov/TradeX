"use client";

import { ImageIcon } from "lucide-react";

import { InstrumentBadge } from "@/components/instrument-badge";
import { MediaImage } from "@/components/media-image";
import type { JournalEntry } from "@/components/types";

export function JournalGallery({
  trades,
  formatPnl,
  onOpenTrade,
}: {
  trades: JournalEntry[];
  formatPnl: (value: number, baseValue?: number) => string;
  onOpenTrade: (trade: JournalEntry) => void;
}) {
  const mediaTrades = trades.filter(
    (trade) => trade.imageUrl || (trade.imageUrls && trade.imageUrls.length),
  );

  if (!mediaTrades.length) {
    return (
      <section className="grid min-h-64 place-items-center rounded-xl border border-dashed border-white/10 bg-[#080808] p-5 text-center">
        <div>
          <ImageIcon className="mx-auto size-5 text-zinc-600" />
          <h2 className="mt-4 text-sm font-semibold text-white">No screenshots yet</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Add charts to trade reviews to build a visual playbook.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Trade gallery</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Screenshots attached to your execution reviews.
          </p>
        </div>
        <span className="text-xs text-zinc-600">{mediaTrades.length} trades</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {mediaTrades.map((trade) => (
          <button
            key={trade.id}
            type="button"
            onClick={() => onOpenTrade(trade)}
            className="group overflow-hidden rounded-xl border border-white/8 bg-[#090909] text-left transition hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[#050505]">
              <MediaImage
                src={trade.imageUrl || trade.imageUrls?.[0] || ""}
                alt={`${trade.symbol} trade screenshot`}
                className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.015]"
              />
              {(trade.imageUrls?.length || 0) > 1 ? (
                <span className="absolute right-2 top-2 rounded-md bg-black/80 px-2 py-1 text-[9px] font-semibold text-zinc-300">
                  {trade.imageUrls?.length} images
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 p-3">
              <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 bg-[#121212]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-300">
                  {trade.setup || trade.session || "Trade review"}
                </p>
                <p className="mt-1 truncate text-[10px] text-zinc-600">
                  {trade.rawDate || trade.date}
                </p>
              </div>
              <p
                className={`shrink-0 font-mono text-xs font-semibold ${
                  trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatPnl(trade.pnl)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
