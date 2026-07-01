"use client";

import { ArrowRight, Bot, CalendarDays, LineChart, LockKeyhole, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useAuth } from "./auth-context";

function appDashboardUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return `${configured.replace(/\/$/, "")}/dashboard`;

  const { protocol, hostname, port } = window.location;
  if (hostname.startsWith("app.")) return "/dashboard";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "/dashboard";

  return `${protocol}//app.${hostname}${port ? `:${port}` : ""}/dashboard`;
}

const features = [
  { icon: Zap, title: "MT5 auto-sync", text: "Closed trades are imported automatically from your VPS bridge." },
  { icon: Bot, title: "Traderox AI", text: "Discipline, risk and behavior feedback after every new trade." },
  { icon: CalendarDays, title: "P&L calendar", text: "See daily wins, losses and account progress in one clean view." },
  { icon: LineChart, title: "Prop analytics", text: "Track targets, drawdown, profit split and performance stats." },
];

export function LandingPageSubdomain() {
  const { user } = useAuth();

  const openApp = () => {
    window.location.href = appDashboardUrl();
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#070707] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-sm font-black text-black">TW</span>
          <div>
            <p className="text-sm font-black">TradeWay</p>
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-zinc-500">Performance OS</p>
          </div>
        </div>
        <button onClick={openApp} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-black hover:bg-zinc-200">
          {user ? "Open app" : "Sign in"}
          <ArrowRight size={14} />
        </button>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black text-emerald-300">
            <Sparkles size={13} /> MT5 sync + Traderox AI coach
          </span>
          <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Your trades synced. Your mistakes detected.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
            TradeWay connects your MT5 account, imports closed trade history and gives coach feedback through Traderox AI.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={openApp} className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-black shadow-2xl shadow-white/10 hover:bg-zinc-200">
              {user ? "Open dashboard" : "Get started"}
              <ArrowRight size={17} />
            </button>
            <button onClick={openApp} className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-6 text-sm font-black text-zinc-200 hover:bg-white/[.08]">
              <LockKeyhole size={16} /> app subdomain
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#111] p-3 shadow-2xl shadow-black/50">
          <div className="rounded-[1.5rem] border border-white/8 bg-black p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Traderox AI</p>
                <h2 className="mt-1 text-xl font-black">Riskni himoya qilamiz</h2>
              </div>
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-300">82/100</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <p className="text-xs font-bold text-zinc-300">Latest trade feedback</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Profitdan keyin riskni oshirma. Faqat A+ setup bo‘lsa davom et.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-3 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
            <feature.icon size={20} className="text-zinc-300" />
            <h3 className="mt-5 text-base font-black">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{feature.text}</p>
          </div>
        ))}
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-8 text-xs text-zinc-600 sm:px-6 lg:px-8">
        <span>© {new Date().getFullYear()} TradeWay</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck size={13} /> Built for disciplined prop traders.</span>
      </footer>
    </main>
  );
}
