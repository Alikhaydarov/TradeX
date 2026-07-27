"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  History,
  Play,
  ShieldAlert,
  Target,
} from "lucide-react";

const trades = [
  { id: 1, symbol: "EURUSD", setup: "London continuation", result: 2.4 },
  { id: 2, symbol: "XAUUSD", setup: "New York reversal", result: -1 },
  { id: 3, symbol: "EURUSD", setup: "Liquidity sweep", result: 3.1 },
  { id: 4, symbol: "GBPUSD", setup: "London continuation", result: 1.8 },
  { id: 5, symbol: "XAUUSD", setup: "Liquidity sweep", result: -1 },
];

export function BacktestWorkspace() {
  const [strategy, setStrategy] = useState("Liquidity sweep");
  const [asset, setAsset] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("15m");
  const [running, setRunning] = useState(false);

  const stats = useMemo(() => {
    const wins = trades.filter((trade) => trade.result > 0);
    const grossWin = wins.reduce((sum, trade) => sum + trade.result, 0);
    const grossLoss = Math.abs(
      trades
        .filter((trade) => trade.result < 0)
        .reduce((sum, trade) => sum + trade.result, 0),
    );
    return {
      winRate: Math.round((wins.length / trades.length) * 100),
      netR: trades.reduce((sum, trade) => sum + trade.result, 0),
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin,
    };
  }, []);

  const runBacktest = () => {
    setRunning(true);
    window.setTimeout(() => setRunning(false), 900);
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-4 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#080808] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <History size={14} /> Strategy laboratory
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Backtest workspace
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Define one repeatable model, review a clean sample and measure the
            execution before risking capital.
          </p>
        </div>
        <button
          type="button"
          onClick={runBacktest}
          disabled={running}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
        >
          <Play size={15} fill="currentColor" />
          {running ? "Running…" : "Run backtest"}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Win rate",
            value: `${stats.winRate}%`,
            hint: `${trades.filter((trade) => trade.result > 0).length}/${trades.length} winning samples`,
            icon: Target,
          },
          {
            label: "Net result",
            value: `${stats.netR > 0 ? "+" : ""}${stats.netR.toFixed(1)}R`,
            hint: "Risk-normalized outcome",
            icon: Activity,
          },
          {
            label: "Profit factor",
            value: stats.profitFactor.toFixed(2),
            hint: "Gross wins / gross losses",
            icon: BarChart3,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-white/8 bg-[#090909] p-4"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-medium">{item.label}</span>
                <Icon size={16} />
              </div>
              <strong className="mt-4 block font-mono text-2xl text-white">
                {item.value}
              </strong>
              <small className="mt-2 block text-[11px] text-zinc-600">
                {item.hint}
              </small>
            </article>
          );
        })}
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/8 bg-[#090909] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Test parameters</h2>
          </div>
          <div className="mt-5 space-y-4">
            {[
              {
                label: "Strategy",
                value: strategy,
                onChange: setStrategy,
                options: [
                  "Liquidity sweep",
                  "London continuation",
                  "New York reversal",
                ],
              },
              {
                label: "Asset",
                value: asset,
                onChange: setAsset,
                options: ["EURUSD", "GBPUSD", "XAUUSD", "US100"],
              },
              {
                label: "Timeframe",
                value: timeframe,
                onChange: setTimeframe,
                options: ["5m", "15m", "1h", "4h"],
              },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                  {field.label}
                </span>
                <select
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#050505] px-3 text-sm text-white outline-none transition focus:border-white/25"
                >
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.045] p-3 text-xs leading-5 text-emerald-200/70">
            <div className="flex items-center gap-2 font-semibold text-emerald-200">
              <CheckCircle2 size={14} /> One variable at a time
            </div>
            Keep entry, stop placement and session rules fixed while testing the
            selected setup.
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#090909]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Sample executions</h2>
              <p className="mt-1 text-[11px] text-zinc-600">
                {strategy} · {asset} · {timeframe}
              </p>
            </div>
            <span className="rounded-full border border-white/8 bg-[#050505] px-2.5 py-1 text-[10px] text-zinc-500">
              {trades.length} trades
            </span>
          </div>
          <div className="divide-y divide-white/6">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[100px_minmax(0,1fr)_90px] sm:px-5"
              >
                <span className="font-mono text-xs text-zinc-300">
                  {trade.symbol}
                </span>
                <span className="hidden truncate text-xs text-zinc-500 sm:block">
                  {trade.setup}
                </span>
                <strong
                  className={`text-right font-mono text-sm ${
                    trade.result > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {trade.result > 0 ? "+" : ""}
                  {trade.result.toFixed(1)}R
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
