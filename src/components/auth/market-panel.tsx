"use client";

import { cn } from "@/lib/utils";

const CANDLES = [
  62, 48, 71, 55, 80, 44, 90, 66, 52, 77, 40, 85, 60, 95, 50, 68, 74, 42, 88,
  58, 63, 47, 92, 56, 79, 45, 70, 61, 84, 53, 96, 49, 67, 73, 41, 87, 59, 64,
  46, 91,
].map((h, i) => ({ h, up: i % 3 !== 0 }));

const TICKER = [
  { symbol: "EURUSD", price: "1.0842", delta: "+0.18%", up: true },
  { symbol: "XAUUSD", price: "2,378.4", delta: "+0.62%", up: true },
  { symbol: "US30", price: "39,201", delta: "-0.24%", up: false },
  { symbol: "BTCUSD", price: "67,940", delta: "+1.05%", up: true },
  { symbol: "GBPJPY", price: "199.63", delta: "-0.11%", up: false },
  { symbol: "NAS100", price: "18,662", delta: "+0.47%", up: true },
  { symbol: "USDJPY", price: "156.21", delta: "+0.09%", up: true },
  { symbol: "SPX500", price: "5,472", delta: "-0.08%", up: false },
];

function TickerRow() {
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6">
      {TICKER.map((ticker) => (
        <div key={ticker.symbol} className="flex items-center gap-2 whitespace-nowrap font-mono text-xs">
          <span className="text-[#8B93A7]">{ticker.symbol}</span>
          <span className="text-[#E5E7EB]">{ticker.price}</span>
          <span className={ticker.up ? "text-[#22C55E]" : "text-[#EF4444]"}>{ticker.delta}</span>
        </div>
      ))}
    </div>
  );
}

export function MarketPanel() {
  return (
    <div className="relative hidden h-full w-full flex-col justify-between overflow-hidden bg-[#0A0E14] lg:flex">
      <div className="pointer-events-none absolute inset-0 flex items-end gap-[3px] px-10 pb-24 opacity-[0.16]">
        {CANDLES.map((candle, index) => (
          <div
            key={index}
            className={cn("w-full rounded-[1px]", candle.up ? "bg-[#22C55E]" : "bg-[#EF4444]")}
            style={{ height: `${candle.h}%` }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A0E14] via-[#0A0E14]/70 to-[#0A0E14]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A0E14] via-transparent to-[#0A0E14]/40" />

      <div className="relative z-10 flex items-center gap-2 px-12 pt-10">
        <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#D4AF37]">
          <span className="text-sm font-bold text-[#0A0E14]">T</span>
        </div>
        <span className="text-lg font-medium tracking-tight text-[#E5E7EB]">TradeWay</span>
      </div>

      <div className="relative z-10 max-w-md px-12">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
          Journal · Analytics · Discipline
        </p>
        <h1 className="text-4xl font-medium leading-[1.15] tracking-tight text-[#E5E7EB]">
          Har bir savdoingiz o&apos;z hikoyasini aytadi.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#8B93A7]">
          MT5 va boshqa terminallardan avtomatik sinxronlash, chuqur statistika va disciplinani bir joyda ko&apos;ring.
        </p>
      </div>

      <div className="relative z-10 border-t border-[#1E2430] bg-[#0A0E14]/80 py-3 backdrop-blur-sm">
        <div className="flex w-max animate-[tx-scroll_28s_linear_infinite]">
          <TickerRow />
          <TickerRow />
        </div>
      </div>

      <style jsx global>{`
        @keyframes tx-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
