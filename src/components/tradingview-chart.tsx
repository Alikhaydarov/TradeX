"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function resolveTvSymbol(rawSymbol: string) {
  const symbol = rawSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!symbol) return "OANDA:XAUUSD";
  if (symbol.includes(":")) return symbol;

  const cryptoQuotes = ["USDT", "USD", "USDC", "BUSD"];
  const cryptoBases = [
    "BTC",
    "ETH",
    "SOL",
    "XRP",
    "BNB",
    "DOGE",
    "ADA",
    "AVAX",
    "LINK",
    "LTC",
    "MATIC",
    "DOT",
  ];
  if (
    cryptoBases.some((base) => symbol.startsWith(base)) &&
    cryptoQuotes.some((quote) => symbol.endsWith(quote))
  ) {
    return `BINANCE:${
      symbol.endsWith("USD") && !symbol.endsWith("USDT")
        ? `${symbol}T`
        : symbol
    }`;
  }

  const metals = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"];
  if (metals.includes(symbol)) return `OANDA:${symbol}`;

  if (/^[A-Z]{6}$/.test(symbol)) return `OANDA:${symbol}`;

  return symbol;
}

export function TradingViewChart({
  symbol,
  className = "",
}: {
  symbol: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
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

  useEffect(() => {
    if (active) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    setLoaded(false);
  }, [tvSymbol]);

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden bg-xcanvas ${className}`}
    >
      {!loaded ? (
        <div className="absolute inset-0 grid place-items-center text-xmuted">
          <div className="text-center">
            {active ? (
              <Loader2 size={20} className="mx-auto animate-spin" />
            ) : (
              <span className="mx-auto block size-2 rounded-full bg-zinc-700" />
            )}
            <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider">
              {active ? "Loading chart" : "Chart ready on view"}
            </span>
          </div>
        </div>
      ) : null}
      {active ? (
        <iframe
          key={tvSymbol}
          title={`${symbol} chart`}
          src={src}
          className={`h-full w-full border-0 transition-opacity ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          allow="clipboard-write"
        />
      ) : null}
    </div>
  );
}
