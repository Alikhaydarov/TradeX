import { Activity, Clock3, Radio, Search, Sparkles } from "lucide-react";

const markets = [
  { coin: "BTC", price: "$104,250", change: "+2.8%", color: "bg-orange-400" },
  { coin: "ETH", price: "$3,864", change: "+1.4%", color: "bg-indigo-400" },
  { coin: "XAU", price: "$2,354", change: "-0.3%", color: "bg-amber-300" },
];

export function RightPanel() {
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[300px] shrink-0 space-y-3 overflow-y-auto xl:block">
      <label className="flex h-12 items-center gap-3 rounded-2xl border border-white/9 bg-[#0b1220]/42 px-4 text-slate-500 backdrop-blur-2xl focus-within:border-blue-400/30">
        <Search size={17} />
        <input placeholder="Workspace bo'ylab izlash" className="w-full bg-transparent text-sm text-white outline-none" />
      </label>

      <section className="rounded-[24px] border border-white/9 bg-[#0b1220]/42 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Activity className="text-cyan-300" size={18} />
          <div>
            <h2 className="text-sm font-bold">Market radar</h2>
            <p className="text-[10px] text-slate-500">{"Kuzatuv ro'yxati"}</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">
            <Radio size={10} /> LIVE
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {markets.map((market) => (
            <div key={market.coin} className="flex items-center rounded-2xl bg-white/[.025] p-3">
              <span className={`h-2.5 w-2.5 rounded-full ${market.color}`} />
              <strong className="ml-3 text-sm">{market.coin}</strong>
              <span className="ml-auto font-mono text-xs">{market.price}</span>
              <span className={`ml-3 text-[10px] font-bold ${market.change.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>{market.change}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-white/9 bg-gradient-to-br from-blue-500/14 via-[#0b1220]/35 to-violet-500/12 p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2 text-violet-200">
          <Sparkles size={17} />
          <h2 className="text-sm font-bold">Bugungi fokus</h2>
        </div>
        <p className="mt-3 text-lg font-black leading-tight">London open oldidan riskni qayta tekshiring.</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">{"Yuqori ta'sirli yangiliklar 16:30 da kutilmoqda."}</p>
      </section>

      <section className="rounded-[24px] border border-white/9 bg-[#0b1220]/42 p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Clock3 size={17} className="text-blue-300" />
          <h2 className="text-sm font-bold">Sessiyalar</h2>
        </div>
        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center"><span className="text-slate-500">London</span><strong className="ml-auto text-emerald-300">Ochiq</strong></div>
          <div className="flex items-center"><span className="text-slate-500">New York</span><strong className="ml-auto">2s 14d</strong></div>
          <div className="flex items-center"><span className="text-slate-500">Asia</span><strong className="ml-auto text-slate-500">Yopiq</strong></div>
        </div>
      </section>
    </aside>
  );
}
