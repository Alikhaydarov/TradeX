"use client";

import { BookOpen, CheckCircle2 } from "lucide-react";

import { MediaImage } from "../media-image";
import type { JournalEntry } from "../types";

function reviewScore(entry: JournalEntry) {
  return [
    entry.note,
    entry.setup,
    entry.session,
    entry.imageUrl,
    entry.reviewCompleted,
    entry.toTradingBible,
  ].filter(Boolean).length;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-[#050505] px-3 py-2">
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

export function JournalGallery({
  trades,
  onOpenTrade,
}: {
  trades: JournalEntry[];
  onOpenTrade: (trade: JournalEntry) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
      <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            <BookOpen size={17} className="text-zinc-300" /> Trading Bible
          </h3>
          <p className="text-xs text-zinc-500">
            Eng yaxshi setup va reviewlar playbook sifatida saqlanadi.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
          <MiniStat label="BIBLE TRADES" value={String(trades.length)} />
          <MiniStat
            label="REVIEWED"
            value={String(trades.filter((trade) => trade.reviewCompleted).length)}
          />
        </div>
      </div>

      {trades.length ? (
        <div className="grid gap-3 p-3 lg:grid-cols-2">
          {trades.map((trade) => (
            <button
              key={trade.id}
              type="button"
              onClick={() => onOpenTrade(trade)}
              className="group overflow-hidden rounded-[1rem] border border-white/8 bg-[#050505] text-left transition hover:border-white/20 hover:bg-[#0d0d0d]"
            >
              {trade.imageUrl ? (
                <div className="h-40 overflow-hidden border-b border-white/8 bg-black">
                  <MediaImage
                    src={trade.imageUrl}
                    alt={`${trade.symbol} bible chart`}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
              ) : null}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${
                      trade.side === "Long"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {trade.side}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-base font-black text-white">
                      {trade.symbol}
                    </h4>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {trade.setup || "No setup"} / {trade.session || "No session"}{" "}
                      / {trade.date}
                    </p>
                  </div>
                  <span className="rounded-xl bg-[#0d0d0d] px-2.5 py-1 text-[10px] font-black text-zinc-300">
                    {reviewScore(trade)}/6
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-300">
                  {trade.note || "Review note yozilmagan."}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {trade.reviewCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#0d0d0d] px-2 py-1 text-[10px] font-bold text-zinc-300">
                      <CheckCircle2 size={11} /> Reviewed
                    </span>
                  ) : null}
                  {trade.followingPlan ? (
                    <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      Plan
                    </span>
                  ) : (
                    <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                      Off-plan
                    </span>
                  )}
                  {trade.riskPercent ? (
                    <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                      {trade.riskPercent}
                    </span>
                  ) : null}
                  {(trade.tags ?? []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-[#0d0d0d] px-2 py-1 text-[10px] text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center px-6 text-center">
          <div>
            <BookOpen className="mx-auto text-zinc-700" size={38} />
            <h3 className="mt-4 text-lg font-black">Trading Bible bo&apos;sh</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
              Trade review ochib &quot;+ to Trading Bible&quot; ni belgilang.
              Eng yaxshi setup va saboqlar shu yerda playbook bo&apos;lib
              yig&apos;iladi.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
