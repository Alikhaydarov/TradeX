"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { RevealWords } from "./reveal-words";

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
      className="mx-auto w-[min(1180px,calc(100%-48px))] border-t border-black/8 py-28 max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-label="Frequently asked questions"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)]">
        <div>
          <RevealWords
            as="h2"
            text="Frequently asked questions"
            className="max-w-xs text-[clamp(26px,3.4vw,40px)] font-light leading-[1.15] tracking-[-0.02em]"
          />
          <p className="mt-5 max-w-xs text-[13px] leading-6 text-black/55">
            Everything worth knowing before you make an account.
          </p>
          <Link
            href="/pricing"
            className="mt-7 inline-flex rounded-full bg-black px-5 py-2.5 text-[13px] text-white transition-opacity hover:opacity-85"
          >
            See full pricing
          </Link>
        </div>

        <div>
          {QUESTIONS.map((item) => (
            <details
              key={item.q}
              className="group border-b border-black/8 py-5 first:border-t"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[14px] text-black">
                {item.q}
                <Plus
                  size={16}
                  className="mt-0.5 shrink-0 text-black/30 transition-transform duration-300 group-open:rotate-45"
                />
              </summary>
              <p className="mt-3 max-w-xl text-[13px] leading-7 text-black/60">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
