"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type PlatformMeta = {
  label: string;
  mark: string;
  asset?: string;
  tone: string;
  imageClass?: string;
};

const PLATFORM_META: Record<string, PlatformMeta> = {
  mt5: { mark: "MT5", asset: "/platforms/metatrader5.png", tone: "bg-[#1199e2]", label: "MetaTrader 5" },
  metatrader5: { mark: "MT5", asset: "/platforms/metatrader5.png", tone: "bg-[#1199e2]", label: "MetaTrader 5" },
  ctrader: { mark: "cT", asset: "/platforms/ctrader.svg", tone: "bg-white", label: "cTrader" },
  tradelocker: { mark: "TL", asset: "/platforms/tradelocker.png", tone: "bg-black", label: "TradeLocker" },
  tradovate: { mark: "TV", asset: "/platforms/tradovate.png", tone: "bg-white", label: "Tradovate" },
  ninjatrader: { mark: "NT", asset: "/platforms/ninjatrader.png", tone: "bg-black", label: "NinjaTrader" },
  projectx: { mark: "PX", asset: "/platforms/projectx.png", tone: "bg-black", label: "Project X", imageClass: "scale-110" },
  matchtrader: { mark: "MT", asset: "/platforms/matchtrader.png", tone: "bg-black", label: "MatchTrader" },
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
        "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 font-black tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]",
        compact ? "size-9 text-[10px]" : "size-12 text-[11px]",
        meta.tone,
        className,
      )}
    >
      {meta.asset ? (
        <Image
          src={meta.asset}
          alt=""
          width={compact ? 32 : 44}
          height={compact ? 32 : 44}
          className={cn("size-full object-contain p-1", meta.imageClass)}
        />
      ) : meta.mark}
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
