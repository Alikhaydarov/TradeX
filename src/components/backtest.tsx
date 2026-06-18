"use client";

import { BarChart3, Clock3, LoaderCircle, Play, Server, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./auth-context";
import type { BacktestResult } from "./types";

interface Run {
  id: string;
  asset: string;
  strategy: string;
  timeframe: string;
  period: string;
  net_return: string;
  win_rate: string;
  profit_factor: string;
  created_at: string;
}

const selectors = [
  { key: "asset", label: "Asset", options: ["BTC/USDT", "ETH/USDT", "XAU/USD"] },
  { key: "strategy", label: "Strategy", options: ["EMA Crossover", "Breakout", "RSI Reversal"] },
  { key: "timeframe", label: "Timeframe", options: ["15 daqiqa", "1 soat", "4 soat", "1 kun"] },
  { key: "period", label: "Period", options: ["2 yil", "3 yil", "5 yil"] },
] as const;

function StatCard({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" | "rose" | "violet" }) {
  const toneClass = {
    blue: "text-blue-300 bg-blue-400/10",
    green: "text-emerald-300 bg-emerald-400/10",
    rose: "text-rose-300 bg-rose-400/10",
    violet: "text-violet-300 bg-violet-400/10",
  }[tone];

  return (
    <div className="rounded-[22px] border border-white/9 bg-[#0b1220]/70 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-2xl">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{label}</p>
      <p className={`mt-3 inline-flex rounded-2xl px-3 py-2 font-mono text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function RunRow({ run }: { run: Run }) {
  const net = Number(run.net_return);
  const positive = net >= 0;

  return (
    <article className="grid gap-3 border-b border-white/8 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <strong className="truncate text-sm text-white">{run.asset}</strong>
          <span className="rounded-full bg-white/[.055] px-2 py-1 text-[10px] font-bold text-slate-400">{run.timeframe}</span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {run.strategy} Â· {run.period} Â· {new Date(run.created_at).toLocaleDateString("uz-UZ")}
        </p>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <span className={`font-mono text-sm font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>
          {positive ? "+" : ""}{run.net_return}%
        </span>
        <span className="text-xs text-slate-500">WR {run.win_rate}%</span>
        <span className="text-xs text-slate-500">PF {run.profit_factor}</span>
      </div>
    </article>
  );
}

export function Backtest() {
  const { user } = useAuth();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    asset: "BTC/USDT",
    strategy: "EMA Crossover",
    timeframe: "4 soat",
    period: "2 yil",
    initialBalance: 10000,
    riskPercent: 1,
  });

  const latestRun = runs[0];
  const previewStats = useMemo(() => {
    if (result) {
      return {
        net: `${result.netReturn}%`,
        win: `${result.winRate}%`,
        drawdown: `-${result.maxDrawdown}%`,
        profit: String(result.profitFactor),
      };
    }
    return {
      net: latestRun ? `${Number(latestRun.net_return) >= 0 ? "+" : ""}${latestRun.net_return}%` : "Ready",
      win: latestRun ? `${latestRun.win_rate}%` : "-",
      drawdown: "-",
      profit: latestRun ? latestRun.profit_factor : "-",
    };
  }, [latestRun, result]);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    apiRequest<{ runs: Run[] }>("/api/backtests")
      .then((data) => {
        if (active) setRuns(data.runs);
      })
      .catch(() => {
        if (active) setRuns([]);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const setField = (key: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ result: BacktestResult }>("/api/backtests", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(data.result);
      if (user) {
        const history = await apiRequest<{ runs: Run[] }>("/api/backtests");
        setRuns(history.runs);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Backtest bajarilmadi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#01040a]">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#111111]/88 px-4 py-4 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-blue-300/12 bg-blue-400/10 text-blue-200">
            <BarChart3 size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300/70">Strategy lab</p>
            <h1 className="truncate text-2xl font-black tracking-tight">Backtest</h1>
          </div>
          <span className="ml-auto hidden items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 sm:flex">
            <Server size={14} /> Online
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-white/10 bg-[#0b1220]/70 p-4 shadow-2xl shadow-slate-950/25 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
              <Play size={18} />
            </span>
            <div>
              <h2 className="text-lg font-black">Test setup</h2>
              <p className="text-xs text-slate-500">Asset, model va risk parametrlarini tanlang.</p>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          <div className="mt-5 grid gap-3">
            {selectors.map((item) => (
              <label key={item.key} className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">
                {item.label}
                <select
                  value={String(form[item.key])}
                  onChange={(event) => setField(item.key, event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#070d18] px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/40"
                >
                  {item.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">
                Balance
                <Input
                  type="number"
                  value={form.initialBalance}
                  onChange={(event) => setField("initialBalance", Number(event.target.value))}
                  className="mt-2 h-11 rounded-2xl border-white/10 bg-[#070d18] font-mono text-white"
                />
              </label>
              <label className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">
                Risk %
                <Input
                  type="number"
                  step=".1"
                  max="5"
                  value={form.riskPercent}
                  onChange={(event) => setField("riskPercent", Number(event.target.value))}
                  className="mt-2 h-11 rounded-2xl border-white/10 bg-[#070d18] font-mono text-white"
                />
              </label>
            </div>
          </div>

          <Button onClick={() => void run()} disabled={loading} className="mt-5 h-12 w-full rounded-2xl bg-white text-sm font-black text-slate-950 hover:bg-slate-200">
            {loading ? <LoaderCircle className="animate-spin" size={16} /> : <Play size={16} />}
            Backtestni boshlash
          </Button>
        </section>

        <section className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Net return" value={previewStats.net} tone={previewStats.net.startsWith("-") ? "rose" : "green"} />
            <StatCard label="Win rate" value={previewStats.win} tone="blue" />
            <StatCard label="Max drawdown" value={previewStats.drawdown} tone="rose" />
            <StatCard label="Profit factor" value={previewStats.profit} tone="violet" />
          </div>

          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/70 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-black">Equity curve</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {result ? `${result.tradesCount} trade Â· ${form.asset} Â· ${form.strategy}` : "Run a backtest to generate a curve."}
                </p>
              </div>
              {result?.netReturn ? (
                <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${result.netReturn >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                  {result.netReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {result.netReturn >= 0 ? "+" : ""}{result.netReturn}%
                </span>
              ) : null}
            </div>
            <div className="h-[300px] p-3 sm:h-[380px] sm:p-5">
              {result ? (
                <ResponsiveContainer>
                  <AreaChart data={result.equityCurve}>
                    <defs>
                      <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#333333" vertical={false} />
                    <XAxis dataKey="step" stroke="#8a8a8a" tickLine={false} axisLine={false} />
                    <YAxis stroke="#8a8a8a" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#07101dcc", border: "1px solid #263653", borderRadius: 16 }} />
                    <Area dataKey="equity" stroke="#67e8f9" strokeWidth={2.5} fill="url(#equityFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Clock3 className="mx-auto text-slate-600" size={34} />
                    <h3 className="mt-3 text-lg font-black">No run yet</h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Setupni tanlang va natijani equity curve, win rate va drawdown bilan ko'ring.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/55 backdrop-blur-2xl">
            <div className="flex items-center border-b border-white/8 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-black">Saved runs</h2>
                <p className="mt-1 text-xs text-slate-500">{user ? "Accountga saqlangan tarix." : "Kirsangiz natijalar saqlanadi."}</p>
              </div>
              {historyLoading ? <LoaderCircle className="ml-auto animate-spin text-slate-500" size={17} /> : null}
            </div>
            {!historyLoading && !runs.length ? (
              <div className="grid min-h-44 place-items-center px-6 text-center text-sm text-slate-500">Hali saqlangan backtest yo'q.</div>
            ) : (
              runs.map((item) => <RunRow key={item.id} run={item} />)
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
