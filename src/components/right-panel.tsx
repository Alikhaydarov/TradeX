import { Search, TrendingUp } from "lucide-react";

const trends = [
  ["O'zbekistonda trendda", "#BTC", "2,481 post"],
  ["Kripto · Trend", "$SOL", "1,209 post"],
  ["Forex · Trend", "XAUUSD", "986 post"],
  ["Trading", "#PriceAction", "614 post"],
];

export function RightPanel() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 px-5 py-2 xl:block">
      <label className="flex h-11 items-center gap-3 rounded-2xl border border-xborder bg-xpanel px-4 text-xmuted focus-within:ring-1 focus-within:ring-xblue">
        <Search size={19} /><input placeholder="Izlash" className="w-full bg-transparent text-[15px] text-white outline-none" />
      </label>
      <section className="mt-4 overflow-hidden rounded-2xl border border-xborder bg-xcard/70 shadow-xl shadow-slate-950/20">
        <h2 className="px-4 py-3 text-xl font-extrabold">{"Nimalar bo'lyapti"}</h2>
        {trends.map(([category, title, count]) => (
          <button key={title} className="block w-full px-4 py-3 text-left transition hover:bg-white/[.03]">
            <p className="text-xs text-xmuted">{category}</p>
            <p className="mt-0.5 font-bold">{title}</p>
            <p className="mt-0.5 text-xs text-xmuted">{count}</p>
          </button>
        ))}
        <button className="px-4 py-4 text-sm text-xblue">{"Ko'proq ko'rsatish"}</button>
      </section>
      <section className="mt-4 rounded-2xl border border-xborder bg-xcard/70 p-4 shadow-xl shadow-slate-950/20">
        <div className="flex items-center gap-2"><TrendingUp className="text-emerald-400" size={20} /><h2 className="text-lg font-extrabold">Bozor holati</h2></div>
        {[["BTC", "$104,250", "+2.8%"], ["ETH", "$3,864", "+1.4%"], ["XAU", "$2,354", "-0.3%"]].map(([coin, price, change]) => (
          <div key={coin} className="mt-4 flex items-center"><span className="font-bold">{coin}</span><span className="ml-auto font-mono text-sm">{price}</span><span className={`ml-3 text-xs font-bold ${change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>{change}</span></div>
        ))}
      </section>
      <p className="mt-4 px-3 text-xs leading-5 text-xmuted">Foydalanish shartlari · Maxfiylik · Cookie siyosati · © 2026 TradeX</p>
    </aside>
  );
}
