"use client";

import { cn } from "@/lib/utils";

const PLATFORM_META: Record<string, { mark: string; tone: string; label: string }> = {
  mt5: { mark: "MT5", tone: "bg-gradient-to-br from-emerald-400/20 via-sky-400/18 to-blue-500/20 text-emerald-100", label: "MetaTrader 5" },
  metatrader5: { mark: "MT5", tone: "bg-gradient-to-br from-emerald-400/20 via-sky-400/18 to-blue-500/20 text-emerald-100", label: "MetaTrader 5" },
  ctrader: { mark: "cT", tone: "bg-rose-500/14 text-rose-100", label: "cTrader" },
  tradelocker: { mark: "TL", tone: "bg-sky-500/14 text-sky-100", label: "TradeLocker" },
  tradovate: { mark: "TV", tone: "bg-amber-400/14 text-amber-100", label: "Tradovate" },
  ninjatrader: { mark: "NT", tone: "bg-orange-500/14 text-orange-100", label: "NinjaTrader" },
  projectx: { mark: "PX", tone: "bg-fuchsia-500/14 text-fuchsia-100", label: "Project X" },
  matchtrader: { mark: "MT", tone: "bg-cyan-500/14 text-cyan-100", label: "MatchTrader" },
  manual: { mark: "MN", tone: "bg-white/[.08] text-zinc-200", label: "Manual account" },
};

export function PlatformLogoBadge({
  platform,
  compact = false,
  showLabel = false,
  className,
}: {
  platform?: string | null;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const key = (platform || "manual").trim().toLowerCase();
  const meta = PLATFORM_META[key] ?? {
    mark: (platform || "AC").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "AC",
    tone: "bg-white/[.08] text-zinc-200",
    label: platform || "Account",
  };

  const badge = (
    <span
      title={meta.label}
      aria-label={meta.label}
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl border border-white/10 font-black tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]",
        compact ? "h-9 min-w-9 px-2 text-[10px]" : "h-11 min-w-11 px-2.5 text-[11px]",
        meta.tone,
        className,
      )}
    >
      {meta.mark}
    </span>
  );

  if (!showLabel) return badge;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {badge}
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-zinc-100">{meta.label}</span>
        <span className="block text-[10px] text-zinc-500">Trading platform</span>
      </span>
    </div>
  );
}
