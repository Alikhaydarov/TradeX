"use client";

import { LoaderCircle, Plus, Target, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth-context";
import type { JournalEntry } from "./types";

interface Record { id: string; symbol: string; side: "Long" | "Short"; entry_price: string; exit_price: string; quantity: string; fees: string; pnl: string; note: string; traded_at: string }
const mapEntry = (r: Record): JournalEntry => ({ id: r.id, symbol: r.symbol, side: r.side, entry: +r.entry_price, exit: +r.exit_price, quantity: +r.quantity, fees: +r.fees, pnl: +r.pnl, note: r.note, date: new Date(`${r.traded_at}T00:00:00`).toLocaleDateString("uz-UZ") });

export function Journal({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    apiRequest<{ entries: Record[] }>("/api/journal")
      .then((data) => { if (active) setEntries(data.entries.map(mapEntry)); })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const stats = useMemo(() => {
    const total = entries.reduce((sum, item) => sum + item.pnl, 0);
    const wins = entries.filter((item) => item.pnl > 0).length;
    return { total, winRate: entries.length ? Math.round(wins / entries.length * 100) : 0, average: entries.length ? total / entries.length : 0 };
  }, [entries]);

  const save = async (form: FormData) => {
    setLoading(true); setError(null);
    try {
      const data = await apiRequest<{ entry: Record }>("/api/journal", { method: "POST", body: JSON.stringify({ symbol: form.get("symbol"), side: form.get("side"), entry: +String(form.get("entry")), exit: +String(form.get("exit")), quantity: +String(form.get("quantity")), fees: +String(form.get("fees")), note: form.get("note"), tradedAt: form.get("tradedAt") }) });
      setEntries((current) => [mapEntry(data.entry), ...current]); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Saqlanmadi"); } finally { setLoading(false); }
  };
  const remove = async (id: string) => { await apiRequest(`/api/journal/${id}`, { method: "DELETE" }); setEntries((current) => current.filter((item) => item.id !== id)); };

  return <>
    <header className="sticky top-0 z-10 flex h-14 items-center border-b border-xborder bg-black/85 px-4 backdrop-blur"><div><h1 className="text-xl font-extrabold">Trading jurnal</h1><p className="text-xs text-xmuted">Node.js API · shaxsiy ma&apos;lumot</p></div><Button onClick={() => user ? setOpen(true) : onLogin()} className="ml-auto rounded-full bg-xblue text-white"><Plus size={16}/>Trade qo&apos;shish</Button></header>
    {error && <div className="bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Umumiy P&L", `$${stats.total.toFixed(2)}`],["Win rate", `${stats.winRate}%`],["Trade soni", `${entries.length}`],["O'rtacha", `$${stats.average.toFixed(2)}`]].map(([label,value])=><div key={label} className="rounded-xl border border-xborder p-4"><p className="text-xs text-xmuted">{label}</p><p className="mt-2 font-mono text-2xl font-bold">{value}</p></div>)}</div>
      {!user && <div className="py-20 text-center"><Target className="mx-auto text-xmuted"/><h2 className="mt-4 text-xl font-bold">Jurnal uchun tizimga kiring</h2><Button onClick={onLogin} className="mt-4 rounded-full">Google orqali kirish</Button></div>}
      {user && <section className="mt-4 overflow-hidden rounded-xl border border-xborder">{loading && <p className="p-8 text-center text-xmuted">Yuklanmoqda...</p>}{!loading && !entries.length && <p className="p-12 text-center text-xmuted">Hali trade yo&apos;q.</p>}{entries.map((item)=><div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-xborder p-4 last:border-0"><div><b>{item.symbol}</b><p className="text-xs text-xmuted">{item.date} · {item.note}</p></div><span className={item.pnl >= 0 ? "font-mono text-emerald-400" : "font-mono text-rose-400"}>{item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}</span><Button variant="ghost" size="icon-sm" onClick={() => void remove(item.id)}><Trash2 size={15}/></Button></div>)}</section>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-xborder bg-black"><DialogHeader><DialogTitle>Yangi trade</DialogTitle><DialogDescription>P&L backendda hisoblanadi.</DialogDescription></DialogHeader><form action={save} className="grid grid-cols-2 gap-3"><div className="col-span-2"><Label>Symbol</Label><Input name="symbol" required placeholder="BTC/USDT"/></div><div><Label>Yo&apos;nalish</Label><select name="side" className="mt-1 h-9 w-full rounded-md border border-xborder bg-black px-3"><option>Long</option><option>Short</option></select></div><div><Label>Sana</Label><Input name="tradedAt" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></div><div><Label>Entry</Label><Input name="entry" required type="number" step="any"/></div><div><Label>Exit</Label><Input name="exit" required type="number" step="any"/></div><div><Label>Miqdor</Label><Input name="quantity" required type="number" step="any" defaultValue="1"/></div><div><Label>Komissiya</Label><Input name="fees" required type="number" step="any" defaultValue="0"/></div><div className="col-span-2"><Label>Izoh</Label><Textarea name="note"/></div><Button disabled={loading} className="col-span-2 bg-xblue text-white">{loading && <LoaderCircle className="animate-spin"/>}Saqlash</Button></form></DialogContent></Dialog>
  </>;
}
