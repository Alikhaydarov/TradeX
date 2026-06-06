"use client";

import { ArrowDownRight, ArrowUpRight, Plus, Target, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import type { JournalEntry } from "./types";

const seed: JournalEntry[] = [
  { id: 1, symbol: "BTC/USDT", side: "Long", entry: 101200, exit: 104850, pnl: 365, date: "06 Iyun", note: "Liquidity sweep + retest" },
  { id: 2, symbol: "XAU/USD", side: "Short", entry: 2358, exit: 2347, pnl: 220, date: "05 Iyun", note: "London session rejection" },
  { id: 3, symbol: "EUR/USD", side: "Long", entry: 1.087, exit: 1.084, pnl: -90, date: "04 Iyun", note: "Erta entry, tasdiq kutmadim" },
];

export function Journal() {
  const [entries, setEntries] = useState(seed);
  const [open, setOpen] = useState(false);
  const total = entries.reduce((sum, e) => sum + e.pnl, 0);
  const wins = entries.filter((e) => e.pnl > 0).length;
  const submit = (form: FormData) => {
    const entry = Number(form.get("entry")); const exit = Number(form.get("exit")); const side = form.get("side") as "Long" | "Short";
    const raw = side === "Long" ? exit - entry : entry - exit;
    setEntries((e) => [{ id: Date.now(), symbol: String(form.get("symbol")).toUpperCase(), side, entry, exit, pnl: Math.round(raw * (entry > 100 ? 0.1 : 10000)), date: "Bugun", note: String(form.get("note")) }, ...e]); setOpen(false);
  };
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-xborder bg-black/85 px-4 backdrop-blur"><h1 className="text-xl font-extrabold">Trading jurnal</h1><button onClick={() => setOpen(true)} className="ml-auto flex items-center gap-2 rounded-full bg-xblue px-4 py-2 text-sm font-bold"><Plus size={17} />Trade qo‘shish</button></header>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Umumiy P&L", `$${total}`, TrendingUp, total >= 0 ? "text-emerald-400" : "text-rose-400"], ["Win rate", `${Math.round(wins / entries.length * 100)}%`, Target, "text-white"], ["Trade soni", String(entries.length), ArrowUpRight, "text-white"], ["O‘rtacha P&L", `$${Math.round(total / entries.length)}`, ArrowDownRight, "text-white"]].map(([label, value, Icon, color]) => <div key={String(label)} className="rounded-2xl border border-xborder p-4"><div className="flex items-center text-xs text-xmuted">{String(label)}<Icon className="ml-auto" size={16} /></div><p className={`mt-3 font-mono text-2xl font-bold ${color}`}>{String(value)}</p></div>)}
        </div>
        <section className="mt-4 overflow-hidden rounded-2xl border border-xborder">
          <div className="border-b border-xborder px-4 py-3"><h2 className="font-bold">Oxirgi tradelar</h2></div>
          {entries.map((e) => <div key={e.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-xborder px-4 py-4 last:border-0 md:grid-cols-[1.2fr_.7fr_1fr_1fr_.8fr] md:items-center"><div><p className="font-bold">{e.symbol}</p><p className="text-xs text-xmuted">{e.date} · {e.note}</p></div><span className={`w-fit rounded px-2 py-1 text-xs font-bold ${e.side === "Long" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{e.side}</span><div className="hidden font-mono text-sm md:block"><span className="text-xmuted">Entry </span>{e.entry}</div><div className="hidden font-mono text-sm md:block"><span className="text-xmuted">Exit </span>{e.exit}</div><p className={`text-right font-mono font-bold ${e.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{e.pnl >= 0 ? "+" : ""}${e.pnl}</p></div>)}
        </section>
      </div>
      {open && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"><form action={submit} className="w-full max-w-md rounded-2xl border border-xborder bg-black p-5 shadow-2xl"><div className="flex items-center"><h2 className="text-xl font-bold">Yangi trade</h2><button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-full p-2 hover:bg-white/10"><X size={20} /></button></div><div className="mt-5 grid grid-cols-2 gap-3"><label className="col-span-2 text-sm text-xmuted">Symbol<input required name="symbol" placeholder="BTC/USDT" className="mt-1 w-full rounded-lg border border-xborder bg-transparent px-3 py-2.5 text-white outline-none focus:border-xblue" /></label><label className="text-sm text-xmuted">Yo‘nalish<select name="side" className="mt-1 w-full rounded-lg border border-xborder bg-black px-3 py-2.5 text-white"><option>Long</option><option>Short</option></select></label><label className="text-sm text-xmuted">Entry<input required name="entry" type="number" step="any" className="mt-1 w-full rounded-lg border border-xborder bg-transparent px-3 py-2.5 text-white" /></label><label className="text-sm text-xmuted">Exit<input required name="exit" type="number" step="any" className="mt-1 w-full rounded-lg border border-xborder bg-transparent px-3 py-2.5 text-white" /></label><label className="col-span-2 text-sm text-xmuted">Izoh<input name="note" className="mt-1 w-full rounded-lg border border-xborder bg-transparent px-3 py-2.5 text-white" /></label></div><button className="mt-5 w-full rounded-full bg-xblue py-3 font-bold">Saqlash</button></form></div>}
    </>
  );
}
