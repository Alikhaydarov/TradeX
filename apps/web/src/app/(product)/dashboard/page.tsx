import { ArrowUpRight, CalendarDays, CircleCheck, Gauge, Plus, Sparkles, Target } from "lucide-react";

const stats = [
  ["Net P&L", "+$1,240.00", "+1.24%", "text-[#35D6AD]"],
  ["Win rate", "68.2%", "15 of 22 trades", "text-white"],
  ["Profit factor", "2.14", "Healthy", "text-white"],
  ["Plan alignment", "91%", "+6% this week", "text-white"]
] as const;

export default function DashboardPage() {
  return <div className="space-y-4">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase text-[#35D6AD]">Tuesday, October 14</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Good morning, Alex.</h1><p className="mt-2 text-sm text-[#91A0B5]">Your risk is controlled and your process is trending upward.</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#35D6AD] px-4 text-sm font-semibold text-[#080D17]"><Plus size={16}/> Add trade</button></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label,value,helper,color])=><article key={label} className="rounded-lg border border-[#27364A] bg-[#101827] p-4"><div className="flex items-center justify-between"><p className="text-xs text-[#91A0B5]">{label}</p><ArrowUpRight size={14} className="text-[#91A0B5]"/></div><p className={`mt-4 font-mono text-2xl font-semibold ${color}`}>{value}</p><p className="mt-2 text-xs text-[#91A0B5]">{helper}</p></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
      <article className="relative min-h-[360px] overflow-hidden rounded-lg border border-[#27364A] bg-[#101827] p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold">Equity curve</h2><p className="mt-1 text-xs text-[#91A0B5]">Balance and equity over the last 30 days</p></div><button className="h-8 rounded-md border border-[#27364A] px-3 text-xs">30 days</button></div><div className="absolute inset-x-5 bottom-8 top-24"><div className="absolute inset-0 flex flex-col justify-between">{[1,2,3,4].map(i=><span key={i} className="border-t border-[#27364A]/60"/>)}</div><svg viewBox="0 0 800 260" preserveAspectRatio="none" className="relative h-full w-full" aria-label="Positive equity curve"><defs><linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#35D6AD" stopOpacity=".22"/><stop offset="1" stopColor="#35D6AD" stopOpacity="0"/></linearGradient></defs><path d="M0 220 L70 204 L140 214 L220 165 L300 185 L380 120 L465 150 L550 82 L630 108 L710 46 L800 28 L800 260 L0 260Z" fill="url(#dash-area)"/><path d="M0 220 L70 204 L140 214 L220 165 L300 185 L380 120 L465 150 L550 82 L630 108 L710 46 L800 28" fill="none" stroke="#35D6AD" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg></div></article>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-lg border border-[#27364A] bg-[#101827] p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Daily risk</h2><p className="mt-1 text-xs text-[#91A0B5]">$120 of $500 limit used</p></div><Gauge size={20} className="text-[#35D6AD]"/></div><div className="mt-7 h-2 rounded-full bg-[#27364A]"><div className="h-full w-[24%] rounded-full bg-[#35D6AD]"/></div><div className="mt-4 flex justify-between text-xs"><span className="text-[#91A0B5]">24% utilized</span><span className="text-[#35D6AD]">Low risk</span></div></article>
        <article className="rounded-lg border border-[#27364A] bg-[#101827] p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-[#6875F5]/15 text-[#8C96FF]"><Sparkles size={18}/></span><div><h2 className="font-semibold">Coach insight</h2><p className="mt-0.5 text-xs text-[#91A0B5]">Based on your last 12 trades</p></div></div><p className="mt-5 text-sm leading-6 text-[#D8DEE8]">Your strongest sessions begin after 09:30 UTC. Trades taken earlier show 31% lower plan alignment.</p><button className="mt-5 text-sm font-medium text-[#8C96FF]">Review with AI →</button></article>
      </div>
    </section>
    <section className="grid gap-4 lg:grid-cols-3">
      {[ [CircleCheck,"Process score","8.7 / 10","Four sessions above target"], [Target,"Evaluation","Phase 1 · 62%","$3,800 remaining to target"], [CalendarDays,"This week","7 trades","4 wins · 2 losses · 1 BE"] ].map(([Icon,title,value,helper])=>{const C=Icon as typeof Target;return <article key={String(title)} className="flex items-center gap-4 rounded-lg border border-[#27364A] bg-[#101827] p-4"><span className="grid size-10 place-items-center rounded-md bg-[#1B293B] text-[#35D6AD]"><C size={19}/></span><div><p className="text-xs text-[#91A0B5]">{String(title)}</p><p className="mt-1 font-mono font-semibold">{String(value)}</p><p className="mt-1 text-xs text-[#91A0B5]">{String(helper)}</p></div></article>})}
    </section>
  </div>;
}

