"use client";

import { Check, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformLogoBadge } from "./platform-logo-badge";

export type AccountPlan = "free" | "standard" | "pro";
export type PlatformId = "mt5";
export type PlatformMode = "auto";

export type PlatformConfig = {
  id: PlatformId;
  name: string;
  mode: PlatformMode;
  market: "CFD" | "Futures";
  method: string;
  helper: string;
};

export const ACCOUNT_PLATFORMS: PlatformConfig[] = [
  {
    id: "mt5",
    name: "MetaTrader 5",
    mode: "auto",
    market: "CFD",
    method: "Automatic sync",
    helper: "Connect with read-only investor access. Trade history stays synced automatically.",
  },
];

function PlanSummary({ plan }: { plan: Exclude<AccountPlan, "free"> }) {
  const pro = plan === "pro";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#080808] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <Check size={16} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-white">{pro ? "Pro" : "Standard"} plan</p>
            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">Active</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
            {pro ? "MT5 automatic sync with unlimited account workspaces." : "MT5 automatic sync for up to 3 accounts."}
          </p>
        </div>
      </div>
      <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">MT5 included</p>
    </div>
  );
}

function PlatformCard({ item, featured = false, onSelect }: { item: PlatformConfig; featured?: boolean; onSelect: (item: PlatformConfig) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#060606] p-3 text-left transition hover:border-white/25 hover:bg-[#0b0b0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        featured && "p-4 sm:p-5",
      )}
    >
      <PlatformLogoBadge platform={item.id} className={featured ? "h-12 min-w-12" : undefined} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("truncate font-black text-white", featured ? "text-base" : "text-sm")}>{item.name}</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
            "bg-emerald-400/10 text-emerald-300",
          )}>
            Live
          </span>
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-zinc-400">{item.method}</span>
        <span className={cn("mt-1 block text-[11px] leading-4 text-zinc-600", !featured && "line-clamp-1")}>{item.helper}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </button>
  );
}

export function AccountPlatformSelector({ plan, onSelect }: { plan: Exclude<AccountPlan, "free">; onSelect: (item: PlatformConfig) => void }) {
  const mt5 = ACCOUNT_PLATFORMS[0];

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-4">
      <PlanSummary plan={plan} />

      <section className="mx-auto max-w-[560px]">
        <div className="mb-2 flex items-center gap-2">
          <RefreshCw size={13} className="text-zinc-500" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Automatic sync</h3>
        </div>
        <PlatformCard item={mt5} featured onSelect={onSelect} />
      </section>

      <p className="text-center text-[10px] leading-4 text-zinc-700">Connections use read-only access. TradeWay never places or manages trades.</p>
    </div>
  );
}
