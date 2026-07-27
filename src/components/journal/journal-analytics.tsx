"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { InstrumentBadge } from "@/components/instrument-badge";
import type { JournalEntry, PropAccount } from "@/components/types";
import type { JournalMetrics } from "./use-journal-data";

type AnalyticsView = "overview" | "strategy" | "symbols";

type SetupRow = {
  name: string;
  pnl: number;
  trades: number;
  wins: number;
  rate: number;
};

type MistakeRow = {
  name: string;
  pnl: number;
  trades: number;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function JournalAnalytics({
  account,
  trades,
  metrics,
  equity,
  setups,
  mistakes,
  planRate,
  formatPnl,
}: {
  account: PropAccount;
  trades: JournalEntry[];
  metrics: JournalMetrics;
  equity: Array<{ trade: number; equity: number; label: string }>;
  setups: SetupRow[];
  mistakes: MistakeRow[];
  planRate: number;
  formatPnl: (value: number, baseValue?: number) => string;
}) {
  const [view, setView] = useState<AnalyticsView>("overview");

  const analysis = useMemo(() => {
    const wins = trades.filter((trade) => trade.pnl > 0);
    const losses = trades.filter((trade) => trade.pnl < 0);
    const averageWin = wins.length
      ? wins.reduce((total, trade) => total + trade.pnl, 0) / wins.length
      : 0;
    const averageLoss = losses.length
      ? losses.reduce((total, trade) => total + trade.pnl, 0) / losses.length
      : 0;
    const bestTrade = [...trades].sort((a, b) => b.pnl - a.pnl)[0] || null;
    const worstTrade = [...trades].sort((a, b) => a.pnl - b.pnl)[0] || null;
    const profitFactorScore = clamp((metrics.profitFactor / 2) * 100);
    const rScore = clamp(((metrics.averageR + 1) / 3) * 100);
    const profitabilityScore = Math.round(
      clamp(metrics.rate * 0.3 + profitFactorScore * 0.3 + planRate * 0.25 + rScore * 0.15),
    );

    const symbols = new Map<
      string,
      { symbol: string; pnl: number; trades: number; wins: number; resultR: number }
    >();
    trades.forEach((trade) => {
      const current = symbols.get(trade.symbol) || {
        symbol: trade.symbol,
        pnl: 0,
        trades: 0,
        wins: 0,
        resultR: 0,
      };
      current.pnl += trade.pnl;
      current.trades += 1;
      current.wins += trade.pnl > 0 ? 1 : 0;
      current.resultR += trade.resultR || 0;
      symbols.set(trade.symbol, current);
    });

    return {
      averageWin,
      averageLoss,
      bestTrade,
      worstTrade,
      profitabilityScore,
      scoreRadar: [
        { subject: "Win rate", value: clamp(metrics.rate) },
        { subject: "Profit", value: profitFactorScore },
        { subject: "Plan", value: clamp(planRate) },
        { subject: "R", value: rScore },
      ],
      symbols: [...symbols.values()]
        .map((symbol) => ({
          ...symbol,
          rate: symbol.trades ? Math.round((symbol.wins / symbol.trades) * 100) : 0,
          averageR: symbol.trades ? symbol.resultR / symbol.trades : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl),
    };
  }, [metrics.averageR, metrics.profitFactor, metrics.rate, planRate, trades]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 items-center gap-1 rounded-[0.95rem] border border-white/8 bg-[#050505] p-1 sm:flex sm:flex-wrap sm:gap-2">
        {([
          ["overview", "Overview"],
          ["strategy", "Strategy"],
          ["symbols", "Symbols"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={`min-w-0 rounded-[0.8rem] px-2 py-2 text-xs font-semibold transition sm:px-3 sm:py-1.5 ${
              view === value
                ? "bg-white text-black"
                : "bg-transparent text-zinc-500 hover:bg-[#0d0d0d] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="col-span-3 rounded-[0.8rem] bg-[#0d0d0d] px-3 py-1.5 text-center text-xs font-semibold text-white sm:col-span-1 sm:ml-auto">
          All time
        </div>
      </div>

      {view === "overview" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
            <div className="border-b border-white/8 px-4 py-3">
              <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                {account.name} <span className="mx-1 text-zinc-700">&gt;</span> Analytics
              </p>
              <h2 className="text-[14px] font-black text-white">Account Balance</h2>
              <p className="mt-1 text-xs text-zinc-500">Full journal history</p>
            </div>
            <div className="h-[240px] p-2 sm:h-[260px] sm:p-4">
              {equity.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equity} margin={{ left: 8, right: 8, top: 16, bottom: 4 }}>
                    <defs>
                      <linearGradient id="analyticsBalanceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#171717" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                    <XAxis
                      dataKey="trade"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#707b91" }}
                    />
                    <YAxis
                      width={54}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`}
                      tick={{ fontSize: 10, fill: "#707b91" }}
                    />
                    <Tooltip
                      formatter={(value) => formatPnl(Number(value))}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"}
                      contentStyle={{
                        background: "#171717",
                        border: "1px solid #333333",
                        borderRadius: 12,
                        color: "#f1f1f1",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#22c55e"
                      fill="url(#analyticsBalanceFill)"
                      strokeWidth={3}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyAnalytics text="Add trades to unlock analytics charts." />
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div>
                <h2 className="text-[14px] font-black text-white">Tradox Profitability Score</h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {trades.length < 5
                    ? "Early read, score becomes sharper after 5+ trades."
                    : "Live score based on execution quality."}
                </p>
              </div>
              <span className="rounded-full border border-white/8 bg-[#050505] px-2.5 py-1 text-[11px] font-black text-white">
                {analysis.profitabilityScore}
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_72px]">
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analysis.scoreRadar}>
                    <PolarGrid stroke="rgba(255,255,255,.12)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#d4d4d8", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.36} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-[#050505] px-2.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Score
                </p>
                <p className="text-2xl font-black text-white">{analysis.profitabilityScore}</p>
                <div className="h-full min-h-24 rounded-full bg-[#0d0d0d] p-2">
                  <div
                    className="h-full w-full rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600"
                    style={{
                      clipPath: `inset(${100 - analysis.profitabilityScore}% 0 0 0 round 999px)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
            <MetricPanel
              title="Average Win"
              value={analysis.averageWin ? formatPnl(analysis.averageWin) : "-"}
              note={analysis.bestTrade ? `Best ${analysis.bestTrade.symbol}` : "No winning trade"}
              accent="good"
            />
            <MetricPanel
              title="Average Loss"
              value={analysis.averageLoss ? formatPnl(analysis.averageLoss) : "-"}
              note={analysis.worstTrade ? `Worst ${analysis.worstTrade.symbol}` : "No losing trade"}
              accent="bad"
            />
            <MetricPanel
              title="Best Trade"
              value={analysis.bestTrade ? formatPnl(analysis.bestTrade.pnl) : "-"}
              note={analysis.bestTrade?.symbol || "No data"}
              accent={analysis.bestTrade && analysis.bestTrade.pnl >= 0 ? "good" : "neutral"}
            />
            <MetricPanel
              title="Worst Trade"
              value={analysis.worstTrade ? formatPnl(analysis.worstTrade.pnl) : "-"}
              note={analysis.worstTrade?.symbol || "No data"}
              accent={analysis.worstTrade && analysis.worstTrade.pnl < 0 ? "bad" : "neutral"}
            />
          </div>
        </div>
      ) : null}

      {view === "strategy" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
            <h2 className="text-[14px] font-black text-white">Setup Performance</h2>
            <div className="mt-4 space-y-4">
              {setups.length ? (
                setups.map((setup) => (
                  <div key={setup.name}>
                    <div className="flex gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-white">{setup.name}</span>
                      <span
                        className={`shrink-0 font-mono font-bold ${
                          setup.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {setup.rate}% / {formatPnl(setup.pnl)}
                      </span>
                    </div>
                    <ProgressBar label={`${setup.trades} trades`} value={setup.rate} />
                  </div>
                ))
              ) : (
                <EmptyAnalytics text="No setup analytics yet." />
              )}
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
            <h2 className="text-[14px] font-black text-white">Costly Mistakes</h2>
            <p className="mt-1 text-xs text-zinc-500">Execution errors ranked by total impact.</p>
            <div className="mt-4 space-y-3">
              {mistakes.length ? (
                mistakes.map((mistake, index) => (
                  <div
                    key={mistake.name}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#050505] px-3 py-3"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#111111] font-mono text-[10px] text-zinc-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{mistake.name}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{mistake.trades} trades</p>
                    </div>
                    <strong
                      className={`shrink-0 font-mono text-sm ${
                        mistake.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {formatPnl(mistake.pnl)}
                    </strong>
                  </div>
                ))
              ) : (
                <EmptyAnalytics text="No mistakes recorded." />
              )}
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-black text-white">Plan Adherence</h2>
                <p className="mt-1 text-xs text-zinc-500">Trades executed according to your plan.</p>
              </div>
              <strong className="font-mono text-xl text-white">{planRate}%</strong>
            </div>
            <ProgressBar label={`${trades.length} reviewed trades`} value={planRate} />
          </section>
        </div>
      ) : null}

      {view === "symbols" ? (
        <section className="overflow-hidden rounded-[1rem] border border-white/8 bg-[#070707]">
          <header className="border-b border-white/8 px-4 py-3">
            <h2 className="text-[14px] font-black text-white">Symbol Performance</h2>
            <p className="mt-1 text-xs text-zinc-500">Results grouped by traded instrument.</p>
          </header>
          {analysis.symbols.length ? (
            <div className="divide-y divide-white/8">
              {analysis.symbols.map((symbol) => (
                <div
                  key={symbol.symbol}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(180px,1fr)_100px_100px_120px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <InstrumentBadge symbol={symbol.symbol} compact className="shrink-0 bg-[#121212]" />
                    <span className="truncate text-xs text-zinc-500 sm:hidden">
                      {symbol.trades} trades · {symbol.rate}% win
                    </span>
                  </div>
                  <span className="hidden text-right font-mono text-sm text-zinc-400 sm:block">
                    {symbol.trades} trades
                  </span>
                  <span className="hidden text-right font-mono text-sm text-zinc-400 sm:block">
                    {symbol.rate}%
                  </span>
                  <strong
                    className={`text-right font-mono text-sm ${
                      symbol.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatPnl(symbol.pnl)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyAnalytics text="No symbol analytics yet." />
          )}
        </section>
      ) : null}
    </div>
  );
}

function MetricPanel({
  title,
  value,
  note,
  accent,
}: {
  title: string;
  value: string;
  note: string;
  accent: "good" | "bad" | "neutral";
}) {
  return (
    <section className="rounded-[1rem] border border-white/8 bg-[#070707] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">{title}</p>
      <p
        className={`mt-3 truncate font-mono text-xl font-black ${
          accent === "good"
            ? "text-emerald-300"
            : accent === "bad"
              ? "text-rose-300"
              : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-zinc-500">{note}</p>
    </section>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-600">
        <span>{label}</span>
        <span>{Math.round(clamp(value))}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#111111]">
        <div
          className="h-full rounded-full bg-zinc-300"
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

function EmptyAnalytics({ text }: { text: string }) {
  return (
    <div className="grid min-h-32 place-items-center px-6 text-center text-sm text-zinc-600">
      {text}
    </div>
  );
}
