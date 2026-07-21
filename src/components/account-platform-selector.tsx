"use client";

import { Check, ChevronRight, LockKeyhole, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PlatformLogoBadge } from "./platform-logo-badge";
import { Button } from "./ui/button";

export type AccountPlan = "free" | "standard" | "pro";
export type PlatformId = "mt5" | "tradelocker" | "ctrader" | "tradovate" | "ninjatrader" | "matchtrader" | "projectx";
export type PlatformMode = "auto" | "csv";

export type PlatformConfig = {
  id: PlatformId;
  name: string;
  mode: PlatformMode;
  market: "CFD" | "Futures";
  helper: string;
  status: "live" | "coming";
};

export const ACCOUNT_PLATFORMS: PlatformConfig[] = [
  { id: "tradelocker", name: "TradeLocker", mode: "auto", market: "CFD", helper: "Automatic trade sync", status: "coming" },
  { id: "ctrader", name: "cTrader", mode: "auto", market: "CFD", helper: "OAuth account sync", status: "coming" },
  { id: "mt5", name: "MetaTrader 5", mode: "auto", market: "CFD", helper: "Read-only automatic sync", status: "live" },
  { id: "tradovate", name: "Tradovate", mode: "auto", market: "Futures", helper: "Futures account sync", status: "coming" },
  { id: "ninjatrader", name: "NinjaTrader", mode: "csv", market: "Futures", helper: "Trade history import", status: "coming" },
  { id: "matchtrader", name: "MatchTrader", mode: "auto", market: "CFD", helper: "Automatic trade sync", status: "coming" },
  { id: "projectx", name: "Project X", mode: "csv", market: "Futures", helper: "Trade history import", status: "coming" },
];

function PlanSummary({ plan }: { plan: Exclude<AccountPlan, "free"> }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"><Check size={15} strokeWidth={3} /></span>
        <div className="min-w-0">
          <p className="text-xs font-black text-white">{plan === "pro" ? "Pro" : "Standard"} plan</p>
          <p className="truncate text-[10px] text-zinc-500">{plan === "pro" ? "Unlimited account workspaces" : "Up to 3 account workspaces"}</p>
        </div>
      </div>
      <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Active</span>
    </div>
  );
}

function PlatformCard({ item, onSelect }: { item: PlatformConfig; onSelect: (item: PlatformConfig) => void }) {
  const live = item.status === "live";

  return (
    <button
      type="button"
      disabled={!live}
      onClick={() => onSelect(item)}
      className={cn(
        "group relative flex min-h-[150px] flex-col items-center justify-center rounded-2xl border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        live ? "border-white/10 bg-[#111111] hover:border-white/25 hover:bg-[#151515]" : "cursor-not-allowed border-white/6 bg-[#070707] opacity-55",
      )}
    >
      <PlatformLogoBadge platform={item.id} />
      <span className="mt-3 text-sm font-black text-white">{item.name}</span>
      <span className="mt-1 text-[11px] text-zinc-500">{item.helper}</span>
      <span className={cn(
        "mt-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]",
        live ? "bg-emerald-400/10 text-emerald-300" : "bg-white/6 text-zinc-500",
      )}>
        {live ? item.market : "Coming soon"}
      </span>
      {live ? <ChevronRight size={15} className="absolute right-3 top-3 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white" /> : null}
    </button>
  );
}

export function AccountPlatformSelector({
  plan,
  onSelect,
  onBack,
  onUpgrade,
}: {
  plan: AccountPlan;
  onSelect: (item: PlatformConfig) => void;
  onBack: () => void;
  onUpgrade: () => void;
}) {
  const [query, setQuery] = useState("");
  const locked = plan === "free";
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ACCOUNT_PLATFORMS;
    return ACCOUNT_PLATFORMS.filter((item) => `${item.name} ${item.market} ${item.helper}`.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-[700px] space-y-3">
      {plan !== "free" ? <PlanSummary plan={plan} /> : null}

      <div className="relative overflow-hidden rounded-2xl">
        <div className={cn("space-y-3 transition", locked && "pointer-events-none select-none blur-[5px] opacity-45")} aria-hidden={locked}>
          <label className="mx-auto flex h-10 max-w-[360px] items-center gap-2 rounded-xl border border-white/10 bg-[#111111] px-3">
            <Search size={14} className="text-zinc-600" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search platform..." className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600" />
          </label>

          <div data-platform-grid className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((item) => <PlatformCard key={item.id} item={item} onSelect={onSelect} />)}
          </div>
        </div>

        {locked ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-sm text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-white/10 bg-[#0b0b0b] text-white"><LockKeyhole size={18} /></span>
              <h3 className="mt-3 text-base font-black text-white">Automatic sync is locked</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-zinc-400">Upgrade to Standard or Pro to connect a trading platform and sync trades automatically.</p>
              <div className="mx-auto mt-4 grid max-w-[280px] grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onBack} className="border-white/10 bg-[#0b0b0b]">Back</Button>
                <Button type="button" onClick={onUpgrade} className="bg-white text-black hover:bg-zinc-200">Compare plans</Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
