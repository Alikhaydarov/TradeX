"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Scroll3D, Scroll3DStage } from "./scroll-3d";

/**
 * A preview of the real plans.
 *
 * The figures and the bullets are copied from the pricing page, which in turn
 * matches the Stripe products ($15 and $25 a month), so the landing page can
 * never quietly drift away from what a visitor is actually charged.
 */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "The essentials for starting a focused trading journal.",
    features: [
      "Feed, profile and trade sharing",
      "Manual trade journal",
      "One trading account",
      "Core dashboard and calendar",
    ],
  },
  {
    name: "Standard",
    price: "$15",
    period: "per month",
    tagline: "Verified workspace with account sync and expanded analytics.",
    features: [
      "Blue verified profile badge",
      "Multiple trading accounts",
      "MT5 and cTrader history imports",
      "Expanded journal analytics",
    ],
  },
  {
    name: "Pro",
    price: "$25",
    period: "per month",
    badge: "Tradoxy AI",
    highlight: true,
    tagline: "The complete workspace with account-scoped artificial intelligence.",
    features: [
      "Everything included in Standard",
      "Multilingual Tradoxy AI chat",
      "Account reports from journal data",
      "Smart risk, psychology and news notifications",
    ],
  },
];

export function LandingPlans() {
  return (
    <section
      id="plans"
      className="relative z-[1] mx-auto w-[min(1180px,calc(100%-48px))] border-t border-white/[.11] py-[110px] max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-labelledby="plans-heading"
    >
      <div className="auth3-section-title" data-reveal>
        <span>PLANS</span>
        <h2 id="plans-heading">
          Start at zero.
          <br />
          Pay only when it earns it.
        </h2>
      </div>

      <Scroll3DStage className="mt-12 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan, index) => (
          <Scroll3D
            key={plan.name}
            as="article"
            delay={index * 0.09}
            depth={190}
            rotate={9}
            lift={46}
            className={`flex flex-col rounded-2xl border p-7 max-sm:p-6 ${
              plan.highlight
                ? "border-white/25 bg-white/[.05]"
                : "border-white/8 bg-white/[.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-white">
                {plan.name}
              </h3>
              {plan.badge ? (
                <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.12em] text-ink-soft">
                  {plan.badge}
                </span>
              ) : null}
            </div>

            <p className="mt-5 flex items-baseline gap-2">
              <span className="text-[40px] font-bold leading-none tracking-[-0.045em] text-white">
                {plan.price}
              </span>
              <span className="text-[12px] text-ink-faint">{plan.period}</span>
            </p>
            <p className="mt-3 text-[13px] leading-6 text-ink-mute">{plan.tagline}</p>

            <ul className="mt-6 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-[13px] leading-6 text-ink-soft">
                  <Check size={15} className="mt-1 shrink-0 text-ink-faint" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/pricing"
              className={`mt-7 inline-flex h-11 items-center justify-center rounded-xl text-[13px] font-semibold transition-colors ${
                plan.highlight
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "border border-white/12 text-ink-soft hover:border-white/25 hover:text-white"
              }`}
            >
              See {plan.name} in full
            </Link>
          </Scroll3D>
        ))}
      </Scroll3DStage>

      <p className="mt-6 text-[12px] text-ink-faint">
        Billed monthly, cancel from the billing portal at any time. There is no
        trial - the Free plan is the trial, and it does not expire.
      </p>
    </section>
  );
}
