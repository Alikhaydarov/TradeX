"use client";

import { cn } from "@/lib/utils";

const INSTRUMENT_META: Record<string, { mark: string; tone: string; label: string }> = {
  USD: { mark: "🇺🇸", tone: "bg-emerald-500/12 text-emerald-200", label: "US Dollar" },
  EUR: { mark: "🇪🇺", tone: "bg-sky-500/12 text-sky-200", label: "Euro" },
  GBP: { mark: "🇬🇧", tone: "bg-indigo-500/12 text-indigo-200", label: "British Pound" },
  JPY: { mark: "🇯🇵", tone: "bg-rose-500/12 text-rose-200", label: "Japanese Yen" },
  CHF: { mark: "🇨🇭", tone: "bg-rose-500/12 text-rose-200", label: "Swiss Franc" },
  AUD: { mark: "🇦🇺", tone: "bg-cyan-500/12 text-cyan-200", label: "Australian Dollar" },
  NZD: { mark: "🇳🇿", tone: "bg-cyan-500/12 text-cyan-200", label: "New Zealand Dollar" },
  CAD: { mark: "🇨🇦", tone: "bg-rose-500/12 text-rose-200", label: "Canadian Dollar" },
  XAU: { mark: "Au", tone: "bg-amber-400/14 text-amber-200", label: "Gold" },
  XAG: { mark: "Ag", tone: "bg-slate-400/14 text-slate-200", label: "Silver" },
  BTC: { mark: "₿", tone: "bg-orange-400/14 text-orange-200", label: "Bitcoin" },
  ETH: { mark: "Ξ", tone: "bg-violet-400/14 text-violet-200", label: "Ethereum" },
};

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9/]/g, "");
}

function splitSymbol(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  if (normalized.includes("/")) {
    const [base, quote] = normalized.split("/");
    return { base, quote, normalized };
  }

  if (/^[A-Z]{6}$/.test(normalized)) {
    return { base: normalized.slice(0, 3), quote: normalized.slice(3), normalized };
  }

  if (/^(XAU|XAG|BTC|ETH)[A-Z]{3}$/.test(normalized)) {
    return { base: normalized.slice(0, 3), quote: normalized.slice(3), normalized };
  }

  return { base: normalized.slice(0, 3), quote: normalized.slice(3, 6), normalized };
}

function InstrumentMark({
  code,
  compact = false,
}: {
  code: string;
  compact?: boolean;
}) {
  const meta = INSTRUMENT_META[code] ?? {
    mark: code.slice(0, 2),
    tone: "bg-white/[.08] text-zinc-200",
    label: code,
  };

  return (
    <span
      title={meta.label}
      aria-label={meta.label}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-white/8 font-black tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,.05)]",
        compact ? "size-5 text-[9px]" : "size-6 text-[10px]",
        meta.tone,
      )}
    >
      {meta.mark}
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
        "inline-flex min-w-0 items-center gap-2 rounded-2xl border border-white/8 bg-white/[.03] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]",
        compact ? "gap-1.5 px-2 py-1" : "",
        className,
      )}
    >
      <span className="flex shrink-0 items-center -space-x-1.5">
        {base ? <InstrumentMark code={base} compact={compact} /> : null}
        {quote ? <InstrumentMark code={quote} compact={compact} /> : null}
      </span>
      <span className={cn("truncate font-black tracking-[0.08em] text-zinc-100", compact ? "text-[11px]" : "text-xs")}>
        {label}
      </span>
    </span>
  );
}
