"use client";

import { ArrowRight, Bot, CalendarDays, CheckCircle2, LineChart, LockKeyhole, Play, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "./auth-modal";
import { useAuth } from "./auth-context";

const features = [
  { icon: Zap, title: "Auto MT5 sync", text: "Closed trades are imported automatically from your VPS bridge." },
  { icon: Bot, title: "Traderox AI", text: "Every new trade gets discipline, risk and behavior feedback." },
  { icon: CalendarDays, title: "P&L calendar", text: "Track winning and losing days with a clean calendar view." },
  { icon: LineChart, title: "Prop analytics", text: "See target progress, drawdown usage and account performance." },
];

const stats = ["15s live checks", "MT5 history import", "AI coach feedback"];

export function LandingPage() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const openApp = () => {
    window.location.href = "/app";
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#070707] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3 text-left">
          <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white text-sm font-black text-black">TW</span>
          <span>
            <span className="block text-sm font-black tracking-tight">TradeWay</span>
            <span className="block text-[10px] font-bold uppercase tracking-[.25em] text-zinc-500">Performance OS</span>
          </span>
        </button>

        <div className="hidden items-center gap-7 text-xs font-bold text-zinc-400 md:flex">
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#traderox" className="transition hover:text-white">Traderox AI</a>
          <a href="#pricing" className="transition hover:text-white">Pricing</a>
        </div>

        <button
          onClick={user ? openApp : () => setAuthOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white px-4 text-xs font-black text-black transition hover:bg-zinc-200"
        >
          {user ? "Open app" : "Sign in"}
          <ArrowRight size={14} />
        </button>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black text-emerald-300">
            <Sparkles size={13} /> MT5 auto journal + Traderox AI coach
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
            Your trades synced. Your mistakes detected.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
            Connect MT5, import closed trade history automatically, track prop account progress and get coach feedback after every trade.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={user ? openApp : () => setAuthOpen(true)}
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-black shadow-2xl shadow-white/10 transition hover:bg-zinc-200"
            >
              {user ? "Open platform" : "Get started"}
              <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => document.getElementById("traderox")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-6 text-sm font-black text-zinc-200 transition hover:bg-white/[.08]"
            >
              <Play size={16} /> See how it works
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {stats.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[11px] font-bold text-zinc-400">
                <CheckCircle2 size={13} className="text-emerald-300" /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-white/10 bg-[#111] p-3 shadow-2xl shadow-black/50">
          <div className="rounded-[1.5rem] border border-white/8 bg-black p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Traderox AI</p>
                <h2 className="mt-1 text-xl font-black">Riskni himoya qilamiz</h2>
              </div>
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-300">82/100</span>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <p className="text-xs font-bold text-zinc-300">Latest trade feedback</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">XAUUSD +$45.00 bilan yopildi. Foydadan keyin riskni oshirmasdan, shu modelni takrorla.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                  <p className="text-[10px] font-black uppercase text-zinc-500">Next action</p>
                  <p className="mt-2 text-sm font-bold text-white">Faqat A+ setup bo‘lsa davom et.</p>
                </div>
                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[.06] p-4">
                  <p className="text-[10px] font-black uppercase text-amber-300">Alert</p>
                  <p className="mt-2 text-sm font-bold text-white">2 lossdan keyin pause qoidasi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
              <feature.icon size={20} className="text-zinc-300" />
              <h3 className="mt-5 text-base font-black">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="traderox" className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[.24em] text-zinc-500">Why TradeWay</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Not just a journal. A coach after every trade.</h2>
            </div>
            <div className="grid gap-3 text-sm leading-7 text-zinc-400">
              <p>Traderox AI checks overtrading, revenge trading, loss streaks, risk increase after loss, weak symbols and weak sessions.</p>
              <p>Every import updates the account score and gives one clear next action, so traders know what to fix before the next setup.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-black p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.24em] text-zinc-500">Early access</p>
              <h2 className="mt-2 text-3xl font-black">Start with your first MT5 account.</h2>
              <p className="mt-2 text-sm text-zinc-500">Free beta now. Pro pricing comes after stable auto-sync and Traderox AI UI.</p>
            </div>
            <button onClick={user ? openApp : () => setAuthOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-black hover:bg-zinc-200">
              <LockKeyhole size={16} /> {user ? "Open app" : "Sign in"}
            </button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>© {new Date().getFullYear()} TradeWay</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck size={13} /> Built for disciplined prop traders.</span>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
