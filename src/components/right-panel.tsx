"use client";

import { Activity, CheckCircle2, Clock3, Radio, ShieldAlert } from "lucide-react";
import { usePathname } from "next/navigation";

const markets = [
  { coin: "BTC", price: "$104,250", change: "+2.8%", color: "bg-orange-400" },
  { coin: "ETH", price: "$3,864", change: "+1.4%", color: "bg-indigo-400" },
  { coin: "XAU", price: "$2,354", change: "-0.3%", color: "bg-amber-300" },
];

export function RightPanel() {
  const pathname = usePathname();
  if (pathname?.startsWith("/journal")) return null;

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[300px] shrink-0 space-y-3 overflow-y-auto xl:block">
      <section className="rounded-[22px] border border-white/9 bg-[#0b1220]/70 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Activity className="text-cyan-300" size={18} />
          <div>
            <h2 className="text-sm font-bold">Market radar</h2>
            <p className="text-[10px] text-slate-500">Watchlist snapshot</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">
            <Radio size={10} /> LIVE
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {markets.map((market) => (
            <div key={market.coin} className="flex items-center rounded-2xl border border-white/[.04] bg-white/[.025] p-3">
              <span className={`h-2.5 w-2.5 rounded-full ${market.color}`} />
              <strong className="ml-3 text-sm">{market.coin}</strong>
              <span className="ml-auto font-mono text-xs">{market.price}</span>
              <span className={`ml-3 text-[10px] font-bold ${market.change.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>{market.change}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[22px] border border-amber-400/15 bg-amber-400/[.045] p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-amber-200">
          <ShieldAlert size={17} />
          <h2 className="text-sm font-bold">Pre-trade checklist</h2>
        </div>
        <div className="mt-4 space-y-3 text-xs text-slate-300">
          {["Risk under 1%", "Setup matches plan", "News window checked"].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[22px] border border-white/9 bg-[#0b1220]/70 p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Clock3 size={17} className="text-blue-300" />
          <h2 className="text-sm font-bold">Sessions</h2>
        </div>
        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center"><span className="text-slate-500">London</span><strong className="ml-auto text-emerald-300">Open</strong></div>
          <div className="flex items-center"><span className="text-slate-500">New York</span><strong className="ml-auto">2h 14m</strong></div>
          <div className="flex items-center"><span className="text-slate-500">Asia</span><strong className="ml-auto text-slate-500">Closed</strong></div>
        </div>
      </section>
    </aside>
  );
}
