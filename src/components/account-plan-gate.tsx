"use client";

import { ArrowLeft, Check, Crown, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type PlanId = "free" | "standard" | "pro";
type BillingCycle = "monthly" | "yearly";

const PLANS: Record<PlanId, {
  name: string;
  monthly: number;
  yearly: number;
  description: string;
  features: Array<{ label: string; included: boolean }>;
}> = {
  free: {
    name: "Free",
    monthly: 0,
    yearly: 0,
    description: "A focused manual journal for getting started.",
    features: [
      { label: "Unlimited manual trades", included: true },
      { label: "1 trading account", included: true },
      { label: "P&L calendar", included: true },
      { label: "Full analytics", included: false },
      { label: "MT5 automatic sync", included: false },
      { label: "AI trade review", included: false },
    ],
  },
  standard: {
    name: "Standard",
    monthly: 15,
    yearly: 144,
    description: "For consistent traders who want automation and deeper review.",
    features: [
      { label: "Unlimited manual trades", included: true },
      { label: "Up to 3 accounts", included: true },
      { label: "P&L calendar", included: true },
      { label: "Full analytics", included: true },
      { label: "MT5 automatic sync", included: true },
      { label: "AI trade review", included: true },
    ],
  },
  pro: {
    name: "Pro",
    monthly: 25,
    yearly: 240,
    description: "The complete workspace for multi-account performance.",
    features: [
      { label: "Unlimited manual trades", included: true },
      { label: "Unlimited accounts", included: true },
      { label: "P&L calendar", included: true },
      { label: "Full analytics", included: true },
      { label: "Priority MT5 sync", included: true },
      { label: "AI coach and reviews", included: true },
    ],
  },
};

export function AccountPlanGate({ onBack, onChoose }: { onBack: () => void; onChoose: (plan: Exclude<PlanId, "free">) => void }) {
  const [plan, setPlan] = useState<PlanId>("standard");
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const selected = PLANS[plan];
  const price = billing === "monthly" ? selected.monthly : selected.yearly;
  const suffix = billing === "monthly" ? "/mo" : "/yr";
  const monthlyEquivalent = useMemo(() => billing === "yearly" && price ? Math.round(price / 12) : null, [billing, price]);

  return (
    <div className="overflow-hidden">
      <div className="relative border-b border-white/8 bg-[#050505] px-5 pb-5 pt-4 sm:px-6">
        <button type="button" onClick={onBack} className="absolute left-4 top-4 grid size-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white" aria-label="Back">
          <ArrowLeft size={17} />
        </button>
        <div className="mx-auto grid size-10 place-items-center rounded-xl border border-white/10 bg-[#0d0d0d] text-white">
          {plan === "pro" ? <Crown size={18} /> : <Sparkles size={18} />}
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-black text-white">{selected.name}</p>
            <p className="mt-1 max-w-[310px] text-xs leading-5 text-zinc-500">{selected.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-black text-white">${price}<span className="text-xs font-semibold text-zinc-500">{suffix}</span></p>
            {monthlyEquivalent ? <p className="mt-1 text-[10px] text-emerald-400">${monthlyEquivalent}/mo equivalent</p> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
          {selected.features.map((feature) => (
            <div key={feature.label} className={cn("flex min-w-0 items-center gap-2 text-[11px]", feature.included ? "text-zinc-300" : "text-zinc-600")}>
              <span className={cn("grid size-4 shrink-0 place-items-center rounded-full", feature.included ? "bg-emerald-400/10 text-emerald-400" : "bg-white/5 text-zinc-600")}>
                {feature.included ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
              </span>
              <span className="truncate">{feature.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 rounded-xl border border-white/10 bg-black p-1">
          {(Object.keys(PLANS) as PlanId[]).map((id) => (
            <button key={id} type="button" onClick={() => setPlan(id)} className={cn("h-9 rounded-lg text-xs font-bold transition", plan === id ? "bg-white text-black" : "text-zinc-500 hover:text-white")}>
              {PLANS[id].name}
            </button>
          ))}
        </div>
        <div className="mx-auto mt-3 grid max-w-[240px] grid-cols-2 rounded-lg bg-black p-1">
          {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
            <button key={cycle} type="button" onClick={() => setBilling(cycle)} className={cn("h-8 rounded-md text-[11px] font-semibold capitalize transition", billing === cycle ? "bg-[#161616] text-white" : "text-zinc-600 hover:text-zinc-300")}>
              {cycle}{cycle === "yearly" ? " -20%" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <h3 className="text-base font-black text-white">Automatic account sync is a paid-plan feature</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Choose Standard or Pro to connect MT5 and keep your journal updated automatically.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="border-white/10 bg-transparent">Back</Button>
          {plan === "free" ? (
            <Button type="button" disabled className="bg-zinc-800 text-zinc-500">Current plan</Button>
          ) : (
            <Button type="button" onClick={() => onChoose(plan)} className="bg-white font-semibold text-black hover:bg-zinc-200">Choose {selected.name}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
