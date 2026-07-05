"use client";

import { cn } from "@/lib/utils";

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9/]/g, "");
}

function splitSymbol(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  if (normalized.includes("/")) {
    const [base, quote] = normalized.split("/");
    return { base, quote, normalized: `${base}/${quote}` };
  }

  if (/^[A-Z]{6}$/.test(normalized)) {
    return {
      base: normalized.slice(0, 3),
      quote: normalized.slice(3, 6),
      normalized: `${normalized.slice(0, 3)}/${normalized.slice(3, 6)}`,
    };
  }

  if (/^(XAU|XAG|BTC|ETH)[A-Z]{3}$/.test(normalized)) {
    return {
      base: normalized.slice(0, 3),
      quote: normalized.slice(3, 6),
      normalized: `${normalized.slice(0, 3)}/${normalized.slice(3, 6)}`,
    };
  }

  return {
    base: normalized.slice(0, 3),
    quote: normalized.slice(3, 6),
    normalized,
  };
}

export function InstrumentBadge({
  symbol,
  compact = false,
  className,
  showFullSymbol = true,
}: {
  symbol: string;
  compact?: boolean;
  className?: string;
  showFullSymbol?: boolean;
}) {
  const { base, normalized } = splitSymbol(symbol);
  const label = showFullSymbol ? normalized : base;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center rounded-[22px] border border-white/10 bg-[#171717] px-3 py-2 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]",
        compact ? "rounded-[18px] px-2.5 py-1.5" : "",
        className,
      )}
    >
      <span
        className={cn(
          "truncate font-black tracking-normal text-white",
          compact ? "text-base leading-none" : "text-lg leading-none",
        )}
      >
        {label}
      </span>
    </span>
  );
}
