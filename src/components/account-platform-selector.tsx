"use client";

import {
  Check,
  ChevronRight,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PlatformLogoBadge } from "./platform-logo-badge";
import { Button } from "./ui/button";

export type AccountPlan = "free" | "standard" | "pro";
export type PlatformId =
  | "mt5"
  | "tradelocker"
  | "ctrader"
  | "tradovate"
  | "ninjatrader"
  | "matchtrader"
  | "projectx";
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
  {
    id: "mt5",
    name: "MetaTrader 5",
    mode: "auto",
    market: "CFD",
    helper: "Read-only automatic sync",
    status: "live",
  },
  {
    id: "tradovate",
    name: "Tradovate",
    mode: "csv",
    market: "Futures",
    helper: "Position History CSV import",
    status: "live",
  },
  {
    id: "ninjatrader",
    name: "NinjaTrader",
    mode: "csv",
    market: "Futures",
    helper: "Trade Performance CSV import",
    status: "live",
  },
  {
    id: "projectx",
    name: "Project X",
    mode: "csv",
    market: "Futures",
    helper: "Trades CSV import",
    status: "live",
  },
  {
    id: "ctrader",
    name: "cTrader",
    mode: "csv",
    market: "CFD",
    helper: "Closed history CSV import",
    status: "live",
  },
  {
    id: "matchtrader",
    name: "MatchTrader",
    mode: "csv",
    market: "CFD",
    helper: "Closed Positions CSV import",
    status: "live",
  },
  {
    id: "tradelocker",
    name: "TradeLocker",
    mode: "auto",
    market: "CFD",
    helper: "Native history export unavailable",
    status: "coming",
  },
];

function PlanSummary({ plan }: { plan: AccountPlan }) {
  const t = useTranslations("accountPlatform");
  const paid = plan !== "free";
  const planName =
    plan === "pro" ? "Pro" : plan === "standard" ? "Standard" : "Free";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#090909] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            paid
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-white/[.06] text-zinc-400",
          )}
        >
          {paid ? (
            <Check size={15} strokeWidth={3} />
          ) : (
            <LockKeyhole size={14} />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-white">
            {t("workspace", { plan: planName })}
          </p>
          <p className="truncate text-[10px] text-ink-mute">
            {plan === "pro"
              ? t("proSummary")
              : plan === "standard"
                ? t("standardSummary")
                : t("freeSummary")}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
          paid
            ? "bg-emerald-400/10 text-emerald-300"
            : "bg-white/[.06] text-zinc-400",
        )}
      >
        {paid ? t("connectionsOn") : t("manualOnly")}
      </span>
    </div>
  );
}

function PlatformCard({
  item,
  locked,
  onSelect,
}: {
  item: PlatformConfig;
  locked: boolean;
  onSelect: (item: PlatformConfig) => void;
}) {
  const t = useTranslations("accountPlatform");
  const live = item.status === "live";
  const activeTone =
    item.mode === "csv"
      ? "bg-amber-400/10 text-amber-300"
      : "bg-emerald-400/10 text-emerald-300";

  return (
    <button
      type="button"
      disabled={!live}
      onClick={() => onSelect(item)}
      className={cn(
        "group relative flex min-h-[116px] flex-col items-start justify-between rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:min-h-[126px]",
        live
          ? "border-white/10 bg-[#090909] hover:border-white/25 hover:bg-[#0d0d0d]"
          : "cursor-not-allowed border-white/[.06] bg-[#070707] opacity-50",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <PlatformLogoBadge platform={item.id} compact />
        {locked && live ? (
          <LockKeyhole size={13} className="mt-1 text-zinc-500" />
        ) : live ? (
          <ChevronRight
            size={14}
            className="mt-1 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white"
          />
        ) : null}
      </div>
      <div className="mt-3 min-w-0">
        <span className="block truncate text-[13px] font-bold text-white">
          {item.name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-ink-mute">
          {item.mode === "auto" ? t("autoHelper") : t("csvHelper")}
        </span>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
            live ? activeTone : "bg-white/[.06] text-ink-mute",
          )}
        >
          {live
            ? item.mode === "csv"
              ? t("csvImport")
              : t("autoSync")
            : t("comingSoon")}
        </span>
      </div>
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
  const t = useTranslations("accountPlatform");
  const [query, setQuery] = useState("");
  const [lockedSelection, setLockedSelection] = useState<PlatformConfig | null>(
    null,
  );
  const locked = plan === "free";
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ACCOUNT_PLATFORMS;
    return ACCOUNT_PLATFORMS.filter((item) =>
      `${item.name} ${item.market} ${item.helper}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-[700px] space-y-3">
      <PlanSummary plan={plan} />
      <div className="relative overflow-hidden rounded-2xl border border-white/[.06] bg-black p-3 sm:p-4">
        <div
          className={cn(
            "space-y-3 transition duration-200",
            lockedSelection &&
              "pointer-events-none select-none blur-[6px] opacity-30",
          )}
          aria-hidden={Boolean(lockedSelection)}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#090909] px-3 sm:max-w-[360px]">
              <Search size={14} className="text-ink-subtle" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search")}
                className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-ink-subtle"
              />
            </label>
            <p className="px-1 text-[10px] font-semibold text-ink-mute">
              {t("readOnly")}
            </p>
          </div>
          <div
            data-platform-grid
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          >
            {filtered.map((item) => (
              <PlatformCard
                key={item.id}
                item={item}
                locked={locked}
                onSelect={(selected) =>
                  locked && selected.status === "live"
                    ? setLockedSelection(selected)
                    : onSelect(selected)
                }
              />
            ))}
          </div>
        </div>
        {lockedSelection ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/65 px-4 backdrop-blur-sm">
            <div className="relative w-full max-w-[390px] rounded-2xl border border-white/10 bg-[#090909] p-5 shadow-2xl">
              <button
                type="button"
                onClick={() => setLockedSelection(null)}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[.06] hover:text-white"
                aria-label={t("closeUpgrade")}
              >
                <X size={15} />
              </button>
              <div className="flex items-center gap-3">
                <PlatformLogoBadge platform={lockedSelection.id} compact />
                <div>
                  <p className="text-sm font-black text-white">
                    {t("connect", { platform: lockedSelection.name })}
                  </p>
                  <p className="text-[10px] text-ink-mute">
                    {lockedSelection.mode === "auto"
                      ? t("automaticHistory")
                      : t("csvHistory")}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-white/[.07] bg-black p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                  <ShieldCheck size={14} className="text-emerald-300" />{" "}
                  {t("paidOnly")}
                </p>
                <p className="mt-1.5 text-[11px] leading-5 text-ink-mute">
                  {t("upgradeDescription")}
                </p>
              </div>
              <div className="mt-4 grid gap-2 min-[360px]:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLockedSelection(null)}
                  className="border-white/10 bg-black"
                >
                  {t("keepFree")}
                </Button>
                <Button
                  type="button"
                  onClick={onUpgrade}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  <Sparkles size={14} /> {t("viewPlans")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="text-[11px] font-semibold text-ink-mute transition hover:text-white"
      >
        {t("manualInstead")}
      </button>
    </div>
  );
}
