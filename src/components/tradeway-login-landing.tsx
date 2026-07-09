"use client";

import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

const TICKERS = [
  ["EUR/USD", "1.0932", "▲ 0.12%", "up"],
  ["XAU/USD", "2,412.60", "▲ 0.34%", "up"],
  ["US30", "39,880", "▼ 0.08%", "down"],
  ["BTC/USD", "67,240", "▲ 1.21%", "up"],
  ["NAS100", "18,760", "▲ 0.19%", "up"],
];

function TickerStrip() {
  const items = [...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <div className="auth-ticker" aria-hidden="true">
      <div className="auth-ticker-track">
        {items.map(([symbol, price, change, tone], index) => (
          <span key={`${symbol}-${index}`}>
            {symbol} <b>{price}</b> <em className={tone === "up" ? "auth-up" : "auth-down"}>{change}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function CandleField() {
  const candles = Array.from({ length: 18 }, (_, index) => {
    const x = 44 + index * 72;
    const high = 72 + ((index * 37) % 95);
    const bodyTop = high + 24 + ((index * 19) % 52);
    const bodyHeight = 54 + ((index * 23) % 54);
    const isUp = index % 2 === 0;
    return { x, high, bodyTop, bodyHeight, isUp };
  });

  return (
    <div className="auth-chart-field" aria-hidden="true">
      <svg viewBox="0 0 1400 430" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="twAuthGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7d66d" stopOpacity="0.95" />
            <stop offset="1" stopColor="#c9a227" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <g stroke="#c9a227" strokeWidth="2">
          {candles.map((candle, index) => (
            <g key={index} opacity={index > 11 ? 0.5 : 0.82}>
              <line x1={candle.x} y1={candle.high} x2={candle.x} y2={Math.min(390, candle.bodyTop + candle.bodyHeight + 36)} />
              <rect
                x={candle.x - 12}
                y={candle.bodyTop}
                width="24"
                height={candle.bodyHeight}
                rx="2"
                fill={candle.isUp ? "url(#twAuthGold)" : "#0e1220"}
                stroke="#c9a227"
              />
            </g>
          ))}
        </g>
        <polyline
          points="44,210 116,178 188,238 260,142 332,190 404,260 476,154 548,202 620,126 692,182 764,236 836,164 908,214 980,148 1052,196 1124,246 1196,170 1268,210"
          fill="none"
          stroke="#e8cf7a"
          strokeWidth="1.5"
          opacity="0.42"
        />
      </svg>
    </div>
  );
}

export function TradeWayLoginLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="auth-landing min-h-[100dvh] overflow-hidden text-[#f2efe6]">
      <TickerStrip />
      <div className="auth-glow" aria-hidden="true" />
      <CandleField />

      <section className="auth-shell mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-10">
        <div className="auth-copy hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a227]/20 bg-[#c9a227]/[.055] px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-[#e8cf7a]">
            <Sparkles size={14} /> Private Trading Workspace
          </div>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white xl:text-6xl">
            Journal, proof and account progress in one focused flow.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#8b90a3]">
            TradeWay keeps every trade attached to risk, setup, review notes and account performance — clean enough for daily use, strong enough for prop workflow.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Fast Journal", "Review trades"],
              ["MT5 Ready", "Auto sync"],
              ["Proof Profile", "Share progress"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#e8cf7a]">{title}</p>
                <p className="mt-1 text-sm text-[#8b90a3]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-card relative z-10 w-full justify-self-center rounded-[1.35rem] border border-[#1c2236] bg-[linear-gradient(180deg,rgba(18,22,38,.94),rgba(9,12,22,.97))] p-6 shadow-[0_34px_90px_-24px_rgba(0,0,0,.82)] sm:p-8">
          <div className="auth-card-line" aria-hidden="true" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(155deg,#e8cf7a,#c9a227_58%,#856812)] text-lg font-black text-[#0b0d16] shadow-[0_14px_30px_rgba(201,162,39,.12)]">
                TW
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8b90a3]">Private Workspace</p>
                <h2 className="mt-1 truncate text-3xl font-black leading-none tracking-tight text-white">TradeWay</h2>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[.08] px-3 py-1.5 text-xs font-bold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.16)]" /> Secure
            </span>
          </div>

          <p className="mt-7 text-[15px] leading-7 text-[#8b90a3]">
            Sign in to your trading workspace. <b className="font-bold text-[#f2efe6]">Journal</b>, account progress, proof profile and trade sharing stay in one fast flow.
          </p>

          <button
            type="button"
            onClick={onLogin}
            className="group mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f2efe6] px-4 text-sm font-black text-[#0b0d16] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_-18px_rgba(232,207,122,.7)] active:translate-y-0"
          >
            <LockKeyhole size={17} /> Login / Register
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </button>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              ["Journal", true],
              ["Accounts", false],
              ["Proof", false],
            ].map(([label, active]) => (
              <div
                key={String(label)}
                className={`rounded-xl border px-2 py-2.5 text-center text-xs font-black ${active ? "border-[#c9a227]/40 bg-[#c9a227]/[.075] text-[#e8cf7a]" : "border-[#1c2236] bg-white/[.018] text-[#8b90a3]"}`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-3 rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/[.052] p-3 text-sm leading-6 text-[#8b90a3]">
            <Sparkles size={17} className="mt-0.5 shrink-0 text-[#e8cf7a]" />
            <p><b className="font-bold text-[#e8cf7a]">Trading plan first.</b> Risk, setup and review notes stay attached to each trade.</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 max-[380px]:grid-cols-2">
            {[
              ["Secure Auth", "Google OAuth"],
              ["Premium Ready", "AI + MT5"],
              ["Fast Journal", "Proof workflow"],
            ].map(([title, text], index) => (
              <div key={title} className={`border-t border-[#1c2236] pt-3 ${index === 2 ? "max-[380px]:col-span-2" : ""}`}>
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#e8cf7a]">{title}</p>
                <p className="mt-1 text-[11px] text-[#8b90a3]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
