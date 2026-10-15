import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleCheck, Gauge, Plus, Target, TrendingDown, TrendingUp } from "lucide-react";
import { getJournalData, money, summarizeTrades } from "@/lib/journal-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, trades, failed } = await getJournalData();
  const summary = summarizeTrades(trades);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekTrades = trades.filter((trade) => new Date(`${trade.traded_at.slice(0, 10)}T00:00:00`) >= weekStart);
  const week = summarizeTrades(weekTrades);
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthly = trades.filter((trade) => trade.traded_at.slice(0, 7) === currentMonth);
  const month = summarizeTrades(monthly);
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email?.split("@")[0] || "Trader");
  const sorted = [...trades].reverse().slice(-30);
  let running = 0;
  const values = sorted.map((trade) => (running += trade.pnl ?? 0));
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = values.length < 2 ? 400 : index / (values.length - 1) * 800;
    const y = 220 - (value - min) / (max - min) * 180;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const bestSymbol = [...trades.reduce((map, trade) => map.set(trade.symbol, (map.get(trade.symbol) ?? 0) + (trade.pnl ?? 0)), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0];
  const riskUsed = weekTrades.reduce((sum, trade) => sum + (trade.risk_amount ?? 0), 0);
  const riskCap = Math.max(500, riskUsed);
  const userDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
  const metrics = [
    ["Net P&L", money(summary.pnl), `${trades.length} recorded trades`, summary.pnl >= 0 ? "text-[#43e1b0]" : "text-[#f16b78]"],
    ["Win rate", `${summary.winRate.toFixed(1)}%`, `${summary.wins} wins · ${summary.losses} losses`, "text-white"],
    ["Profit factor", Number.isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : "∞", "From recorded outcomes", "text-white"],
    ["Average R", `${summary.averageR.toFixed(2)}R`, "Risk-adjusted result", "text-white"],
  ] as const;

  return <div className="space-y-4">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-medium uppercase text-[#43e1b0]">{userDate}</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Welcome back, {name}.</h1><p className="mt-2 text-sm text-[#899196]">A clear read on the trades you have actually logged.</p></div>
      <Link href="/trades?add=1" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#43e1b0] px-4 text-sm font-semibold text-[#080d17]"><Plus size={16}/> Add trade</Link>
    </section>
    {failed && <p role="status" className="rounded-md border border-[#54373a] bg-[#1a1011] px-4 py-3 text-sm text-[#ff9ea7]">Journal data is temporarily unavailable. Try refreshing in a moment.</p>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value,helper,color])=><article key={label} className="rounded-lg border border-[#202529] bg-[#0f1214] p-4"><div className="flex items-center justify-between"><p className="text-xs text-[#899196]">{label}</p>{summary.pnl >= 0 ? <TrendingUp size={15} className="text-[#899196]"/> : <TrendingDown size={15} className="text-[#899196]"/>}</div><p className={`mt-4 font-mono text-2xl font-semibold ${color}`}>{value}</p><p className="mt-2 text-xs text-[#899196]">{helper}</p></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
      <article className="relative min-h-[300px] overflow-hidden rounded-lg border border-[#202529] bg-[#0f1214] p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold">Equity curve</h2><p className="mt-1 text-xs text-[#899196]">Cumulative realized P&amp;L · latest {sorted.length} trades</p></div><Link href="/trades" className="inline-flex items-center gap-1 text-xs text-[#aeb7b9] hover:text-white">Journal <ArrowUpRight size={14}/></Link></div>{trades.length ? <div className="absolute inset-x-5 bottom-8 top-24"><div className="absolute inset-0 flex flex-col justify-between">{[1,2,3,4].map(i=><span key={i} className="border-t border-[#202529]"/>)}</div><svg viewBox="0 0 800 260" preserveAspectRatio="none" className="relative h-full w-full" aria-label="Cumulative trading profit and loss"><defs><linearGradient id="dashboard-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#43e1b0" stopOpacity=".2"/><stop offset="1" stopColor="#43e1b0" stopOpacity="0"/></linearGradient></defs><path d={`${points} L800 260 L0 260Z`} fill="url(#dashboard-area)"/><path d={points} fill="none" stroke="#43e1b0" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg></div> : <div className="grid min-h-[210px] place-items-center text-center"><div><p className="text-sm text-[#d8dddf]">Your equity curve starts with your first trade.</p><p className="mt-1 text-xs text-[#899196]">No sample results are shown.</p></div></div>}</article>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-lg border border-[#202529] bg-[#0f1214] p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">This week</h2><p className="mt-1 text-xs text-[#899196]">{week.closed} closed · {week.wins} wins · {week.losses} losses</p></div><Gauge size={20} className="text-[#43e1b0]"/></div><p className={`mt-5 font-mono text-2xl font-semibold ${week.pnl >= 0 ? "text-[#43e1b0]" : "text-[#f16b78]"}`}>{money(week.pnl)}</p><div className="mt-5 h-1.5 rounded-full bg-[#202529]"><div className="h-full rounded-full bg-[#43e1b0]" style={{width:`${Math.min(100, riskUsed / riskCap * 100)}%`}}/></div><p className="mt-2 text-xs text-[#899196]">{money(riskUsed)} risk logged this week</p></article>
        <article className="rounded-lg border border-[#202529] bg-[#0f1214] p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-[#15191c] text-[#d9b978]"><Target size={18}/></span><div><h2 className="font-semibold">Month to date</h2><p className="mt-0.5 text-xs text-[#899196]">{monthly.length} trades recorded</p></div></div><p className={`mt-5 font-mono text-2xl font-semibold ${month.pnl >= 0 ? "text-[#43e1b0]" : "text-[#f16b78]"}`}>{money(month.pnl)}</p><p className="mt-2 text-xs text-[#899196]">{bestSymbol ? `Top symbol: ${bestSymbol[0]} · ${money(bestSymbol[1])}` : "Add trades to reveal your strongest symbols."}</p></article>
      </div>
    </section>
    <section className="grid gap-3 sm:grid-cols-3">{[[CircleCheck,"Closed trades",String(summary.closed),`${summary.wins} wins · ${summary.losses} losses`],[Target,"Average R",`${summary.averageR.toFixed(2)}R`,"Across trades with a recorded R value"],[CalendarDays,"This month",String(monthly.length),"Based on your journal dates"]].map(([Icon,title,value,helper])=>{const C=Icon as typeof Target;return <article key={String(title)} className="flex items-center gap-4 rounded-lg border border-[#202529] bg-[#0f1214] p-4"><span className="grid size-10 place-items-center rounded-md bg-[#15191c] text-[#43e1b0]"><C size={19}/></span><div><p className="text-xs text-[#899196]">{String(title)}</p><p className="mt-1 font-mono font-semibold">{String(value)}</p><p className="mt-1 text-xs text-[#899196]">{String(helper)}</p></div></article>})}</section>
  </div>;
}

