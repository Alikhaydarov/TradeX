"use client";

import { ArrowRight, BarChart3, Bot, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { MarketPanel } from "./market-panel";
import { Button } from "@/components/ui/button";

export function AuthLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="grid min-h-[100dvh] bg-background text-foreground lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#D4AF37]">
                <span className="text-base font-bold text-[#0A0E14]">T</span>
              </div>
              <div>
                <span className="block text-lg font-semibold tracking-tight">TradeWay</span>
                <span className="block text-[10px] font-black uppercase tracking-[.22em] text-muted-foreground">Trading OS</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
              <ShieldCheck size={12} /> Secure
            </span>
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[#D4AF37]">
            <Sparkles size={13} /> MT5 sync + Traderox AI
          </div>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Savdolaringizni avtomatik jurnalga aylantiring.
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
            TradeWay MT5 historyni import qiladi, prop account progressni ko&apos;rsatadi va Traderox AI har trade bo&apos;yicha discipline feedback beradi.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button onClick={onLogin} className="h-11 bg-[#D4AF37] font-medium text-[#0A0E14] hover:bg-[#E8C158]">
              Get started
              <ArrowRight size={15} />
            </Button>
            <Button onClick={onLogin} variant="outline" className="h-11 gap-2">
              <LockKeyhole size={15} /> Sign in
            </Button>
          </div>

          <div className="mt-8 grid gap-3">
            <FeatureLine icon={BarChart3} title="Auto journal" text="Closed trades, P&L, calendar and analytics one flowda." />
            <FeatureLine icon={Bot} title="Traderox AI" text="Overtrading, revenge trade va risk xatolarini topadi." />
          </div>
        </div>
      </div>

      <MarketPanel />
    </div>
  );
}

function FeatureLine({ icon: Icon, title, text }: { icon: typeof BarChart3; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-white/[.025] p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">
        <Icon size={17} />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
