"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { RevealWords } from "./reveal-words";
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
      className="mx-auto w-[min(1180px,calc(100%-48px))] py-32 max-sm:w-[min(calc(100%-30px),1180px)] max-sm:py-20"
      aria-label="Plans"
    >
      <RevealWords
        as="h2"
        text="Start at zero. Pay when it earns it."
        className="mx-auto max-w-2xl text-center text-[clamp(24px,3.4vw,40px)] font-light leading-[1.2] tracking-[-0.02em]"
      />

      <Scroll3DStage className="mt-14 grid gap-3 lg:grid-cols-3">
        {PLANS.map((plan, index) => (
          <Scroll3D
            key={plan.name}
            as="article"
            delay={index * 0.07}
            depth={170}
            rotate={9}
            lift={42}
            className={`flex flex-col rounded-2xl border p-8 max-sm:p-6 ${
              plan.highlight
                ? "border-black/15 bg-black text-white"
                : "border-black/10 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <h3
                className={`text-[14px] ${plan.highlight ? "text-white" : "text-black"}`}
              >
                {plan.name}
              </h3>
              {plan.badge ? (
                <span className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] uppercase tracking-[.12em] text-white/70">
                  {plan.badge}
                </span>
              ) : null}
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span
                className={`text-[42px] font-light leading-none tracking-[-0.035em] ${
                  plan.highlight ? "text-white" : "text-black"
                }`}
              >
                {plan.price}
              </span>
              <span
                className={`text-[12px] ${
                  plan.highlight ? "text-white/55" : "text-black/65"
                }`}
              >
                {plan.period}
              </span>
            </p>
            <p
              className={`mt-3 text-[13px] leading-6 ${
                plan.highlight ? "text-white/65" : "text-black/55"
              }`}
            >
              {plan.tagline}
            </p>

            <ul className="mt-7 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className={`flex gap-2.5 text-[13px] leading-6 ${
                    plan.highlight ? "text-white/80" : "text-black/70"
                  }`}
                >
                  <Check
                    size={14}
                    // Icons are graphical objects: WCAG asks 3:1, and black/30
                    // on the light card measured 1.9:1.
                    className={`mt-1.5 shrink-0 ${
                      plan.highlight ? "text-white/60" : "text-black/50"
                    }`}
                  />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/pricing"
              className={`mt-8 inline-flex h-11 items-center justify-center rounded-full text-[13px] transition-opacity hover:opacity-85 ${
                plan.highlight
                  ? "bg-white text-black"
                  : "border border-black/12 text-black/75"
              }`}
            >
              See {plan.name} in full
            </Link>
          </Scroll3D>
        ))}
      </Scroll3DStage>

      <p className="mt-7 text-center text-[12px] leading-5 text-black/60">
        Billed monthly, cancel from the billing portal at any time. There is no
        trial — the Free plan is the trial, and it does not expire.
      </p>
    </section>
  );
}
