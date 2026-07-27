"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PLATFORMS = [
  { name: "Tradovate", logo: "/platforms/tradovate.png", note: "Futures" },
  { name: "cTrader", logo: "/platforms/ctrader.svg", note: "Forex & CFD" },
  {
    name: "MetaTrader 5",
    logo: "/platforms/metatrader5.png",
    note: "Multi-asset",
  },
  {
    name: "NinjaTrader",
    logo: "/platforms/ninjatrader.png",
    note: "Futures",
  },
  {
    name: "TradeLocker",
    logo: "/platforms/tradelocker.png",
    note: "Multi-asset",
  },
  {
    name: "Match-Trader",
    logo: "/platforms/matchtrader.png",
    note: "Forex & CFD",
  },
  { name: "ProjectX", logo: "/platforms/projectx.png", note: "Futures" },
];

const PREVIEW_BARS = [
  "h-[34%]",
  "h-[48%]",
  "h-[29%]",
  "h-[58%]",
  "h-[43%]",
  "h-[69%]",
  "h-[53%]",
  "h-[77%]",
  "h-[61%]",
  "h-[88%]",
  "h-[73%]",
  "h-full",
];

const FEATURE_BARS = ["h-[44%]", "h-[72%]", "h-[56%]", "h-[88%]", "h-[64%]"];

function MarketCanvas() {
  return (
    <div className="relative min-h-[355px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.012)_60%),#050505] p-4 shadow-[0_35px_100px_rgba(0,0,0,.7)] sm:min-h-[500px] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,transparent,#000_35%,transparent)]" />
      <div className="relative flex items-center justify-between text-[11px] font-semibold text-zinc-500">
        <span className="flex items-center gap-2">
          <i className="size-1.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,.08)]" />
          Live performance
        </span>
        <b className="rounded-lg border border-white/10 px-2.5 py-1.5 text-zinc-400">
          30D
        </b>
      </div>
      <div className="relative mt-8 flex items-end justify-between gap-4">
        <div>
          <small className="block text-[11px] text-zinc-600">Net P&amp;L</small>
          <strong className="mt-2 block font-mono text-2xl tracking-[-0.055em] text-white sm:text-4xl">
            +$12,840.20
          </strong>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-[11px] text-zinc-300">
          +18.4%
        </span>
      </div>
      <svg
        viewBox="0 0 720 260"
        preserveAspectRatio="none"
        className="relative mt-5 h-[150px] w-full overflow-visible sm:h-[230px]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tradeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".18" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          fill="url(#tradeFill)"
          d="M0 222L55 205L105 212L158 166L212 179L267 135L322 153L376 96L430 117L484 77L538 92L590 48L645 62L720 25V260H0Z"
        />
        <path
          fill="none"
          stroke="#eee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M0 222L55 205L105 212L158 166L212 179L267 135L322 153L376 96L430 117L484 77L538 92L590 48L645 62L720 25"
        />
      </svg>
      <div className="relative grid grid-cols-3 border-t border-white/10">
        {[
          ["Win rate", "68.2%"],
          ["Profit factor", "2.14"],
          ["Best streak", "9 trades"],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`px-2 pt-4 ${index < 2 ? "border-r border-white/10" : ""}`}
          >
            <span className="block text-[9px] text-zinc-600 sm:text-[10px]">
              {label}
            </span>
            <b className="mt-1 block font-mono text-[11px] text-zinc-200 sm:text-[13px]">
              {value}
            </b>
          </div>
        ))}
      </div>
      <div className="absolute right-5 top-24 hidden items-center gap-2 rounded-full border border-white/15 bg-black/90 px-3 py-2 text-[11px] font-semibold text-zinc-300 shadow-xl backdrop-blur sm:flex xl:-right-8">
        <Check size={13} /> Plan followed
      </div>
      <div className="absolute bottom-20 left-5 hidden items-center gap-3 rounded-2xl border border-white/15 bg-black/90 p-2.5 pr-4 shadow-xl backdrop-blur sm:flex xl:-left-10">
        <span className="grid size-8 place-items-center rounded-lg bg-white text-xs font-black text-black">
          R
        </span>
        <span>
          <small className="block text-[9px] text-zinc-600">Risk today</small>
          <b className="font-mono text-xs text-white">0.72%</b>
        </span>
      </div>
    </div>
  );
}

function PlatformPreview() {
  return (
    <div className="grid min-h-[360px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#050505] shadow-[0_35px_90px_rgba(0,0,0,.55)] sm:min-h-[430px] sm:grid-cols-[145px_1fr]">
      <div className="hidden flex-col gap-2 border-r border-white/10 bg-white/[0.018] p-4 sm:flex">
        {[
          [BarChart3, "Overview", true],
          [BookOpen, "Journal", false],
          [Users, "Community", false],
        ].map(([Icon, label, active]) => {
          const ItemIcon = Icon as typeof BarChart3;
          return (
            <span
              key={String(label)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-semibold ${active ? "bg-white text-black" : "text-zinc-600"}`}
            >
              <ItemIcon size={14} /> {String(label)}
            </span>
          );
        })}
      </div>
      <div className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
          <span>Connected accounts</span>
          <b className="flex items-center gap-2 text-[9px] font-medium text-zinc-600">
            <i className="size-1.5 rounded-full bg-white" /> Synced now
          </b>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Combined balance", "$48,240", "4 accounts"],
            ["Execution score", "91.4", "Top 8%"],
          ].map(([label, value, note]) => (
            <div
              key={label}
              className="rounded-xl border border-white/8 bg-white/[0.025] p-4"
            >
              <small className="block text-[9px] text-zinc-600">{label}</small>
              <strong className="mt-3 block font-mono text-xl tracking-tight text-white">
                {value}
              </strong>
              <span className="mt-2 block text-[9px] text-zinc-500">{note}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex h-[190px] items-end gap-2 border-b border-white/10 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:100%_42px] px-2 sm:h-[210px]">
          {PREVIEW_BARS.map((height, index) => (
            <i
              key={index}
              className={`${height} min-w-1 flex-1 rounded-t bg-gradient-to-t from-white/10 to-white/70`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TradeWayLoginLanding({
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
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-zinc-100 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_76%_18%,rgba(255,255,255,.085),transparent_25%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] before:bg-[size:auto,64px_64px,64px_64px] before:[mask-image:linear-gradient(to_bottom,#000_0,transparent_72%)]">
      <nav className="relative z-10 mx-auto flex min-h-[68px] w-[calc(100%-30px)] max-w-[1180px] items-center justify-between border-b border-white/10 sm:min-h-[78px] sm:w-[calc(100%-48px)]">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <b className="grid size-8 place-items-center rounded-lg bg-white text-[11px] font-black text-black">
            TD
          </b>
          <span>Tradox</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500 sm:gap-7">
          <a href="#workflow" className="hidden transition hover:text-white md:block">
            Product
          </a>
          <Link href="/pricing" className="hidden transition hover:text-white sm:block">
            Pricing
          </Link>
          <button onClick={onLogin} className="hidden transition hover:text-white sm:block">
            Sign in
          </button>
          <button
            onClick={onRegister}
            className="min-h-11 rounded-full bg-white px-4 text-xs font-bold text-black transition hover:bg-zinc-200 sm:px-5 sm:text-sm"
          >
            Get started
          </button>
        </div>
      </nav>

      {authError ? (
        <div className="relative z-10 mx-auto mt-4 flex w-[calc(100%-30px)] max-w-[1180px] items-center justify-between gap-4 rounded-xl border border-rose-400/20 bg-rose-950/30 px-4 py-3 text-xs text-rose-300 sm:w-[calc(100%-48px)]">
          {authError}
          <button
            onClick={() => setAuthError(null)}
            className="grid size-8 place-items-center rounded-full transition hover:bg-white/10"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="relative z-10 mx-auto grid w-[calc(100%-30px)] max-w-[1180px] gap-14 py-16 sm:w-[calc(100%-48px)] sm:py-20 lg:min-h-[820px] lg:items-center lg:gap-16 lg:py-24">
        <div className="mx-auto max-w-[880px] animate-in fade-in slide-in-from-bottom-4 text-center duration-700">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 sm:text-[11px]">
            <span className="h-px w-6 bg-white" /> Built for deliberate traders
          </div>
          <h1 className="mt-6 text-[clamp(3.1rem,12vw,6rem)] font-semibold leading-[0.91] tracking-[-0.075em] text-white sm:text-[clamp(3.8rem,8vw,6rem)]">
            Trade less.
            <br />
            <em className="not-italic text-zinc-600">Learn faster.</em>
          </h1>
          <p className="mx-auto mt-7 max-w-[620px] text-sm leading-7 text-zinc-500 sm:text-base">
            One focused workspace to journal decisions, measure execution and
            share verified progress with traders you trust.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row">
            <button
              onClick={onRegister}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200"
            >
              Start for free <ArrowRight size={17} />
            </button>
            <button
              onClick={onLogin}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 px-6 text-sm font-bold text-zinc-300 transition hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
            >
              I have an account
            </button>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-[11px] text-zinc-600 sm:flex-row sm:gap-5">
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} /> Secure Supabase auth
            </span>
            <span className="flex items-center gap-2">
              <Check size={14} /> No card required
            </span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1040px] animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <MarketCanvas />
        </div>
      </section>

      <section className="relative z-10 mx-auto flex w-[calc(100%-30px)] max-w-[1180px] flex-col gap-5 border-y border-white/10 py-6 sm:w-[calc(100%-48px)] lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-600">
          Fits your existing trading workflow
        </p>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((platform) => (
            <span
              key={platform.name}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.025] py-1.5 pl-1.5 pr-3 text-[11px] font-semibold text-zinc-400"
            >
              <Image src={platform.logo} alt="" width={22} height={22} />
              {platform.name}
            </span>
          ))}
        </div>
      </section>

      <section
        id="workflow"
        className="relative z-10 mx-auto w-[calc(100%-30px)] max-w-[1180px] py-20 sm:w-[calc(100%-48px)] sm:py-28"
      >
        <div>
          <span className="text-[10px] font-bold tracking-[0.16em] text-zinc-600">
            THE DAILY LOOP
          </span>
          <h2 className="mt-4 text-[clamp(2.1rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-white">
            Everything around the trade.
            <br /> None of the noise.
          </h2>
        </div>
        <div className="mt-12 grid border-y border-white/10 lg:grid-cols-3">
          {[
            {
              icon: BookOpen,
              number: "01",
              title: "Journal the decision",
              body: "Capture setup, risk and psychology while the context is still fresh.",
              art: "note",
            },
            {
              icon: BarChart3,
              number: "02",
              title: "Find the pattern",
              body: "Turn executions into clean performance insights you can act on.",
              art: "bars",
            },
            {
              icon: Users,
              number: "03",
              title: "Improve together",
              body: "Share verified progress inside private, focused trader communities.",
              art: "community",
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`relative min-h-[400px] overflow-hidden py-8 lg:min-h-[450px] lg:px-9 ${index > 0 ? "border-t border-white/10 lg:border-l lg:border-t-0" : ""}`}
              >
                <Icon size={22} className="text-zinc-300" />
                <span className="absolute right-5 top-8 font-mono text-[10px] text-zinc-700">
                  {feature.number}
                </span>
                <h3 className="mt-10 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-[290px] text-sm leading-6 text-zinc-500">
                  {feature.body}
                </p>
                <div className="absolute inset-x-0 bottom-8 h-36 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] p-4 lg:inset-x-9">
                  {feature.art === "note" ? (
                    <>
                      <div className="flex items-center justify-between text-[9px]">
                        <small className="font-bold tracking-[0.1em] text-zinc-600">SETUP</small>
                        <b className="text-zinc-300">London continuation</b>
                      </div>
                      <p className="mt-4 text-[10px] leading-5 text-zinc-500">
                        Waited for the retest. Risk stayed inside plan.
                      </p>
                      <span className="absolute bottom-3 right-3 flex items-center gap-2 text-[9px] text-zinc-500">
                        <i className="size-1.5 rounded-full bg-white" /> A+ execution
                      </span>
                    </>
                  ) : feature.art === "bars" ? (
                    <div className="flex h-full items-end justify-around gap-3">
                      {FEATURE_BARS.map((height, barIndex) => (
                        <div key={barIndex} className="flex h-full flex-1 flex-col-reverse items-center gap-2">
                          <i className={`${height} w-5 rounded-t bg-gradient-to-t from-white/10 to-white/75`} />
                          <span className="text-[7px] text-zinc-700">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][barIndex]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex">
                        {["AK", "MR", "JL", "+8"].map((item, avatarIndex) => (
                          <i
                            key={item}
                            className={`${avatarIndex ? "-ml-2" : ""} grid size-8 place-items-center rounded-full border-2 border-[#090909] bg-zinc-200 text-[8px] font-black not-italic text-black last:bg-zinc-800 last:text-zinc-400`}
                          >
                            {item}
                          </i>
                        ))}
                      </div>
                      <div className="mt-4">
                        <small className="block text-[8px] font-bold tracking-[0.1em] text-zinc-600">
                          WEEKLY REVIEW
                        </small>
                        <b className="mt-1 block text-[10px] text-zinc-300">
                          12 traders checked in
                        </b>
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto grid w-[calc(100%-30px)] max-w-[1180px] items-center gap-12 border-t border-white/10 py-20 sm:w-[calc(100%-48px)] sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <span className="text-[10px] font-bold tracking-[0.16em] text-zinc-600">
            ONE WORKSPACE, EVERY ACCOUNT
          </span>
          <h2 className="mt-4 text-[clamp(2.1rem,5vw,3.5rem)] font-semibold leading-[1.03] tracking-[-0.057em] text-white">
            Your platforms stay yours.
            <br /> Tradox makes them useful.
          </h2>
          <p className="mt-6 max-w-[510px] text-sm leading-7 text-zinc-500">
            Bring results from the tools you already trade with into one clear
            review workflow. Compare accounts, understand execution and keep
            your journal attached to the numbers.
          </p>
          <div className="mt-7 grid gap-3 text-sm text-zinc-400">
            {[
              "Unified performance view",
              "Account-level privacy controls",
              "Fast CSV and connector workflows",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2.5">
                <Check size={14} className="rounded-full bg-white p-0.5 text-black" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <PlatformPreview />
      </section>

      <section className="relative z-10 mx-auto grid w-[calc(100%-30px)] max-w-[1180px] grid-cols-1 border-y border-white/10 sm:w-[calc(100%-48px)] sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORMS.map((platform, index) => (
          <article
            key={platform.name}
            className="relative flex min-h-32 items-center gap-3 border-b border-white/10 p-5 sm:border-r lg:[&:nth-child(4n)]:border-r-0"
          >
            <div className="grid size-12 place-items-center rounded-xl border border-white/10 bg-white/95 p-2">
              <Image
                src={platform.logo}
                alt={`${platform.name} logo`}
                width={44}
                height={44}
                className="size-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{platform.name}</h3>
              <p className="mt-1 text-[10px] text-zinc-600">{platform.note}</p>
            </div>
            <span className="absolute right-3 top-3 font-mono text-[9px] text-zinc-800">
              {String(index + 1).padStart(2, "0")}
            </span>
          </article>
        ))}
      </section>

      <section className="relative z-10 mx-auto mt-20 flex w-[calc(100%-30px)] max-w-[1180px] flex-col items-start justify-between gap-8 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_85%_0,rgba(255,255,255,.09),transparent_30%),#050505] p-6 sm:w-[calc(100%-48px)] sm:p-10 lg:flex-row lg:items-end lg:p-14">
        <div>
          <span className="text-[10px] font-bold tracking-[0.16em] text-zinc-600">
            YOUR NEXT SESSION STARTS HERE
          </span>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-white">
            Build a trading process
            <br /> you can actually repeat.
          </h2>
        </div>
        <button
          onClick={onRegister}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200"
        >
          Create your workspace <ArrowRight size={17} />
        </button>
      </section>

      <footer className="relative z-10 mx-auto mt-20 flex w-[calc(100%-30px)] max-w-[1180px] flex-col gap-4 border-t border-white/10 py-7 text-[11px] text-zinc-600 sm:w-[calc(100%-48px)] sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-zinc-300">
          <b className="grid size-8 place-items-center rounded-lg bg-white text-[10px] font-black text-black">
            TD
          </b>
          Tradox
        </Link>
        <p>Trading clarity, one session at a time.</p>
        <span>© 2026 Tradox</span>
      </footer>
    </main>
  );
}
