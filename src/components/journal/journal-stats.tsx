"use client";

import {
  BarChart3,
  CheckCircle2,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { JournalMetrics } from "./use-journal-data";

export function JournalStats({
  metrics,
  setups,
  mistakes,
  planRate,
  formatPnl,
}: {
  metrics: JournalMetrics;
  setups: Array<{
    name: string;
    pnl: number;
    trades: number;
    wins: number;
    rate: number;
  }>;
  mistakes: Array<{ name: string; pnl: number; trades: number }>;
  planRate: number;
  formatPnl: (value: number, baseValue?: number) => string;
}) {
  const cards = [
    {
      label: "Net P&L",
      value: formatPnl(metrics.pnl),
      note: `${metrics.wins} wins · ${metrics.losses} losses`,
      icon: metrics.pnl >= 0 ? TrendingUp : TrendingDown,
      tone: metrics.pnl >= 0 ? "text-emerald-300" : "text-rose-300",
    },
    {
      label: "Win rate",
      value: `${metrics.rate}%`,
      note: "Closed trades",
      icon: Target,
      tone: "text-zinc-100",
    },
    {
      label: "Profit factor",
      value: metrics.profitFactor.toFixed(2),
      note: "Gross wins / losses",
      icon: BarChart3,
      tone: "text-zinc-100",
    },
    {
      label: "Plan followed",
      value: `${planRate}%`,
      note: `${metrics.averageR.toFixed(2)}R average`,
      icon: CheckCircle2,
      tone: "text-zinc-100",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-white/8 bg-[#090909] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {card.label}
              </p>
              <card.icon className="size-4 text-zinc-600" />
            </div>
            <p className={`mt-4 font-mono text-2xl font-semibold ${card.tone}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-600">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RankedPanel
          title="Setup performance"
          description="Which setups contribute the most consistent results."
          empty="No setup data yet."
          rows={setups.slice(0, 8).map((setup) => ({
            name: setup.name,
            primary: formatPnl(setup.pnl),
            secondary: `${setup.trades} trades · ${setup.rate}% win rate`,
            positive: setup.pnl >= 0,
          }))}
        />
        <RankedPanel
          title="Costly mistakes"
          description="Execution errors ranked by their total impact."
          empty="No mistakes recorded."
          rows={mistakes.slice(0, 8).map((mistake) => ({
            name: mistake.name,
            primary: formatPnl(mistake.pnl),
            secondary: `${mistake.trades} trades`,
            positive: mistake.pnl >= 0,
          }))}
        />
      </div>
    </div>
  );
}

function RankedPanel({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description: string;
  rows: Array<{
    name: string;
    primary: string;
    secondary: string;
    positive: boolean;
  }>;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/8 bg-[#090909]">
      <header className="border-b border-white/8 px-4 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-600">{description}</p>
      </header>
      {rows.length ? (
        <div className="divide-y divide-white/6">
          {rows.map((row, index) => (
            <div key={`${row.name}-${index}`} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[.035] font-mono text-[10px] text-zinc-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{row.name}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">{row.secondary}</p>
              </div>
              <p
                className={`shrink-0 font-mono text-sm font-semibold ${
                  row.positive ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {row.primary}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-zinc-600">{empty}</p>
      )}
    </section>
  );
}
