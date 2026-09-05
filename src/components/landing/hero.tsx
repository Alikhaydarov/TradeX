"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { TradoxyMark } from "../tradoxy-mark";
import { CountUp } from "./count-up";
import { LaptopScroll, RotatingWord } from "./laptop-scroll";
import { RevealWords } from "./reveal-words";

export function LandingNav({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <nav className="relative z-10 mx-auto flex w-[min(1180px,calc(100%-48px))] items-center justify-between py-6 max-sm:w-[min(calc(100%-30px),1180px)]">
      <Link
        href="/"
        className="flex items-center gap-2.5"
        aria-label="Tradoxy home"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-black">
          <TradoxyMark className="size-3.5 text-white" />
        </span>
        <span className="text-[15px] tracking-[-0.01em] text-black">
          Tradoxy
        </span>
      </Link>

      <div className="flex items-center gap-5 text-[13px] text-black/60 max-lg:hidden">
        <a href="#angles" className="-my-1 rounded px-2 py-1.5 transition-colors hover:text-black">
          Workspace
        </a>
        <a href="#how" className="-my-1 rounded px-2 py-1.5 transition-colors hover:text-black">
          How it works
        </a>
        <a href="#plans" className="-my-1 rounded px-2 py-1.5 transition-colors hover:text-black">
          Plans
        </a>
        <a href="#faq" className="-my-1 rounded px-2 py-1.5 transition-colors hover:text-black">
          FAQ
        </a>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLogin}
          className="rounded-full px-4 py-2 text-[13px] text-black/60 transition-colors hover:text-black max-sm:hidden"
        >
          Sign in
        </button>
        <button
          onClick={onRegister}
          className="rounded-full bg-black px-5 py-2.5 text-[13px] text-white transition-opacity hover:opacity-85"
        >
          Get started
        </button>
      </div>
    </nav>
  );
}

export function LandingHero({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const enter = (delay: number, distance = 18) => ({
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative z-10 mx-auto flex min-h-[88svh] w-[min(1180px,calc(100%-48px))] flex-col items-center justify-start pb-44 pt-[8svh] text-center max-sm:min-h-[76svh] max-sm:w-[min(calc(100%-30px),1180px)] max-sm:pb-28 max-sm:pt-8">
      <motion.div
        {...enter(0)}
        className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/50 px-3 py-1.5 text-[11px] font-medium text-black/55 shadow-sm backdrop-blur-md"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-40 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
        </span>
        A trading journal that learns with you
      </motion.div>

      <motion.p
        {...enter(0.08)}
        className="text-[clamp(13px,1.4vw,16px)] font-medium uppercase text-black/55"
      >
        Tradoxy
      </motion.p>

      <motion.h1
        {...enter(0.14, 24)}
        className="mx-auto mt-4 max-w-5xl text-[clamp(42px,7vw,84px)] font-light leading-[1.04] tracking-normal text-black"
      >
        Trade with a process.
        <br />
        Grow with every <RotatingWord className="text-black/50" />
      </motion.h1>

      <motion.p
        {...enter(0.24)}
        className="mx-auto mt-7 max-w-xl text-[15px] leading-7 text-black/60 max-sm:max-w-sm max-sm:text-[14px]"
      >
        Journal the decision, review the execution, and turn real account data
        into a repeatable trading edge.
      </motion.p>

      <motion.div
        {...enter(0.32)}
        className="mt-9 flex flex-wrap items-center justify-center gap-2.5"
      >
        <button
          onClick={onRegister}
          className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-black px-7 py-3 text-[13px] font-semibold text-white shadow-[0_16px_36px_-20px_rgba(0,0,0,.8)] transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          Start your journal{" "}
          <ArrowRight
            size={15}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>
        <button
          onClick={onLogin}
          className="min-h-12 rounded-full border border-black/12 bg-white/25 px-7 py-3 text-[13px] font-medium text-black/70 transition-all duration-300 hover:border-black/30 hover:bg-white/55 hover:text-black"
        >
          Sign in
        </button>
      </motion.div>
    </section>
  );
}

/** The hero device: a laptop that opens into the dashboard as you scroll. */
export function LandingDevice() {
  return (
    <LaptopScroll>
      <HeroBoard />
    </LaptopScroll>
  );
}

/** A calm, static picture of the dashboard - the product, not a stock photo. */
function HeroBoard() {
  return (
    <div className="h-full overflow-hidden p-7 max-sm:p-4" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-white/8 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-6 place-items-center rounded-md bg-white">
            <TradoxyMark className="size-3 text-black" />
          </span>
          <span className="text-[12px] text-white/70">Overview</span>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">
          30D
        </span>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[11px] uppercase tracking-[.16em] text-white/55">
            Net P&amp;L
          </p>
          <p className="mt-1 text-[clamp(26px,4vw,38px)] font-light tabular-nums text-emerald-300">
            +$12,840.20
          </p>
          <svg
            viewBox="0 0 640 200"
            preserveAspectRatio="none"
            className="mt-4 h-40 w-full"
          >
            <defs>
              <linearGradient id="tdx-hero-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,.18)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <path
              d="M0 170 L53 158 L106 163 L160 126 L213 137 L266 101 L320 117 L373 71 L426 88 L480 56 L533 68 L586 32 L640 18 L640 200 L0 200 Z"
              fill="url(#tdx-hero-fill)"
            />
            <path
              d="M0 170 L53 158 L106 163 L160 126 L213 137 L266 101 L320 117 L373 71 L426 88 L480 56 L533 68 L586 32 L640 18"
              fill="none"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="grid content-start gap-2.5">
          {[
            ["Win rate", "68.2%"],
            ["Profit factor", "2.14"],
            ["Best streak", "9 trades"],
            ["Risk today", "0.72%"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[.02] px-3.5 py-2.5"
            >
              <span className="text-[11px] text-white/60">{label}</span>
              <span className="text-[13px] tabular-nums text-white">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Four facts, counted up as they arrive.
 *
 * Not one of them is a social-proof figure we cannot back: the platform count,
 * the free plan's price, the two supported history imports and the AI on Pro
 * are all checkable a screen or two away.
 */
export function LandingFigures() {
  return (
    <section className="mx-auto mt-20 w-[min(1180px,calc(100%-48px))] max-sm:mt-10 max-sm:w-[min(calc(100%-30px),1180px)]">
      <RevealWords
        as="h2"
        text="Key figures"
        className="text-center text-[clamp(24px,3vw,34px)] font-light tracking-[-0.02em]"
      />

      <div className="mt-10 grid grid-cols-2 border-y border-black/10 text-center lg:grid-cols-4">
        <Figure value={7} label="Supported platforms" />
        <Figure value={0} prefix="$" label="Free plan, forever" />
        <Figure value={2} label="One-click history imports" />
        <Figure value={3} label="Plans, including free" />
      </div>
    </section>
  );
}

function Figure({
  value,
  label,
  prefix,
}: {
  value: number;
  label: string;
  prefix?: string;
}) {
  return (
    <div className="relative flex min-h-36 flex-col items-center justify-center px-3 py-8 after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-px after:bg-black/10 even:after:hidden lg:even:after:block lg:last:after:hidden max-sm:nth-[n+3]:border-t max-sm:nth-[n+3]:border-black/10">
      <p className="text-[34px] font-light leading-none tracking-[-0.03em] text-black sm:text-[38px]">
        <CountUp value={value} prefix={prefix} />
      </p>
      <p className="mt-3 text-[12px] leading-5 text-black/60 sm:text-[13px]">{label}</p>
    </div>
  );
}

/** The page's one long claim, filled in word by word as you read it. */
export function LandingStatement() {
  return (
    <section className="mx-auto mt-32 w-[min(760px,calc(100%-48px))] pb-32 text-center max-sm:mt-20 max-sm:w-[min(calc(100%-30px),760px)] max-sm:pb-20">
      <span className="grid size-8 place-items-center rounded-lg bg-black mx-auto">
        <TradoxyMark className="size-4 text-white" />
      </span>
      <RevealWords
        text="Turn any trading account into a record you can trust. Journal the decision while it is fresh, measure the execution against it, and share progress that came from a real synced account."
        className="mt-8 text-[clamp(20px,2.8vw,32px)] font-light leading-[1.35] tracking-[-0.02em]"
      />
    </section>
  );
}
