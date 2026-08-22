"use client";

import { Scroll3D, Scroll3DStage } from "./scroll-3d";

/**
 * Four facts about the product, not four invented statistics.
 *
 * Landing pages in this category like to open with "12,000 traders" numbers.
 * We do not have those numbers, so every figure here is something a visitor
 * can check on the pricing page or in the platform list a screen below.
 */
const FACTS = [
  {
    figure: "7",
    label: "Supported platforms",
    note: "Tradovate, cTrader, MT5, NinjaTrader, TradeLocker, Match-Trader and ProjectX.",
  },
  {
    figure: "$0",
    label: "Free plan, forever",
    note: "Feed, profile, trade sharing, a manual journal and one trading account.",
  },
  {
    figure: "2",
    label: "One-click history imports",
    note: "MT5 and cTrader history lands in the journal on the Standard plan.",
  },
  {
    figure: "AI",
    label: "Account reports on Pro",
    note: "Tradoxy AI reads your own journal data and answers in your language.",
  },
];

export function LandingMetrics() {
  return (
    <section className="relative z-[1] mx-auto w-[min(1180px,calc(100%-48px))] border-y border-white/[.11] py-14 max-sm:w-[min(calc(100%-30px),1180px)]">
      <Scroll3DStage className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/[.06] sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((fact, index) => (
          <Scroll3D
            key={fact.label}
            as="article"
            delay={index * 0.08}
            depth={120}
            rotate={7}
            lift={34}
            className="bg-black p-6"
          >
            <p className="text-[34px] font-bold leading-none tracking-[-0.04em] text-white">
              {fact.figure}
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.16em] text-ink-subtle">
              {fact.label}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-ink-mute">{fact.note}</p>
          </Scroll3D>
        ))}
      </Scroll3DStage>
    </section>
  );
}
