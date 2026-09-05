"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LandingBento, LandingPlatforms } from "./landing/dark-sections";
import { LandingFaq } from "./landing/faq";
import {
  LandingDevice,
  LandingFigures,
  LandingHero,
  LandingNav,
  LandingStatement,
} from "./landing/hero";
import { LandingPlans } from "./landing/plans";
import { LandingRail } from "./landing/rail";
import { LandingShowcase3D } from "./landing-showcase-3d";
import { TradoxyMark } from "./tradoxy-mark";

/**
 * The first-visit page.
 *
 * It opens light and turns to black at the point where the product itself
 * takes over, then comes back to light for the plans and the questions. The
 * two halves each set their own --reveal-from / --reveal-to, which is all the
 * word-by-word reveals need in order to work on either background.
 */
export function TradoxyLoginLanding({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("auth_error");
    if (!code) return;
    const messages: Record<string, string> = {
      not_configured: "Authentication is not configured yet.",
      unsupported_provider: "That sign-in method is not supported.",
      oauth_start:
        "This provider is not enabled yet. Please use another sign-in method.",
      oauth: "Sign-in could not be completed. Please try again.",
    };
    setAuthError(messages[code] ?? "Sign-in could not be completed.");
    url.searchParams.delete("auth_error");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  return (
    <main className="min-h-dvh overflow-x-clip bg-[#f3f3f0] text-black [--reveal-from:rgba(10,10,10,.62)] [--reveal-to:#0a0a0a]">
      <LandingNav onLogin={onLogin} onRegister={onRegister} />

      {authError && (
        <div
          className="mx-auto flex w-[min(1180px,calc(100%-48px))] items-center justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700 max-sm:w-[min(calc(100%-30px),1180px)]"
          role="alert"
        >
          {authError}
          <button
            onClick={() => setAuthError(null)}
            aria-label="Dismiss"
            className="grid size-6 place-items-center rounded-full text-lg hover:bg-black/5"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      <LandingHero onLogin={onLogin} onRegister={onRegister} />
      <LandingDevice />
      <LandingFigures />
      <LandingStatement />

      <div
        id="angles"
        className="rounded-[40px] bg-black text-white [--reveal-from:rgba(255,255,255,.55)] [--reveal-to:#ffffff] max-sm:rounded-[28px]"
      >
        <LandingRail />
        <LandingBento />
        <LandingShowcase3D />
        <LandingPlatforms />
      </div>

      <LandingPlans />
      <LandingFaq />

      <section className="mx-auto w-[min(1180px,calc(100%-48px))] pb-24 max-sm:w-[min(calc(100%-30px),1180px)]">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-black px-10 py-14 max-sm:px-7 max-sm:py-10">
          <div>
            <p className="text-[11px] uppercase tracking-[.18em] text-white/55">
              Your next session starts here
            </p>
            <h2 className="mt-4 max-w-md text-[clamp(24px,3.2vw,36px)] font-light leading-[1.2] tracking-[-0.02em] text-white">
              Build a trading process you can actually repeat.
            </h2>
          </div>
          <button
            onClick={onRegister}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] text-black transition-opacity hover:opacity-85 max-sm:w-full max-sm:justify-center"
          >
            Create your workspace <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer className="mx-auto flex w-[min(1180px,calc(100%-48px))] flex-wrap items-center justify-between gap-4 border-t border-black/8 py-8 text-[12px] text-black/60 max-sm:w-[min(calc(100%-30px),1180px)]">
        <Link href="/" className="flex items-center gap-2.5 text-black">
          <span className="grid size-6 place-items-center rounded-md bg-black">
            <TradoxyMark className="size-3 text-white" />
          </span>
          Tradoxy
        </Link>
        <p>Trading clarity, one session at a time.</p>
        <span>© 2026 Tradoxy</span>
      </footer>
    </main>
  );
}
