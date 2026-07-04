"use client";

import { cn } from "@/lib/utils";

type InstrumentMeta = {
  short: string;
  label: string;
  tone: string;
};

const INSTRUMENT_META: Record<string, InstrumentMeta> = {
  USD: { short: "US", label: "US Dollar", tone: "bg-rose-500/18 text-rose-100 border-rose-400/20" },
  EUR: { short: "EU", label: "Euro", tone: "bg-sky-500/18 text-sky-100 border-sky-400/20" },
  GBP: { short: "GB", label: "British Pound", tone: "bg-indigo-500/18 text-indigo-100 border-indigo-400/20" },
  JPY: { short: "JP", label: "Japanese Yen", tone: "bg-zinc-200/10 text-zinc-100 border-zinc-200/15" },
  CHF: { short: "CH", label: "Swiss Franc", tone: "bg-rose-500/18 text-rose-100 border-rose-400/20" },
  AUD: { short: "AU", label: "Australian Dollar", tone: "bg-cyan-500/18 text-cyan-100 border-cyan-400/20" },
  NZD: { short: "NZ", label: "New Zealand Dollar", tone: "bg-teal-500/18 text-teal-100 border-teal-400/20" },
  CAD: { short: "CA", label: "Canadian Dollar", tone: "bg-red-500/18 text-red-100 border-red-400/20" },
  XAU: { short: "AU", label: "Gold", tone: "bg-amber-400/18 text-amber-100 border-amber-300/20" },
  XAG: { short: "AG", label: "Silver", tone: "bg-slate-400/18 text-slate-100 border-slate-300/20" },
  BTC: { short: "BT", label: "Bitcoin", tone: "bg-orange-500/18 text-orange-100 border-orange-400/20" },
  ETH: { short: "ET", label: "Ethereum", tone: "bg-violet-500/18 text-violet-100 border-violet-400/20" },
};

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

function InstrumentMark({
  code,
  compact = false,
}: {
  code: string;
  compact?: boolean;
}) {
  const meta = INSTRUMENT_META[code] ?? {
    short: code.slice(0, 2),
    label: code,
    tone: "bg-white/[.08] text-zinc-100 border-white/10",
  };

  return (
    <span
      title={meta.label}
      aria-label={meta.label}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border font-black tracking-[0.08em] shadow-[0_8px_18px_rgba(0,0,0,.24)]",
        compact ? "size-7 text-[8px]" : "size-9 text-[10px]",
        meta.tone,
      )}
    >
      {meta.short}
    </span>
  );
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
  const { base, quote, normalized } = splitSymbol(symbol);
  const label = showFullSymbol ? normalized : base;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-[22px] border border-white/10 bg-[#171717] px-3 py-2 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]",
        compact ? "gap-2.5 rounded-[18px] px-2.5 py-1.5" : "",
        className,
      )}
    >
      <span className="flex shrink-0 items-center -space-x-2">
        {base ? <InstrumentMark code={base} compact={compact} /> : null}
        {quote ? <InstrumentMark code={quote} compact={compact} /> : null}
      </span>
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
