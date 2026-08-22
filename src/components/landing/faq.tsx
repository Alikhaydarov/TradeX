"use client";

import { Plus } from "lucide-react";

import { Scroll3D, Scroll3DStage } from "./scroll-3d";

/**
 * Answers that match what the product actually does today.
 *
 * In particular: there is no free trial anywhere in the codebase, so the
 * answer says so rather than implying one.
 */
const QUESTIONS = [
  {
    q: "Is there a free plan?",
    a: "Yes, and it does not expire. Free gives you the feed, your profile, trade sharing, a manual trade journal, one trading account, and the core dashboard and calendar.",
  },
  {
    q: "Is there a free trial of the paid plans?",
    a: "No trial. Standard and Pro are billed monthly from the day you subscribe. The Free plan is there so you can use the workspace properly before paying for anything.",
  },
  {
    q: "Which trading platforms can I bring in?",
    a: "Tradovate, cTrader, MetaTrader 5, NinjaTrader, TradeLocker, Match-Trader and ProjectX. MT5 and cTrader history imports are part of the Standard plan; manual accounts work on every plan.",
  },
  {
    q: "Do I need a card to start?",
    a: "No. Manual accounts are free and sign-up asks for no payment details.",
  },
  {
    q: "What does Tradoxy AI do on the Pro plan?",
    a: "It answers from your own journal data, in your language: account reports built from the trades you logged, and notifications about risk, psychology patterns and news that touches your instruments.",
  },
  {
    q: "How do I cancel?",
    a: "From the billing portal, which opens from the pricing page once you are subscribed. Cancelling leaves your journal and profile in place on the Free plan.",
  },
];

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="relative z-[1] mx-auto w-[min(1180px,calc(100%-48px))] border-t border-white/[.11] py-[110px] max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-labelledby="faq-heading"
    >
      <div className="auth3-section-title" data-reveal>
        <span>QUESTIONS</span>
        <h2 id="faq-heading">
          The things people
          <br />
          ask before signing up.
        </h2>
      </div>

      <Scroll3DStage className="mt-12 grid gap-3 lg:grid-cols-2">
        {QUESTIONS.map((item, index) => (
          <Scroll3D
            key={item.q}
            delay={(index % 2) * 0.07}
            depth={150}
            rotate={8}
            lift={38}
          >
            <details className="group rounded-2xl border border-white/8 bg-white/[.02] px-6 py-5 open:bg-white/[.035] max-sm:px-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-semibold tracking-tight text-white">
                {item.q}
                <Plus
                  size={17}
                  className="mt-0.5 shrink-0 text-ink-faint transition-transform duration-300 group-open:rotate-45"
                />
              </summary>
              <p className="mt-3 text-[13px] leading-7 text-ink-mute">{item.a}</p>
            </details>
          </Scroll3D>
        ))}
      </Scroll3DStage>
    </section>
  );
}
