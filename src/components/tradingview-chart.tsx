"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

function resolveTvSymbol(rawSymbol: string) {
  const symbol = rawSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!symbol) return "OANDA:XAUUSD";
  if (symbol.includes(":")) return symbol;

  const cryptoQuotes = ["USDT", "USD", "USDC", "BUSD"];
  const cryptoBases = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "LINK", "LTC", "MATIC", "DOT"];
  if (cryptoBases.some((base) => symbol.startsWith(base)) && cryptoQuotes.some((quote) => symbol.endsWith(quote))) {
    return `BINANCE:${symbol.endsWith("USD") && !symbol.endsWith("USDT") ? `${symbol}T` : symbol}`;
  }

  const metals = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"];
  if (metals.includes(symbol)) return `OANDA:${symbol}`;

  if (/^[A-Z]{6}$/.test(symbol)) return `OANDA:${symbol}`;

  return symbol;
}

export function TradingViewChart({ symbol, className = "" }: { symbol: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const tvSymbol = useMemo(() => resolveTvSymbol(symbol), [symbol]);
  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: "60",
      theme: "dark",
      style: "1",
      timezone: "Etc/UTC",
      withdateranges: "1",
      hide_side_toolbar: "0",
      allow_symbol_change: "1",
      studies: "[]",
      backgroundColor: "#050505",
      gridColor: "rgba(255,255,255,0.06)",
    });
    return `https://www.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol]);

  return (
    <div className={`relative overflow-hidden bg-[#050505] ${className}`}>
      {!loaded ? (
        <div className="absolute inset-0 grid place-items-center gap-2 text-zinc-600">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Chart yuklanmoqda</span>
        </div>
      ) : null}
      <iframe
        key={tvSymbol}
        title={`${symbol} chart`}
        src={src}
        className={`h-full w-full border-0 transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        allow="clipboard-write"
      />
    </div>
  );
}
