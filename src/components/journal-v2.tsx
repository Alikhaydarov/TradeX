"use client";

import {
  ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Download, ImageIcon, LoaderCircle, MoreHorizontal, Plus, Search, ShieldCheck,
  Target, Trash2, TrendingDown, TrendingUp, WalletCards, X, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "./auth-context";
import { PropAccountDialog } from "./prop-account-dialog";
import { PropFirmLogo } from "./prop-firm-logo";
import { TradeReviewModal } from "./trade-review-modal";
import type { JournalEntry, PropAccount } from "./types";

type AccountRow = { id: string; name: string; firm: string; phase: string; market_type: string; account_size: string; initial_balance: string; profit_target: string; max_drawdown: string; daily_drawdown: string; start_date: string; status: PropAccount["status"] };
type EntryRow = { id: string; prop_account_id?: string | null; symbol: string; side: "Long" | "Short"; entry_price: string; exit_price: string; quantity: string; fees: string; pnl: string; note: string; traded_at: string; account_name?: string; market_type?: string; setup?: string; emotion?: string; risk_amount?: string; result_r?: string; image_url?: string | null; tags?: string[] };
type Summary = { account: PropAccount; trades: number; pnl: number; winRate: number; target: number; dd: number };

const cash = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const WEEKDAYS_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

const accountFrom = (a: AccountRow): PropAccount => ({ id: a.id, name: a.name, firm: a.firm, phase: a.phase, marketType: a.market_type, accountSize: +a.account_size, initialBalance: +a.initial_balance, profitTarget: +a.profit_target, maxDrawdown: +a.max_drawdown, dailyDrawdown: +a.daily_drawdown, startDate: a.start_date, status: a.status });
const entryFrom = (e: EntryRow): JournalEntry => ({ id: e.id, propAccountId: e.prop_account_id, symbol: e.symbol, side: e.side, entry: +e.entry_price, exit: +e.exit_price, quantity: +e.quantity, fees: +e.fees, pnl: +e.pnl, note: e.note, rawDate: e.traded_at, date: new Date(`${e.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"), accountName: e.account_name, marketType: e.market_type, setup: e.setup || "", emotion: e.emotion || "Neutral", riskAmount: +(e.risk_amount || 0), resultR: +(e.result_r || 0), imageUrl: e.image_url, tags: e.tags || [] });
const monthId = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function JournalV2({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [accountOpen, setAccountOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      apiRequest<{ accounts: AccountRow[] }>("/api/prop-accounts"),
      apiRequest<{ entries: EntryRow[] }>("/api/journal"),
    ]).then(([a, e]) => {
      if (active) { setAccounts(a.accounts.map(accountFrom)); setEntries(e.entries.map(entryFrom)); }
    }).catch((e: Error) => active && setError(e.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  const account = accounts.find(a => a.id === accountId) || null;
  const accountEntries = useMemo(() => entries.filter(e => e.propAccountId === accountId), [entries, accountId]);
  const monthEntries = useMemo(() => accountEntries.filter(e => e.rawDate?.startsWith(monthId(month))), [accountEntries, month]);
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return q ? monthEntries.filter(e => `${e.symbol} ${e.setup} ${e.note} ${e.tags?.join(" ")}`.toLowerCase().includes(q)) : monthEntries; }, [monthEntries, query]);
  const summaries = useMemo<Summary[]>(() => accounts.map(account => { const t = entries.filter(e => e.propAccountId === account.id), p = t.reduce((s, e) => s + e.pnl, 0), w = t.filter(e => e.pnl > 0).length; return { account, trades: t.length, pnl: p, winRate: t.length ? Math.round(w / t.length * 100) : 0, target: account.profitTarget ? Math.min(100, Math.max(0, p / account.profitTarget * 100)) : 0, dd: account.maxDrawdown && p < 0 ? Math.min(100, Math.abs(p) / account.maxDrawdown * 100) : 0 }; }), [accounts, entries]);
  const stats = useMemo(() => { const pnl = monthEntries.reduce((s, e) => s + e.pnl, 0), wins = monthEntries.filter(e => e.pnl > 0), losses = monthEntries.filter(e => e.pnl < 0), gw = wins.reduce((s, e) => s + e.pnl, 0), gl = Math.abs(losses.reduce((s, e) => s + e.pnl, 0)); return { pnl, wins: wins.length, losses: losses.length, rate: monthEntries.length ? Math.round(wins.length / monthEntries.length * 100) : 0, r: monthEntries.length ? monthEntries.reduce((s, e) => s + (e.resultR || 0), 0) / monthEntries.length : 0, pf: gl ? gw / gl : gw ? gw : 0 }; }, [monthEntries]);
  const equity = useMemo(() => { let v = account?.initialBalance || 0; return [...accountEntries].sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate))).map((e, i) => ({ trade: i + 1, equity: v += e.pnl })); }, [accountEntries, account]);
  const setups = useMemo(() => { const m = new Map<string, { pnl: number; trades: number; wins: number }>(); monthEntries.forEach(e => { const k = e.setup || "Uncategorized", v = m.get(k) || { pnl: 0, trades: 0, wins: 0 }; m.set(k, { pnl: v.pnl + e.pnl, trades: v.trades + 1, wins: v.wins + (e.pnl > 0 ? 1 : 0) }); }); return [...m].map(([name, v]) => ({ name, ...v, rate: Math.round(v.wins / v.trades * 100) })).sort((a, b) => b.pnl - a.pnl); }, [monthEntries]);
  const calendar = useMemo(() => { const y = month.getFullYear(), m = month.getMonth(), offset = (new Date(y, m, 1).getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate(), cells = Math.ceil((offset + count) / 7) * 7; return Array.from({ length: cells }, (_, i) => { const day = i - offset + 1; if (day < 1 || day > count) return null; const key = `${monthId(month)}-${String(day).padStart(2, "0")}`, trades = accountEntries.filter(e => e.rawDate === key); return { day, trades, pnl: trades.reduce((s, e) => s + e.pnl, 0) }; }); }, [month, accountEntries]);

  async function addAccount(form: FormData) {
    setSaving(true);
    try {
      const r = await apiRequest<{ account: AccountRow }>("/api/prop-accounts", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      const next = accountFrom(r.account);
      setAccounts(v => [next, ...v]);
      setAccountOpen(false);
      setAccountId(next.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Account saqlanmadi"); }
    finally { setSaving(false); }
  }

  async function removeAccount(a: PropAccount) {
    if (!window.confirm(`${a.name} accountini o'chirasizmi?`)) return;
    setDeleting(a.id);
    try {
      await apiRequest(`/api/prop-accounts/${a.id}`, { method: "DELETE" });
      setAccounts(v => v.filter(x => x.id !== a.id));
      if (accountId === a.id) setAccountId(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Account o'chirilmadi"); }
    finally { setDeleting(null); }
  }

  async function addTrade(form: FormData) {
    if (!account) return;
    setSaving(true);
    try {
      const r = await apiRequest<{ entry: EntryRow }>("/api/journal", { method: "POST", body: JSON.stringify({ propAccountId: account.id, symbol: form.get("symbol"), side: form.get("side"), entry: +String(form.get("entry")), exit: +String(form.get("exit")), quantity: +String(form.get("quantity")), fees: +String(form.get("fees")), riskAmount: +String(form.get("riskAmount")), tradedAt: form.get("tradedAt"), setup: form.get("setup"), emotion: form.get("emotion"), tags: String(form.get("tags") || "").split(","), note: form.get("note"), imageUrl: form.get("imageUrl") }) });
      const next = entryFrom(r.entry);
      setEntries(v => [next, ...v]);
      setMonth(new Date(`${next.rawDate}T00:00:00`));
      setTradeOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Trade saqlanmadi"); }
    finally { setSaving(false); }
  }

  const shiftMonth = (n: number) => setMonth(d => new Date(d.getFullYear(), d.getMonth() + n, 1));
  const exportCsv = () => { const rows = [["Date", "Symbol", "Side", "PnL", "R", "Setup"], ...shown.map(e => [e.rawDate, e.symbol, e.side, e.pnl, e.resultR, e.setup])], a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = `${account?.name || "journal"}-${monthId(month)}.csv`; a.click(); URL.revokeObjectURL(a.href); };

  if (!user) return (
    <div className="grid min-h-[75dvh] place-items-center text-center">
      <div className="animate-page-in">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-500/10">
          <ShieldCheck className="text-blue-400" size={32} />
        </div>
        <h2 className="mt-5 text-3xl font-black">Professional trading jurnal</h2>
        <p className="mt-2 text-[#6b7a96]">Prop accountlaringizni kuzatib boring</p>
        <Button className="mt-6 h-11 bg-blue-600 px-8 hover:bg-blue-500" onClick={onLogin}>Google orqali kirish</Button>
      </div>
    </div>
  );

  if (loading) return <div className="grid min-h-[70dvh] place-items-center"><LoaderCircle className="animate-spin text-blue-400" size={28} /></div>;

  return (
    <div className="min-h-full">
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          <X size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {account
        ? <Workspace account={account} stats={stats} equity={equity} setups={setups} calendar={calendar} trades={shown} query={query} month={month} deleting={deleting === account.id} onQuery={setQuery} onBack={() => setAccountId(null)} onTrade={() => setTradeOpen(true)} onDelete={() => removeAccount(account)} onCsv={exportCsv} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onToday={() => setMonth(new Date())} />
        : <Accounts summaries={summaries} deleting={deleting} onAdd={() => setAccountOpen(true)} onOpen={setAccountId} onDelete={removeAccount} />
      }
      <PropAccountDialog open={accountOpen} saving={saving} onOpenChange={setAccountOpen} onSave={addAccount} />
      <TradeReviewModal open={tradeOpen} saving={saving} account={account} onOpenChange={setTradeOpen} onSave={addTrade} />
    </div>
  );
}

/* ─── Accounts list ─── */
function Accounts({ summaries, deleting, onAdd, onOpen, onDelete }: { summaries: Summary[]; deleting: string | null; onAdd: () => void; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void }) {
  const total = summaries.reduce((s, a) => s + a.pnl, 0);
  const capital = summaries.reduce((s, a) => s + a.account.accountSize, 0);

  return (
    <div className="animate-page-in mx-auto max-w-[1700px] space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-blue-500/10">
              <ShieldCheck size={14} className="text-blue-400" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7a96]">Trading workspace</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Prop Accounts</h1>
          <p className="mt-1 text-sm text-[#6b7a96]">Accountni bosib jurnalni oching</p>
        </div>
        <Button onClick={onAdd} className="h-10 bg-blue-600 sm:ml-auto hover:bg-blue-500">
          <Plus size={16} /> Prop account qo&apos;shish
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "Jami kapital", value: cash.format(capital), icon: WalletCards, color: "text-blue-400", bg: "bg-blue-500/8" },
          { title: "Umumiy P&L", value: `${total >= 0 ? "+" : ""}${cash.format(total)}`, icon: total >= 0 ? TrendingUp : TrendingDown, color: total >= 0 ? "text-emerald-400" : "text-rose-400", bg: total >= 0 ? "bg-emerald-500/8" : "bg-rose-500/8" },
          { title: "Faol accountlar", value: String(summaries.filter(s => s.account.status === "Active").length), icon: Zap, color: "text-violet-400", bg: "bg-violet-500/8" },
        ].map(s => (
          <div key={s.title} className="flex items-center gap-4 rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 px-5 py-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${s.bg}`}>
              <s.icon size={20} className={s.color} />
            </span>
            <div>
              <p className="text-xs text-[#6b7a96]">{s.title}</p>
              <p className={`font-mono text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards */}
      {!summaries.length
        ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#1a2235] text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-500/10">
                <WalletCards size={24} className="text-blue-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Prop account qo&apos;shing</h2>
              <p className="mt-1 text-sm text-[#6b7a96]">Challenge yoki funded accountingizni kuzatib boring</p>
              <Button onClick={onAdd} className="mt-5 bg-blue-600 hover:bg-blue-500"><Plus size={16} /> Account yaratish</Button>
            </div>
          </div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map(s => <AccountCard key={s.account.id} s={s} deleting={deleting} onOpen={onOpen} onDelete={onDelete} />)}
          </div>
      }
    </div>
  );
}

function AccountCard({ s, deleting, onOpen, onDelete }: { s: Summary; deleting: string | null; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void }) {
  const statusColor: Record<string, string> = { Active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", Passed: "text-blue-400 bg-blue-400/10 border-blue-400/20", Failed: "text-rose-400 bg-rose-400/10 border-rose-400/20", Paused: "text-amber-400 bg-amber-400/10 border-amber-400/20" };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(s.account.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpen(s.account.id); }}
      className="prop-card-glow group relative cursor-pointer overflow-hidden rounded-2xl border border-[#1a2235] bg-[#0d1525]/90 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
    >
      {/* Top bar accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <PropFirmLogo firm={s.account.firm} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{s.account.name}</p>
            <p className="text-xs text-[#6b7a96]">{s.account.phase} · {s.account.marketType}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${statusColor[s.account.status] || statusColor.Active}`}>
              {s.account.status}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Amallar" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-[#1a2235] bg-[#0a0f1a]" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem variant="destructive" disabled={deleting === s.account.id} onClick={() => onDelete(s.account)}>
                  <Trash2 size={14} /> Accountni o&apos;chirish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* PnL */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#6b7a96]">Natija</p>
            <p className={`font-mono text-2xl font-black ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {s.pnl >= 0 ? "+" : ""}{cash.format(s.pnl)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold">{cash.format(s.account.accountSize)}</p>
            <p className="text-[10px] text-[#6b7a96]">Account size</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex gap-4 rounded-xl bg-[#060b14]/60 px-4 py-2.5">
          {[["Trades", s.trades], ["Win rate", `${s.winRate}%`]].map(([l, v]) => (
            <div key={String(l)}>
              <p className="text-[10px] text-[#6b7a96]">{l}</p>
              <p className="font-mono text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="mt-4 space-y-2.5">
          <ProgressBar label="Profit target" value={s.target} color="bg-emerald-500" />
          <ProgressBar label="Drawdown used" value={s.dd} color="bg-rose-500" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#1a2235] px-5 py-3">
        <span className="text-xs text-[#6b7a96]">Jurnalni ochish</span>
        <ChevronRight size={16} className="text-[#6b7a96] transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

/* ─── Workspace ─── */
function Workspace(p: {
  account: PropAccount; stats: { pnl: number; wins: number; losses: number; rate: number; r: number; pf: number };
  equity: Array<{ trade: number; equity: number }>; setups: Array<{ name: string; pnl: number; trades: number; wins: number; rate: number }>;
  calendar: Array<{ day: number; trades: JournalEntry[]; pnl: number } | null>;
  trades: JournalEntry[]; query: string; month: Date; deleting: boolean;
  onQuery: (v: string) => void; onBack: () => void; onTrade: () => void; onDelete: () => void;
  onCsv: () => void; onPrev: () => void; onNext: () => void; onToday: () => void;
}) {
  const { account, stats, equity, setups, calendar, trades, month } = p;

  return (
    <div className="animate-page-in mx-auto max-w-[1700px]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#1a2235] bg-[#03060e]/90 px-4 py-3 backdrop-blur-xl lg:gap-3 lg:px-6">
        <Button variant="ghost" size="icon" onClick={p.onBack} className="shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <PropFirmLogo firm={account.firm} compact />
        <div className="min-w-0">
          <h1 className="truncate text-base font-black lg:text-lg">{account.name}</h1>
          <p className="text-[11px] text-[#6b7a96]">{account.phase} · {cash.format(account.accountSize)}</p>
        </div>
        <span className={`ml-1 hidden rounded-lg border px-2 py-0.5 text-[11px] font-semibold md:block ${account.status === "Active" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400" : "border-[#1a2235] text-[#6b7a96]"}`}>
          {account.status}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="hidden border-[#1a2235] bg-transparent sm:flex" onClick={p.onCsv}>
            <Download size={15} /> CSV
          </Button>
          <Button variant="outline" size="icon" className="border-[#1a2235] bg-transparent text-rose-400 hover:bg-rose-500/10" disabled={p.deleting} onClick={p.onDelete}>
            {p.deleting ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
          </Button>
          <Button onClick={p.onTrade} className="bg-blue-600 hover:bg-blue-500">
            <Plus size={16} />
            <span className="hidden sm:inline">Trade qo&apos;shish</span>
          </Button>
        </div>
      </header>

      <div className="space-y-4 p-4 lg:p-6">
        {/* Month nav */}
        <div className="flex items-center gap-2 rounded-2xl border border-[#1a2235] bg-[#0d1525]/60 px-3 py-2.5 sm:gap-3">
          <Button variant="ghost" size="icon-sm" onClick={p.onPrev}><ChevronLeft size={16} /></Button>
          <strong className="min-w-40 text-center text-sm capitalize">
            {month.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })}
          </strong>
          <Button variant="ghost" size="icon-sm" onClick={p.onNext}><ChevronRight size={16} /></Button>
          <Button variant="outline" size="sm" onClick={p.onToday} className="border-[#1a2235] bg-transparent text-xs">
            Joriy oy
          </Button>
          <p className="ml-auto hidden text-xs text-[#6b7a96] sm:block">
            {trades.length} trade · {stats.wins}W / {stats.losses}L
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { title: "Monthly P&L", value: `${stats.pnl >= 0 ? "+" : ""}${cash.format(stats.pnl)}`, icon: stats.pnl >= 0 ? TrendingUp : TrendingDown, color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
            { title: "Win rate", value: `${stats.rate}%`, icon: Target, color: "text-blue-400" },
            { title: "Average R", value: `${stats.r.toFixed(2)}R`, icon: BarChart3, color: "text-violet-400" },
            { title: "Profit factor", value: stats.pf.toFixed(2), icon: TrendingUp, color: "text-amber-400" },
            { title: "Wins / Losses", value: `${stats.wins} / ${stats.losses}`, icon: CalendarDays, color: "text-[#dde6f8]" },
          ].map(s => (
            <div key={s.title} className="flex items-center gap-3 rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 px-4 py-3.5">
              <s.icon size={18} className={s.color} />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#6b7a96]">{s.title}</p>
                <p className={`font-mono text-xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="calendar" className="gap-4">
          <TabsList className="h-10 w-full justify-start overflow-x-auto rounded-xl border border-[#1a2235] bg-[#0d1525] p-1">
            {[["overview", "Overview"], ["calendar", "Calendar"], ["trades", "Trades"], ["analytics", "Analytics"]].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="rounded-lg px-5 text-sm data-[state=active]:bg-[#172336] data-[state=active]:text-[#dde6f8]">{l}</TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="grid gap-4 xl:grid-cols-[1.5fr_.5fr]">
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5">
              <h3 className="font-bold">Account equity</h3>
              <p className="text-xs text-[#6b7a96]">Barcha trade bo'yicha cumulative balans</p>
              <div className="mt-4 h-72">
                {equity.length
                  ? <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equity}>
                        <defs>
                          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.04)" vertical={false} />
                        <XAxis dataKey="trade" tick={{ fontSize: 11, fill: "#6b7a96" }} />
                        <YAxis width={80} tick={{ fontSize: 11, fill: "#6b7a96" }} />
                        <Tooltip formatter={v => cash.format(Number(v))} contentStyle={{ background: "#0a0f1a", border: "1px solid #1a2235", borderRadius: 12 }} />
                        <Area dataKey="equity" stroke="#3b82f6" fill="url(#eq)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  : <Empty text="Equity curve uchun trade qo'shing." />
                }
              </div>
            </div>
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5">
              <h3 className="font-bold">Challenge limits</h3>
              <div className="mt-4 space-y-5">
                <ProgressBar label="Profit target" value={account.profitTarget ? Math.min(100, Math.max(0, stats.pnl / account.profitTarget * 100)) : 0} color="bg-emerald-500" />
                <ProgressBar label="Max drawdown" value={account.maxDrawdown && stats.pnl < 0 ? Math.min(100, Math.abs(stats.pnl) / account.maxDrawdown * 100) : 0} color="bg-rose-500" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat label="DAILY LIMIT" value={cash.format(account.dailyDrawdown)} />
                <MiniStat label="START BAL" value={cash.format(account.initialBalance)} />
              </div>
            </div>
          </TabsContent>

          {/* Calendar */}
          <TabsContent value="calendar">
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 overflow-hidden">
              <div className="border-b border-[#1a2235] px-5 py-4">
                <h3 className="font-bold capitalize">{month.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })} natijalari</h3>
                <p className="text-xs text-[#6b7a96]">Har bir kunning P&L va trade soni</p>
              </div>
              {/* Desktop calendar */}
              <div className="hidden p-4 md:block">
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {WEEKDAYS_FULL.map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {calendar.map((c, i) =>
                    c ? (
                      <div key={c.day}
                        className={`min-h-[130px] rounded-xl border p-2.5 transition ${c.trades.length ? c.pnl >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5" : "border-[#1a2235] bg-[#060b14]/40"}`}>
                        <div className="flex items-start justify-between">
                          <span className={`grid size-6 place-items-center rounded-md text-[11px] font-bold ${c.trades.length ? "bg-[#1a2235] text-[#dde6f8]" : "text-[#6b7a96]"}`}>{c.day}</span>
                          {c.trades.length > 0 && (
                            <span className="rounded-md bg-[#1a2235] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7a96]">
                              {c.trades.length}t
                            </span>
                          )}
                        </div>
                        {c.trades.length > 0 ? (
                          <>
                            <p className={`mt-3 font-mono text-sm font-black ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {c.pnl >= 0 ? "+" : ""}{cash.format(c.pnl)}
                            </p>
                            <p className="mt-1 truncate text-[10px] text-[#6b7a96]">
                              {c.trades.map(t => t.symbol).join(", ")}
                            </p>
                            <div className="mt-1.5 flex gap-1">
                              {c.trades.filter(t => t.pnl > 0).length > 0 && (
                                <span className="rounded-md bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-400">{c.trades.filter(t => t.pnl > 0).length}W</span>
                              )}
                              {c.trades.filter(t => t.pnl <= 0).length > 0 && (
                                <span className="rounded-md bg-rose-500/15 px-1 py-0.5 text-[9px] font-bold text-rose-400">{c.trades.filter(t => t.pnl <= 0).length}L</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="mt-8 text-center text-[10px] text-[#1e2d45]">—</p>
                        )}
                      </div>
                    ) : (
                      <div key={i} className="min-h-[130px] rounded-xl border border-transparent" />
                    )
                  )}
                </div>
              </div>

              {/* Mobile calendar */}
              <div className="p-3 md:hidden">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS_SHORT.map(d => (
                    <div key={d} className="py-1 text-center text-[10px] font-semibold text-[#6b7a96]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((c, i) =>
                    c ? (
                      <div key={c.day}
                        className={`flex flex-col items-center rounded-lg p-1 py-1.5 ${c.trades.length ? c.pnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10" : ""}`}>
                        <span className={`text-[11px] font-bold ${c.trades.length ? "text-[#dde6f8]" : "text-[#6b7a96]"}`}>{c.day}</span>
                        {c.trades.length > 0 && (
                          <span className={`mt-0.5 text-[9px] font-black ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {c.pnl >= 0 ? "+" : ""}{Math.abs(c.pnl) >= 1000 ? `${(c.pnl / 1000).toFixed(1)}k` : c.pnl.toFixed(0)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div key={i} />
                    )
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Trades */}
          <TabsContent value="trades">
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-[#1a2235] px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold">Trade journal</h3>
                  <p className="text-xs text-[#6b7a96]">{trades.length} ta trade</p>
                </div>
                <div className="relative sm:ml-auto sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-[#6b7a96]" size={15} />
                  <Input value={p.query} onChange={e => p.onQuery(e.target.value)} className="border-[#1a2235] bg-[#060b14] pl-9 text-sm" placeholder="Symbol yoki setup" />
                </div>
              </div>
              {trades.length
                ? trades.map(e => (
                    <div key={e.id} className="flex items-center gap-3 border-t border-[#1a2235] px-5 py-3 transition hover:bg-[#172336]/40">
                      {e.imageUrl
                        ? <img src={e.imageUrl} alt={`${e.symbol} chart`} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                        : <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-[#060b14]"><ImageIcon size={18} className="text-[#2a3f60]" /></span>
                      }
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <b className="font-bold">{e.symbol}</b>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${e.side === "Long" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                            {e.side}
                          </span>
                          {e.emotion && e.emotion !== "Neutral" && (
                            <span className="rounded-md bg-[#1a2235] px-1.5 py-0.5 text-[10px] text-[#6b7a96]">{e.emotion}</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#6b7a96]">{e.setup || "No setup"} · {e.date}</p>
                        {e.tags && e.tags.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {e.tags.slice(0, 3).map(t => (
                              <span key={t} className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] text-blue-400">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <b className={`font-mono font-black ${e.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{e.pnl >= 0 ? "+" : ""}{cash.format(e.pnl)}</b>
                        <p className="text-xs text-[#6b7a96]">{(e.resultR || 0).toFixed(2)}R</p>
                      </div>
                    </div>
                  ))
                : <Empty text="Bu oyda trade yo'q." />
              }
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5">
              <h3 className="font-bold">Setup performance</h3>
              <div className="mt-4 space-y-4">
                {setups.length
                  ? setups.map(s => (
                      <div key={s.name}>
                        <div className="flex text-sm">
                          <span className="text-[#dde6f8]">{s.name}</span>
                          <span className={`ml-auto font-mono font-bold ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {s.rate}% · {s.pnl >= 0 ? "+" : ""}{cash.format(s.pnl)}
                          </span>
                        </div>
                        <ProgressBar label={`${s.trades} trades`} value={s.rate} color="bg-blue-500" />
                      </div>
                    ))
                  : <Empty text="Setup statistikasi yo'q." />
                }
              </div>
            </div>
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5">
              <h3 className="font-bold">Account details</h3>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  ["FIRM", account.firm || "Independent"],
                  ["PHASE", account.phase],
                  ["MARKET", account.marketType],
                  ["START DATE", account.startDate],
                  ["TARGET", cash.format(account.profitTarget)],
                  ["MAX DD", cash.format(account.maxDrawdown)],
                ].map(([l, v]) => <MiniStat key={l} label={l} value={v} />)}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex text-xs">
        <span className="text-[#6b7a96]">{label}</span>
        <b className="ml-auto text-[#dde6f8]">{value.toFixed(0)}%</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#0f1b2d]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#060b14]/60 p-3 text-center">
      <b className="block truncate font-mono text-sm">{value}</b>
      <small className="text-[9px] font-semibold uppercase tracking-wider text-[#6b7a96]">{label}</small>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-[#6b7a96]">{text}</div>;
}
