"use client";

import { Play, RefreshCw, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function makeCurve(seed = 10000, rate = 0.56, trades = 100) {
  let equity = seed;
  return Array.from({ length: 24 }, (_, i) => {
    for (let j = 0; j < trades / 24; j++) equity *= 1 + (Math.random() < rate ? 0.012 : -0.009);
    return { month: `M${i + 1}`, equity: Math.round(equity) };
  });
}

export function Backtest() {
  const [loading, setLoading] = useState(false);
  const [curve, setCurve] = useState(() => makeCurve());
  const [stats, setStats] = useState({ returnValue: 34.8, winRate: 56.2, drawdown: 8.4, factor: 1.72 });
  const run = () => { setLoading(true); setTimeout(() => { const winRate = 48 + Math.random() * 15; const next = makeCurve(10000, winRate / 100, 120); const ret = (next.at(-1)!.equity / 10000 - 1) * 100; setCurve(next); setStats({ returnValue: ret, winRate, drawdown: 6 + Math.random() * 8, factor: 1.3 + Math.random() * .8 }); setLoading(false); }, 700); };
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-xborder bg-black/85 px-4 backdrop-blur"><h1 className="text-xl font-extrabold">Strategiya backtesti</h1></header>
      <div className="p-4">
        <section className="rounded-2xl border border-xborder p-4"><div className="flex items-center gap-2"><TrendingUp className="text-xblue" size={20} /><h2 className="font-bold">Parametrlar</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Aktiv", "BTC/USDT"], ["Strategiya", "EMA Crossover"], ["Timeframe", "4 soat"], ["Davr", "2 yil"]].map(([label, value]) => <label key={label} className="text-xs text-xmuted">{label}<select className="mt-1 block w-full rounded-lg border border-xborder bg-black px-3 py-2.5 text-sm text-white"><option>{value}</option><option>ETH/USDT</option><option>XAU/USD</option></select></label>)}</div><button onClick={run} disabled={loading} className="mt-4 flex items-center gap-2 rounded-full bg-xblue px-5 py-2.5 text-sm font-bold disabled:opacity-60">{loading ? <RefreshCw className="animate-spin" size={17} /> : <Play size={17} fill="currentColor" />}{loading ? "Hisoblanmoqda..." : "Backtestni boshlash"}</button></section>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Net return", `${stats.returnValue.toFixed(1)}%`, "text-emerald-400"], ["Win rate", `${stats.winRate.toFixed(1)}%`, "text-white"], ["Max drawdown", `-${stats.drawdown.toFixed(1)}%`, "text-rose-400"], ["Profit factor", stats.factor.toFixed(2), "text-white"]].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-xborder p-4"><p className="text-xs text-xmuted">{label}</p><p className={`mt-2 font-mono text-2xl font-bold ${color}`}>{value}</p></div>)}</div>
        <section className="mt-4 rounded-2xl border border-xborder p-4"><div className="flex items-center"><h2 className="font-bold">Equity curve</h2><span className="ml-auto text-xs text-xmuted">Boshlang‘ich balans: $10,000</span></div><div className="mt-5 h-[320px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={curve}><defs><linearGradient id="equity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d9bf0" stopOpacity={.35}/><stop offset="100%" stopColor="#1d9bf0" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#2f3336" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" stroke="#71767b" fontSize={10} tickLine={false}/><YAxis stroke="#71767b" fontSize={10} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`}/><Tooltip contentStyle={{ background: "#000", border: "1px solid #2f3336", borderRadius: 10 }} formatter={(v) => [`$${Number(v).toLocaleString()}`, "Equity"]}/><Area type="monotone" dataKey="equity" stroke="#1d9bf0" strokeWidth={2.5} fill="url(#equity)"/></AreaChart></ResponsiveContainer></div></section>
      </div>
    </>
  );
}
