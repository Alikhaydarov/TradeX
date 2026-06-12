"use client";

import {
  BarChart3,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  LoaderCircle,
  Plus,
  Search,
  Share2,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth-context";
import type { JournalEntry } from "./types";

interface JournalRecord {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  entry_price: string;
  exit_price: string;
  quantity: string;
  fees: string;
  pnl: string;
  note: string;
  traded_at: string;
  account_name?: string;
  market_type?: string;
  setup?: string;
  emotion?: string;
  risk_amount?: string;
  result_r?: string;
  image_url?: string | null;
  tags?: string[];
  account_size?: string;
  profit_target?: string;
  max_drawdown?: string;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const weekday = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
const sessions = ["Asia", "London", "New York"];

function mapEntry(record: JournalRecord): JournalEntry {
  return {
    id: record.id,
    symbol: record.symbol,
    side: record.side,
    entry: Number(record.entry_price),
    exit: Number(record.exit_price),
    quantity: Number(record.quantity),
    fees: Number(record.fees),
    pnl: Number(record.pnl),
    note: record.note,
    rawDate: record.traded_at,
    date: new Date(`${record.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"),
    accountName: record.account_name || "Main account",
    marketType: record.market_type || "CFD",
    setup: record.setup || "",
    emotion: record.emotion || "Neutral",
    riskAmount: Number(record.risk_amount ?? 0),
    resultR: Number(record.result_r ?? 0),
    imageUrl: record.image_url ?? null,
    tags: record.tags ?? [],
    accountSize: Number(record.account_size ?? 0),
    profitTarget: Number(record.profit_target ?? 0),
    maxDrawdown: Number(record.max_drawdown ?? 0),
  };
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function Journal({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [shareEntry, setShareEntry] = useState<JournalEntry | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    apiRequest<{ entries: JournalRecord[] }>("/api/journal")
      .then((data) => {
        if (active) setEntries(data.entries.map(mapEntry));
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const accounts = useMemo(() => ["All", ...new Set(entries.map((entry) => entry.accountName || "Main account"))], [entries]);
  const monthEntries = useMemo(() => entries.filter((entry) => entry.rawDate?.startsWith(monthKey(month))), [entries, month]);
  const visibleEntries = useMemo(() => {
    const value = query.trim().toLowerCase();
    return monthEntries.filter((entry) => {
      const matchesAccount = account === "All" || entry.accountName === account;
      const matchesQuery = !value || `${entry.symbol} ${entry.setup} ${entry.note} ${entry.tags?.join(" ")}`.toLowerCase().includes(value);
      return matchesAccount && matchesQuery;
    });
  }, [account, monthEntries, query]);

  const stats = useMemo(() => {
    const total = monthEntries.reduce((sum, item) => sum + item.pnl, 0);
    const wins = monthEntries.filter((item) => item.pnl > 0);
    const losses = monthEntries.filter((item) => item.pnl < 0);
    const grossWin = wins.reduce((sum, item) => sum + item.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.pnl, 0));
    return {
      total,
      winRate: monthEntries.length ? Math.round((wins.length / monthEntries.length) * 100) : 0,
      averageR: monthEntries.length ? monthEntries.reduce((sum, item) => sum + (item.resultR ?? 0), 0) / monthEntries.length : 0,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? grossWin : 0,
      wins: wins.length,
      losses: losses.length,
    };
  }, [monthEntries]);

  const analytics = useMemo(() => {
    let equity = 0;
    const equityCurve = [...monthEntries]
      .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
      .map((entry, index) => {
        equity += entry.pnl;
        return { trade: index + 1, equity: Number(equity.toFixed(2)) };
      });

    const weekdays = weekday.map((label, index) => {
      const trades = monthEntries.filter((entry) => {
        const day = new Date(`${entry.rawDate}T12:00:00`).getDay();
        return ((day + 6) % 7) === index;
      });
      return { label, pnl: trades.reduce((sum, entry) => sum + entry.pnl, 0), trades: trades.length };
    });

    const sessionData = sessions.map((label) => {
      const trades = monthEntries.filter((entry) => entry.tags?.some((tag) => tag.toLowerCase() === label.toLowerCase()));
      return { label, pnl: trades.reduce((sum, entry) => sum + entry.pnl, 0), trades: trades.length };
    });

    const setupMap = new Map<string, { pnl: number; trades: number; wins: number }>();
    monthEntries.forEach((entry) => {
      const key = entry.setup || "Uncategorized";
      const current = setupMap.get(key) ?? { pnl: 0, trades: 0, wins: 0 };
      setupMap.set(key, {
        pnl: current.pnl + entry.pnl,
        trades: current.trades + 1,
        wins: current.wins + (entry.pnl > 0 ? 1 : 0),
      });
    });
    const setups = [...setupMap.entries()]
      .map(([label, data]) => ({ label, ...data, winRate: Math.round((data.wins / data.trades) * 100) }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    const emotionMap = new Map<string, number>();
    monthEntries.forEach((entry) => emotionMap.set(entry.emotion || "Neutral", (emotionMap.get(entry.emotion || "Neutral") ?? 0) + entry.pnl));
    const emotions = [...emotionMap.entries()].map(([label, pnl]) => ({ label, pnl })).sort((a, b) => b.pnl - a.pnl);

    return { equityCurve, weekdays, sessionData, setups, emotions };
  }, [monthEntries]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const days = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: Math.ceil((firstOffset + days) / 7) * 7 }, (_, index) => {
      const day = index - firstOffset + 1;
      if (day < 1 || day > days) return null;
      const key = `${monthKey(month)}-${String(day).padStart(2, "0")}`;
      const trades = entries.filter((entry) => entry.rawDate === key);
      return { day, trades, pnl: trades.reduce((sum, entry) => sum + entry.pnl, 0) };
    });
  }, [entries, month]);

  const propAccounts = useMemo(() => {
    const names = [...new Set(entries.map((entry) => entry.accountName || "Main account"))];
    return names.map((name) => {
      const trades = entries.filter((entry) => (entry.accountName || "Main account") === name);
      const latestConfig = trades.find((entry) => (entry.accountSize ?? 0) > 0);
      const pnl = trades.reduce((sum, entry) => sum + entry.pnl, 0);
      const accountSize = latestConfig?.accountSize ?? 0;
      const target = latestConfig?.profitTarget ?? 0;
      const drawdown = latestConfig?.maxDrawdown ?? 0;
      return {
        name,
        pnl,
        accountSize,
        target,
        drawdown,
        progress: target > 0 ? Math.min(100, Math.max(0, pnl / target * 100)) : 0,
        drawdownUsed: drawdown > 0 && pnl < 0 ? Math.min(100, Math.abs(pnl) / drawdown * 100) : 0,
      };
    });
  }, [entries]);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/journal/image", { method: "POST", body: form, credentials: "same-origin" });
      const payload = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Rasm yuklanmadi.");
      setImageUrl(payload.imageUrl);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Rasm yuklanmadi.");
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const save = async (form: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const { entry } = await apiRequest<{ entry: JournalRecord }>("/api/journal", {
        method: "POST",
        body: JSON.stringify({
          symbol: form.get("symbol"),
          side: form.get("side"),
          entry: Number(form.get("entry")),
          exit: Number(form.get("exit")),
          quantity: Number(form.get("quantity")),
          fees: Number(form.get("fees")),
          riskAmount: Number(form.get("riskAmount")),
          accountName: form.get("accountName"),
          marketType: form.get("marketType"),
          setup: form.get("setup"),
          emotion: form.get("emotion"),
          note: form.get("note"),
          tradedAt: form.get("tradedAt"),
          imageUrl,
          tags: String(form.get("tags") || "").split(","),
          accountSize: Number(form.get("accountSize")),
          profitTarget: Number(form.get("profitTarget")),
          maxDrawdown: Number(form.get("maxDrawdown")),
        }),
      });
      const next = mapEntry(entry);
      setEntries((current) => [next, ...current]);
      setMonth(new Date(`${next.rawDate}T00:00:00`));
      setImageUrl(null);
      setOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trade saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await apiRequest(`/api/journal/${id}`, { method: "DELETE" });
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setSelected(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Trade o'chirilmadi.");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Account", "Market", "Symbol", "Side", "Entry", "Exit", "Risk", "PnL", "R", "Setup", "Emotion", "Note"];
    const rows = visibleEntries.map((entry) => [
      entry.rawDate, entry.accountName, entry.marketType, entry.symbol, entry.side, entry.entry, entry.exit,
      entry.riskAmount, entry.pnl, entry.resultR, entry.setup, entry.emotion, entry.note,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `tradeup-journal-${monthKey(month)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!user) {
    return <div className="grid min-h-[80dvh] place-items-center p-6 text-center"><div><Target className="mx-auto text-cyan-300" size={42} /><h2 className="mt-4 text-2xl font-black">Professional trading jurnal</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Prop challenge, CFD trade va screenshotlaringizni bitta joyda saqlang.</p><Button onClick={onLogin} className="mt-5 rounded-2xl bg-white text-slate-950">Google orqali kirish</Button></div></div>;
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0b1424]/55 px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300/70">Prop & CFD analytics</p><h1 className="text-xl font-black">Trading jurnal</h1></div>
          <div className="ml-auto flex gap-2">
            <Button onClick={exportCsv} variant="outline" className="hidden rounded-2xl border-white/10 bg-white/[.03] sm:flex"><Download size={15} /> CSV</Button>
            <Button onClick={() => setOpen(true)} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600"><Plus size={16} /> Trade qo&apos;shish</Button>
          </div>
        </div>
      </header>

      {error ? <div className="mx-3 mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="space-y-4 p-3 sm:p-5">
        <section className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/9 bg-white/[.035] p-3 backdrop-blur-2xl">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/[.06]"><ChevronLeft size={17} /></button>
          <strong className="min-w-40 text-center text-sm capitalize">{month.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })}</strong>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/[.06]"><ChevronRight size={17} /></button>
          <select value={account} onChange={(event) => setAccount(event.target.value)} className="ml-auto h-10 rounded-xl border border-white/10 bg-[#101a2d] px-3 text-xs">{accounts.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="flex h-10 min-w-48 items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 text-slate-500"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Symbol yoki setup" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none" /></label>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Monthly P&L", money.format(stats.total), stats.total >= 0 ? TrendingUp : TrendingDown, stats.total >= 0 ? "text-emerald-300" : "text-rose-300"],
            ["Win rate", `${stats.winRate}%`, Target, "text-cyan-300"],
            ["Average R", `${stats.averageR.toFixed(2)}R`, BarChart3, "text-violet-300"],
            ["Profit factor", stats.profitFactor.toFixed(2), TrendingUp, "text-amber-300"],
            ["W / L", `${stats.wins} / ${stats.losses}`, CalendarDays, "text-blue-300"],
          ].map(([label, value, Icon, color]) => {
            const StatIcon = Icon as typeof TrendingUp;
            return <div key={String(label)} className="rounded-[22px] border border-white/9 bg-white/[.035] p-4 backdrop-blur-2xl"><StatIcon size={17} className={String(color)} /><p className="mt-3 text-[10px] uppercase tracking-[.14em] text-slate-500">{String(label)}</p><p className="mt-1 font-mono text-xl font-black sm:text-2xl">{String(value)}</p></div>;
          })}
        </div>

        {propAccounts.some((item) => item.accountSize > 0) ? (
          <section className="rounded-[28px] border border-white/9 bg-white/[.03] p-4 backdrop-blur-2xl">
            <div><h2 className="font-black">Prop challenge progress</h2><p className="text-[10px] text-slate-500">Profit target va drawdown nazorati</p></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {propAccounts.filter((item) => item.accountSize > 0).map((item) => (
                <div key={item.name} className="rounded-[22px] border border-white/8 bg-black/10 p-4">
                  <div className="flex items-start"><div><strong>{item.name}</strong><p className="mt-1 text-[10px] text-slate-500">{money.format(item.accountSize)} account</p></div><strong className={`ml-auto font-mono ${item.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{item.pnl >= 0 ? "+" : ""}{money.format(item.pnl)}</strong></div>
                  <div className="mt-4"><div className="flex text-[10px]"><span className="text-slate-500">Profit target</span><b className="ml-auto">{item.progress.toFixed(0)}% / {money.format(item.target)}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${item.progress}%` }} /></div></div>
                  <div className="mt-3"><div className="flex text-[10px]"><span className="text-slate-500">Drawdown used</span><b className="ml-auto">{item.drawdownUsed.toFixed(0)}% / {money.format(item.drawdown)}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${item.drawdownUsed}%` }} /></div></div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-[28px] border border-white/9 bg-white/[.03] p-3 backdrop-blur-2xl">
            <div className="grid grid-cols-7 gap-1">{weekday.map((day) => <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-500">{day}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, index) => cell ? (
                <button key={cell.day} onClick={() => cell.trades[0] && setSelected(cell.trades[0])} className={`min-h-20 rounded-xl border p-2 text-left transition hover:border-cyan-300/25 ${cell.trades.length ? cell.pnl >= 0 ? "border-emerald-300/12 bg-emerald-400/[.055]" : "border-rose-300/12 bg-rose-400/[.055]" : "border-white/5 bg-black/8"}`}>
                  <span className="text-[10px] text-slate-500">{cell.day}</span>
                  {cell.trades.length ? <><strong className={`mt-2 block font-mono text-[11px] ${cell.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{cell.pnl >= 0 ? "+" : ""}{money.format(cell.pnl)}</strong><small className="text-[9px] text-slate-600">{cell.trades.length} trade</small></> : null}
                </button>
              ) : <div key={`empty-${index}`} />)}
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-white/9 bg-white/[.03] backdrop-blur-2xl">
            <div className="flex items-center border-b border-white/8 p-4"><div><h2 className="font-black">Trade review</h2><p className="text-[10px] text-slate-500">{visibleEntries.length} ta trade</p></div><Button onClick={exportCsv} variant="ghost" size="icon-sm" className="ml-auto sm:hidden"><Download size={16} /></Button></div>
            <div className="max-h-[560px] overflow-y-auto">
              {loading ? <div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin text-cyan-300" /></div> : null}
              {!loading && !visibleEntries.length ? <div className="grid min-h-56 place-items-center p-8 text-center text-sm text-slate-500">Bu oyda trade topilmadi.</div> : null}
              {visibleEntries.map((entry) => (
                <button key={entry.id} onClick={() => setSelected(entry)} className="flex w-full items-center gap-3 border-b border-white/7 p-3 text-left hover:bg-white/[.035]">
                  {entry.imageUrl ? <img src={entry.imageUrl} alt="" className="h-14 w-16 rounded-xl object-cover" /> : <span className="grid h-14 w-16 place-items-center rounded-xl bg-white/[.035] text-slate-600"><ImageIcon size={18} /></span>}
                  <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm">{entry.symbol}</strong><small className={entry.side === "Long" ? "text-emerald-300" : "text-rose-300"}>{entry.side}</small></span><small className="block truncate text-[10px] text-slate-500">{entry.accountName} · {entry.setup || entry.marketType} · {entry.date}</small></span>
                  <span className="text-right"><strong className={`block font-mono text-sm ${entry.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{entry.pnl >= 0 ? "+" : ""}{money.format(entry.pnl)}</strong><small className="text-[10px] text-slate-500">{(entry.resultR ?? 0).toFixed(2)}R</small></span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-[28px] border border-white/9 bg-white/[.03] p-4 backdrop-blur-2xl">
            <div className="flex items-center"><div><h2 className="font-black">Account equity</h2><p className="text-[10px] text-slate-500">Oy davomida cumulative P&L</p></div><span className={`ml-auto font-mono text-sm font-black ${stats.total >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{stats.total >= 0 ? "+" : ""}{money.format(stats.total)}</span></div>
            <div className="mt-4 h-64">
              {analytics.equityCurve.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.equityCurve}><defs><linearGradient id="journal-equity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="trade" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} width={52} /><Tooltip contentStyle={{ background: "#07101d", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14 }} formatter={(value) => money.format(Number(value))} /><Area type="monotone" dataKey="equity" stroke="#22d3ee" strokeWidth={2} fill="url(#journal-equity)" /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-slate-500">Equity curve uchun trade qo&apos;shing.</div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/9 bg-white/[.03] p-4 backdrop-blur-2xl">
            <h2 className="font-black">Trading consistency</h2><p className="text-[10px] text-slate-500">Eng yaxshi setup va psixologiya</p>
            <div className="mt-4 space-y-3">
              {analytics.setups.map((setup) => <div key={setup.label}><div className="flex items-center text-xs"><span className="truncate">{setup.label}</span><strong className={`ml-auto font-mono ${setup.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{setup.winRate}% · {money.format(setup.pnl)}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${Math.max(8, setup.winRate)}%` }} /></div></div>)}
              {!analytics.setups.length ? <p className="py-8 text-center text-xs text-slate-500">Setup ma&apos;lumotlari yo&apos;q.</p> : null}
            </div>
            {analytics.emotions.length ? <div className="mt-5 border-t border-white/8 pt-4"><p className="text-[10px] uppercase tracking-[.15em] text-slate-500">Emotion impact</p><div className="mt-2 flex flex-wrap gap-2">{analytics.emotions.map((emotion) => <span key={emotion.label} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${emotion.pnl >= 0 ? "bg-emerald-300/10 text-emerald-300" : "bg-rose-300/10 text-rose-300"}`}>{emotion.label} {emotion.pnl >= 0 ? "+" : ""}{money.format(emotion.pnl)}</span>)}</div></div> : null}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[28px] border border-white/9 bg-white/[.03] p-4 backdrop-blur-2xl">
            <h2 className="font-black">Weekday performance</h2><p className="text-[10px] text-slate-500">Qaysi kunlarda edge kuchliroq</p>
            <div className="mt-4 grid grid-cols-7 gap-2">{analytics.weekdays.map((item) => { const max = Math.max(...analytics.weekdays.map((day) => Math.abs(day.pnl)), 1); return <div key={item.label} className="text-center"><div className="flex h-28 items-end justify-center rounded-xl bg-black/10 p-1"><div className={`w-full rounded-lg ${item.pnl >= 0 ? "bg-emerald-400/55" : "bg-rose-400/55"}`} style={{ height: `${item.trades ? Math.max(10, Math.abs(item.pnl) / max * 100) : 3}%` }} /></div><b className="mt-2 block text-[10px]">{item.label}</b><small className={`font-mono text-[9px] ${item.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{item.trades ? money.format(item.pnl) : "-"}</small></div>; })}</div>
          </section>

          <section className="rounded-[28px] border border-white/9 bg-white/[.03] p-4 backdrop-blur-2xl">
            <h2 className="font-black">Session performance</h2><p className="text-[10px] text-slate-500">Trade tagiga Asia, London yoki New York yozing</p>
            <div className="mt-4 space-y-3">{analytics.sessionData.map((session) => <div key={session.label} className="flex items-center rounded-2xl bg-black/10 p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.04] text-xs font-black">{session.label.slice(0, 2).toUpperCase()}</span><div className="ml-3"><b className="text-sm">{session.label}</b><p className="text-[10px] text-slate-500">{session.trades} trade</p></div><strong className={`ml-auto font-mono text-sm ${session.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{session.pnl >= 0 ? "+" : ""}{money.format(session.pnl)}</strong></div>)}</div>
          </section>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setImageUrl(null); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#101a2d]/95 backdrop-blur-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle>Yangi trade review</DialogTitle><DialogDescription>Prop yoki CFD trading natijasini batafsil saqlang.</DialogDescription></DialogHeader>
          <form action={save} className="grid grid-cols-2 gap-3">
            <div><Label>Account / Challenge</Label><Input name="accountName" defaultValue="Main account" placeholder="FTMO 100K" required /></div>
            <div><Label>Bozor</Label><select name="marketType" className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#111a2a] px-3"><option>CFD</option><option>Forex</option><option>Futures</option><option>Crypto</option><option>Stocks</option></select></div>
            <div><Label>Account size $</Label><Input name="accountSize" type="number" min="0" step="any" defaultValue="100000" /></div>
            <div><Label>Profit target $</Label><Input name="profitTarget" type="number" min="0" step="any" defaultValue="8000" /></div>
            <div className="col-span-2"><Label>Max drawdown $</Label><Input name="maxDrawdown" type="number" min="0" step="any" defaultValue="10000" /></div>
            <div><Label>Symbol</Label><Input name="symbol" required placeholder="XAUUSD" /></div>
            <div><Label>Yo&apos;nalish</Label><select name="side" className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#111a2a] px-3"><option>Long</option><option>Short</option></select></div>
            <div><Label>Sana</Label><Input name="tradedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
            <div><Label>Setup</Label><Input name="setup" placeholder="London breakout" /></div>
            <div><Label>Entry</Label><Input name="entry" required type="number" step="any" /></div>
            <div><Label>Exit</Label><Input name="exit" required type="number" step="any" /></div>
            <div><Label>Lot / Miqdor</Label><Input name="quantity" required type="number" step="any" defaultValue="1" /></div>
            <div><Label>Risk $</Label><Input name="riskAmount" required type="number" step="any" defaultValue="100" /></div>
            <div><Label>Komissiya</Label><Input name="fees" required type="number" step="any" defaultValue="0" /></div>
            <div><Label>Emotsiya</Label><select name="emotion" className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#111a2a] px-3"><option>Confident</option><option>Neutral</option><option>FOMO</option><option>Revenge</option><option>Hesitant</option></select></div>
            <div className="col-span-2"><Label>Tags</Label><Input name="tags" placeholder="A+ setup, London, BOS" /></div>
            <div className="col-span-2"><Label>Trade screenshot</Label><input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} /><button type="button" onClick={() => imageInput.current?.click()} className="mt-1 flex min-h-28 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/10 text-sm text-slate-500">{uploading ? <LoaderCircle className="animate-spin" /> : imageUrl ? <img src={imageUrl} alt="Trade screenshot" className="max-h-64 w-full object-contain" /> : <span className="flex items-center gap-2"><Camera size={18} /> Grafik rasmini yuklash</span>}</button></div>
            <div className="col-span-2"><Label>Review / Xulosa</Label><Textarea name="note" placeholder="Nima yaxshi bo'ldi, qayerda xato qildim?" className="min-h-24" /></div>
            <Button disabled={saving || uploading} className="col-span-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white">{saving ? <LoaderCircle className="animate-spin" /> : <Plus />} Trade saqlash</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(value) => !value && setSelected(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#0b1424]/98 sm:max-w-xl">
          {selected ? <><DialogHeader><DialogTitle className="flex items-center gap-2">{selected.symbol}<span className={`rounded-full px-2 py-1 text-[10px] ${selected.side === "Long" ? "bg-emerald-300/10 text-emerald-300" : "bg-rose-300/10 text-rose-300"}`}>{selected.side}</span></DialogTitle><DialogDescription>{selected.accountName} · {selected.marketType} · {selected.date}</DialogDescription></DialogHeader>
            {selected.imageUrl ? <img src={selected.imageUrl} alt={`${selected.symbol} chart`} className="max-h-80 w-full rounded-2xl border border-white/10 object-contain" /> : null}
            <div className="grid grid-cols-3 gap-2">{[["P&L", money.format(selected.pnl)], ["Result", `${(selected.resultR ?? 0).toFixed(2)}R`], ["Risk", money.format(selected.riskAmount ?? 0)]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/[.04] p-3"><small className="text-slate-500">{label}</small><strong className="mt-1 block font-mono">{value}</strong></div>)}</div>
            <div className="rounded-2xl bg-white/[.03] p-4 text-sm leading-6 text-slate-300"><p><b>Setup:</b> {selected.setup || "Kiritilmagan"}</p><p><b>Emotion:</b> {selected.emotion}</p>{selected.note ? <p className="mt-2">{selected.note}</p> : null}</div>
            <div className="flex gap-2"><Button onClick={() => setShareEntry(selected)} className="flex-1 rounded-2xl bg-white text-slate-950"><Share2 size={15} /> Story card</Button><Button onClick={() => void remove(selected.id)} disabled={deletingId === selected.id} variant="outline" className="rounded-2xl border-rose-300/20 text-rose-200">{deletingId === selected.id ? <LoaderCircle className="animate-spin" /> : <Trash2 size={15} />}</Button></div>
          </> : null}
        </DialogContent>
      </Dialog>

      {shareEntry ? <div className="fixed inset-0 z-[99999] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-lg"><button onClick={() => setShareEntry(null)} className="fixed right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10"><X /></button><div className="w-full max-w-[360px] overflow-hidden rounded-[34px] border border-white/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.22),transparent_35%),linear-gradient(160deg,#07101d,#111827_55%,#172554)] p-6 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">TradeUp Journal</p><div className="mt-8 flex items-center justify-between"><div><h2 className="text-3xl font-black">{shareEntry.symbol}</h2><p className="mt-1 text-sm text-slate-400">{shareEntry.side} · {shareEntry.setup || shareEntry.marketType}</p></div><span className={`rounded-2xl px-3 py-2 font-mono text-lg font-black ${shareEntry.pnl >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{shareEntry.pnl >= 0 ? "+" : ""}{money.format(shareEntry.pnl)}</span></div>{shareEntry.imageUrl ? <img src={shareEntry.imageUrl} alt="" className="mt-6 aspect-video w-full rounded-2xl border border-white/10 object-cover" /> : <div className="mt-6 aspect-video rounded-2xl border border-white/10 bg-white/[.03]" />}<div className="mt-6 grid grid-cols-3 gap-2 text-center"><div><small className="text-slate-500">RESULT</small><b className="mt-1 block text-lg">{(shareEntry.resultR ?? 0).toFixed(2)}R</b></div><div><small className="text-slate-500">ACCOUNT</small><b className="mt-1 block truncate text-sm">{shareEntry.accountName}</b></div><div><small className="text-slate-500">DATE</small><b className="mt-1 block text-sm">{shareEntry.date}</b></div></div><p className="mt-8 text-center text-xs text-slate-500">Plan. Execute. Review. Improve.</p></div><p className="mt-4 max-w-sm text-center text-xs text-slate-400">Kartani screenshot qilib Instagram Story&apos;ga joylang.</p></div> : null}
    </div>
  );
}
