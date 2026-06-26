"use client";

import { Check, Sparkles } from "lucide-react";

export function Pricing() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-300">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Premium</p>
            <h1 className="text-2xl font-black">TradeWay Premium</h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-zinc-400">
          Verified badge + AI analysis + MT5 Auto Sync for serious traders.
        </p>

        <div className="mt-5 space-y-3">
          {["Blue verified badge", "AI Trade Analysis", "MT5 Auto Sync", "Read-only trade history analytics"].map((item) => (
            <p key={item} className="flex items-center gap-2 text-sm text-zinc-200">
              <Check size={16} className="text-emerald-300" /> {item}
            </p>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-amber-300/15 bg-amber-300/[.06] p-4">
          <p className="text-sm font-black text-amber-100">Payment integration coming soon</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Stripe/payment flow will be connected after the Premium backend is fully verified.</p>
        </div>
      </section>
    </main>
  );
}
