"use client";

import {
  ArrowLeft, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  Download, ImageIcon, LoaderCircle, MoreHorizontal, Plus, Search, ShieldCheck,
  Target, Trash2, TrendingDown, TrendingUp, WalletCards, X, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../lib/api-client";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from "./auth-context";
import { PropAccountDialog } from "./prop-account-dialog";
import { PropFirmLogo } from "./prop-firm-logo";
import { TradeReviewModal } from "./trade-review-modal";
import type { JournalEntry, PropAccount } from "./types";

type AccountRow = { id: string; name: string; firm: string; phase: string; market_type: string; account_size: string; initial_balance: string; profit_target: string; max_drawdown: string; daily_drawdown: string; start_date: string; status: PropAccount["status"] };
type EntryRow = { id: string; prop_account_id?: string | null; symbol: string; side: "Long" | "Short"; entry_price: string; exit_price: string; quantity: string; fees: string; pnl: string; note: string; traded_at: string; account_name?: string; market_type?: string; setup?: string; emotion?: string; risk_amount?: string; result_r?: string; risk_percent?: string; session?: string; following_plan?: boolean; error_made?: boolean; mistake_type?: string; review_completed?: boolean; to_trading_bible?: boolean; image_url?: string | null; tags?: string[] };
type Summary = { account: PropAccount; trades: number; pnl: number; winRate: number; target: number; dd: number };
type TradeRange = "daily" | "monthly" | "quarter" | "yearly" | "custom";

const cash = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const WEEKDAYS_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
const WORKSPACE_TABS = [["overview", "Overview"], ["calendar", "Calendar"], ["trades", "Trades"], ["analytics", "Analytics"]] as const;
type WorkspaceTab = typeof WORKSPACE_TABS[number][0];

const accountFrom = (a: AccountRow): PropAccount => ({ id: a.id, name: a.name, firm: a.firm, phase: a.phase, marketType: a.market_type, accountSize: +a.account_size, initialBalance: +a.initial_balance, profitTarget: +a.profit_target, maxDrawdown: +a.max_drawdown, dailyDrawdown: +a.daily_drawdown, startDate: a.start_date, status: a.status });
const entryFrom = (e: EntryRow): JournalEntry => ({ id: e.id, propAccountId: e.prop_account_id, symbol: e.symbol, side: e.side, entry: +e.entry_price, exit: +e.exit_price, quantity: +e.quantity, fees: +e.fees, pnl: +e.pnl, note: e.note, rawDate: e.traded_at, date: new Date(`${e.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"), accountName: e.account_name, marketType: e.market_type, setup: e.setup || "", emotion: e.emotion || "Neutral", riskAmount: +(e.risk_amount || 0), resultR: +(e.result_r || 0), riskPercent: e.risk_percent || "1.0%", session: e.session || "", followingPlan: e.following_plan ?? true, errorMade: e.error_made ?? false, mistakeType: e.mistake_type || "", reviewCompleted: e.review_completed ?? false, toTradingBible: e.to_trading_bible ?? false, imageUrl: e.image_url, tags: e.tags || [] });
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
  const [tradeRange, setTradeRange] = useState<TradeRange>("monthly");
  const [customStart, setCustomStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

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
  const rangeEntries = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    if (tradeRange === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      return accountEntries.filter(e => e.rawDate === today);
    }
    if (tradeRange === "monthly") return monthEntries;
    if (tradeRange === "quarter") {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0);
      return accountEntries.filter(e => {
        const d = new Date(`${e.rawDate}T00:00:00`);
        return d >= start && d <= end;
      });
    }
    if (tradeRange === "yearly") return accountEntries.filter(e => e.rawDate?.startsWith(String(y)));
    return accountEntries.filter(e => {
      const date = e.rawDate || "";
      return date >= customStart && date <= customEnd;
    });
  }, [accountEntries, month, monthEntries, tradeRange, customStart, customEnd]);
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return q ? rangeEntries.filter(e => `${e.symbol} ${e.setup} ${e.note} ${e.tags?.join(" ")}`.toLowerCase().includes(q)) : rangeEntries; }, [rangeEntries, query]);
  const summaries = useMemo<Summary[]>(() => accounts.map(account => { const t = entries.filter(e => e.propAccountId === account.id), p = t.reduce((s, e) => s + e.pnl, 0), w = t.filter(e => e.pnl > 0).length; return { account, trades: t.length, pnl: p, winRate: t.length ? Math.round(w / t.length * 100) : 0, target: account.profitTarget ? Math.min(100, Math.max(0, p / account.profitTarget * 100)) : 0, dd: account.maxDrawdown && p < 0 ? Math.min(100, Math.abs(p) / account.maxDrawdown * 100) : 0 }; }), [accounts, entries]);
  const stats = useMemo(() => { const pnl = monthEntries.reduce((s, e) => s + e.pnl, 0), wins = monthEntries.filter(e => e.pnl > 0), losses = monthEntries.filter(e => e.pnl < 0), gw = wins.reduce((s, e) => s + e.pnl, 0), gl = Math.abs(losses.reduce((s, e) => s + e.pnl, 0)); return { pnl, wins: wins.length, losses: losses.length, rate: monthEntries.length ? Math.round(wins.length / monthEntries.length * 100) : 0, r: monthEntries.length ? monthEntries.reduce((s, e) => s + (e.resultR || 0), 0) / monthEntries.length : 0, pf: gl ? gw / gl : gw ? gw : 0 }; }, [monthEntries]);
  const equity = useMemo(() => {
    const initialBalance = account?.initialBalance || 0;
    const trades = [...accountEntries]
      .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
      .reduce<Array<{ trade: number; equity: number; label: string }>>((points, entry, index) => {
        const previousEquity = points[index - 1]?.equity ?? initialBalance;
        return [...points, { trade: index + 1, equity: previousEquity + entry.pnl, label: entry.rawDate || `Trade ${index + 1}` }];
      }, []);
    return [{ trade: 0, equity: initialBalance, label: "Start" }, ...trades];
  }, [accountEntries, account]);
  const setups = useMemo(() => { const m = new Map<string, { pnl: number; trades: number; wins: number }>(); monthEntries.forEach(e => { const k = e.setup || "Uncategorized", v = m.get(k) || { pnl: 0, trades: 0, wins: 0 }; m.set(k, { pnl: v.pnl + e.pnl, trades: v.trades + 1, wins: v.wins + (e.pnl > 0 ? 1 : 0) }); }); return [...m].map(([name, v]) => ({ name, ...v, rate: Math.round(v.wins / v.trades * 100) })).sort((a, b) => b.pnl - a.pnl); }, [monthEntries]);
  const mistakes = useMemo(() => { const m = new Map<string, { pnl: number; trades: number }>(); monthEntries.filter(e => e.errorMade && e.mistakeType).forEach(e => { const k = e.mistakeType as string, v = m.get(k) || { pnl: 0, trades: 0 }; m.set(k, { pnl: v.pnl + e.pnl, trades: v.trades + 1 }); }); return [...m].map(([name, v]) => ({ name, ...v })).sort((a, b) => a.pnl - b.pnl); }, [monthEntries]);
  const planRate = useMemo(() => monthEntries.length ? Math.round(monthEntries.filter(e => e.followingPlan).length / monthEntries.length * 100) : 0, [monthEntries]);
  const calendar = useMemo(() => { const y = month.getFullYear(), m = month.getMonth(), offset = (new Date(y, m, 1).getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate(), cells = 42; return Array.from({ length: cells }, (_, i) => { const day = i - offset + 1; if (day < 1 || day > count) return null; const key = `${monthId(month)}-${String(day).padStart(2, "0")}`, trades = accountEntries.filter(e => e.rawDate === key); return { day, trades, pnl: trades.reduce((s, e) => s + e.pnl, 0) }; }); }, [month, accountEntries]);

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
    const num = (key: string) => parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const r = await apiRequest<{ entry: EntryRow }>("/api/journal", { method: "POST", body: JSON.stringify({
        propAccountId: account.id,
        symbol: form.get("symbol"),
        side: form.get("side"),
        pnl: num("pnl"),
        quantity: num("quantity"),
        fees: num("fees"),
        riskAmount: num("riskAmount"),
        resultR: num("resultR"),
        riskPercent: form.get("riskPercent"),
        session: form.get("session"),
        tradedAt: form.get("tradedAt"),
        setup: form.get("setup"),
        followingPlan: form.get("followingPlan") === "true",
        errorMade: form.get("errorMade") === "true",
        mistakeType: form.get("mistakeType"),
        reviewCompleted: form.get("reviewCompleted") === "true",
        toTradingBible: form.get("toTradingBible") === "true",
        tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: form.get("note"),
        imageUrl: form.get("imageUrl"),
      }) });
      const next = entryFrom(r.entry);
      setEntries(v => [next, ...v]);
      setMonth(new Date(`${next.rawDate}T00:00:00`));
      setTradeOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Trade saqlanmadi"); }
    finally { setSaving(false); }
  }

  async function updateTrade(id: string, form: FormData) {
    setSaving(true);
    const num = (key: string) => parseFloat(String(form.get(key) || "0").replace(",", ".")) || 0;
    try {
      const response = await apiRequest<{ entry: EntryRow }>(`/api/journal/${id}`, { method: "PATCH", body: JSON.stringify({
        symbol: form.get("symbol"),
        side: form.get("side"),
        pnl: num("pnl"),
        quantity: num("quantity"),
        fees: num("fees"),
        riskAmount: num("riskAmount"),
        resultR: num("resultR"),
        riskPercent: form.get("riskPercent"),
        session: form.get("session"),
        tradedAt: form.get("tradedAt"),
        setup: form.get("setup"),
        tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: form.get("note"),
      }) });
      const next = entryFrom(response.entry);
      setEntries(current => current.map(entry => entry.id === id ? next : entry));
      setMonth(new Date(`${next.rawDate}T00:00:00`));
    } catch (e) { setError(e instanceof Error ? e.message : "Trade yangilanmadi"); }
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
        ? <Workspace account={account} stats={stats} equity={equity} setups={setups} mistakes={mistakes} planRate={planRate} monthCount={monthEntries.length} calendar={calendar} trades={shown} query={query} month={month} deleting={deleting === account.id} saving={saving} tradeRange={tradeRange} customStart={customStart} customEnd={customEnd} onRange={setTradeRange} onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} onQuery={setQuery} onBack={() => setAccountId(null)} onTrade={() => setTradeOpen(true)} onDelete={() => removeAccount(account)} onCsv={exportCsv} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onToday={() => setMonth(new Date())} onUpdateTrade={updateTrade} />
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
            <p className="text-xs text-[#6b7a96]">{s.account.phase} / {s.account.marketType}</p>
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
  equity: Array<{ trade: number; equity: number; label: string }>; setups: Array<{ name: string; pnl: number; trades: number; wins: number; rate: number }>;
  mistakes: Array<{ name: string; pnl: number; trades: number }>; planRate: number; monthCount: number;
  calendar: Array<{ day: number; trades: JournalEntry[]; pnl: number } | null>;
  trades: JournalEntry[]; query: string; month: Date; deleting: boolean; saving: boolean; tradeRange: TradeRange; customStart: string; customEnd: string;
  onRange: (value: TradeRange) => void; onCustomStart: (value: string) => void; onCustomEnd: (value: string) => void;
  onQuery: (v: string) => void; onBack: () => void; onTrade: () => void; onDelete: () => void;
  onCsv: () => void; onPrev: () => void; onNext: () => void; onToday: () => void;
  onUpdateTrade: (id: string, form: FormData) => Promise<void>;
}) {
  const { account, stats, equity, setups, mistakes, planRate, monthCount, calendar, trades, month } = p;
  const [selectedTrade, setSelectedTrade] = useState<JournalEntry | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const currentPnl = (equity.at(-1)?.equity ?? account.initialBalance) - account.initialBalance;
  const currentEquity = account.initialBalance + currentPnl;
  const targetProgress = account.profitTarget ? Math.min(100, Math.max(0, currentPnl / account.profitTarget * 100)) : 0;
  const drawdownUsed = account.maxDrawdown && currentPnl < 0 ? Math.min(100, Math.abs(currentPnl) / account.maxDrawdown * 100) : 0;

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
          <p className="text-[11px] text-[#6b7a96]">{account.phase} / {cash.format(account.accountSize)}</p>
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="gap-4">
          <label className="block md:hidden">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#6b7a96]">View</span>
            <select value={activeTab} onChange={(event) => setActiveTab(event.target.value as WorkspaceTab)} className="h-11 w-full rounded-xl border border-[#1a2235] bg-[#0d1525] px-3 text-sm font-bold text-[#dde6f8] outline-none">
              {WORKSPACE_TABS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <TabsList className="hidden h-10 w-full justify-start overflow-x-auto rounded-xl border border-[#1a2235] bg-[#0d1525] p-1 md:inline-flex">
            {WORKSPACE_TABS.map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="rounded-lg px-5 text-sm data-[state=active]:bg-[#172336] data-[state=active]:text-[#dde6f8]">{l}</TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <section className="overflow-hidden rounded-[26px] border border-[#20283a] bg-[linear-gradient(180deg,#212130,#171925_68%,#121722)] shadow-2xl shadow-black/25">
              <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-5 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <h3 className="text-base font-black">Account Balance</h3>
                  <p className="mt-1 text-xs text-[#8792aa]">{account.name} equity performance</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:ml-auto lg:min-w-[560px]">
                  <BalanceMetric label="Current P&L" value={`${currentPnl >= 0 ? "+" : ""}${cash.format(currentPnl)}`} tone={currentPnl >= 0 ? "good" : "bad"} />
                  <BalanceMetric label="Equity" value={cash.format(currentEquity)} />
                  <BalanceMetric label="Closed Balance" value={cash.format(currentEquity)} />
                </div>
              </div>
              <div className="h-[340px] px-2 pb-4 pt-3 sm:h-[390px] sm:px-4">
                {equity.length > 1
                  ? <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equity} margin={{ left: 8, right: 14, top: 16, bottom: 4 }}>
                        <defs>
                          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d9f96d" stopOpacity={0.42} />
                            <stop offset="42%" stopColor="#a9b2ff" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#202331" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                        <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#707b91" }} />
                        <YAxis width={72} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`} tick={{ fontSize: 11, fill: "#707b91" }} domain={["dataMin - 100", "dataMax + 100"]} />
                        <Tooltip formatter={v => cash.format(Number(v))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#11131d", border: "1px solid #2b3145", borderRadius: 16, color: "#e8edf8" }} />
                        <Area type="monotone" dataKey="equity" stroke="#d9f96d" fill="url(#balanceFill)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#d9f96d", stroke: "#11131d", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  : <Empty text="Balance chart uchun trade qo'shing." />
                }
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5">
                <h3 className="font-bold">Challenge limits</h3>
                <div className="mt-4 space-y-5">
                  <ProgressBar label="Profit target" value={targetProgress} color="bg-[#d9f96d]" />
                  <ProgressBar label="Max drawdown" value={drawdownUsed} color="bg-rose-500" />
                </div>
              </div>
              <MiniStat label="DAILY LIMIT" value={cash.format(account.dailyDrawdown)} />
              <MiniStat label="START BALANCE" value={cash.format(account.initialBalance)} />
            </div>
          </TabsContent>

          {/* Calendar */}
          <TabsContent value="calendar">
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-[#1a2235] px-5 py-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="font-bold capitalize">{month.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })} natijalari</h3>
                  <p className="text-xs text-[#6b7a96]">Har bir kunning P&L va trade soni</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#1a2235] bg-[#060b14] p-1 lg:ml-auto">
                  <Button variant="ghost" size="icon-sm" onClick={p.onPrev}><ChevronLeft size={16} /></Button>
                  <strong className="min-w-32 text-center text-sm capitalize">{month.toLocaleDateString("uz-UZ", { month: "short", year: "numeric" })}</strong>
                  <Button variant="ghost" size="icon-sm" onClick={p.onNext}><ChevronRight size={16} /></Button>
                  <Button variant="outline" size="sm" onClick={p.onToday} className="border-[#1a2235] bg-transparent text-xs">Joriy oy</Button>
                </div>
              </div>
              {/* Desktop calendar */}
              <div className="hidden p-4 md:block">
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {WEEKDAYS_FULL.map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7a96]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 content-start gap-1.5 [grid-auto-rows:130px]">
                  {calendar.map((c, i) =>
                    c ? (
                      <div key={`${monthId(month)}-desktop-${i}`}
                        className={`h-full rounded-xl border p-2.5 transition ${c.trades.length ? c.pnl >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5" : "border-[#1a2235] bg-[#060b14]/40"}`}>
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
                          <p className="mt-8 text-center text-[10px] text-[#1e2d45]">-</p>
                        )}
                      </div>
                    ) : (
                      <div key={`${monthId(month)}-desktop-empty-${i}`} className="h-full rounded-xl border border-transparent" />
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
                      <div key={`${monthId(month)}-mobile-${i}`}
                        className={`flex flex-col items-center rounded-lg p-1 py-1.5 ${c.trades.length ? c.pnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10" : ""}`}>
                        <span className={`text-[11px] font-bold ${c.trades.length ? "text-[#dde6f8]" : "text-[#6b7a96]"}`}>{c.day}</span>
                        {c.trades.length > 0 && (
                          <span className={`mt-0.5 text-[9px] font-black ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {c.pnl >= 0 ? "+" : ""}{Math.abs(c.pnl) >= 1000 ? `${(c.pnl / 1000).toFixed(1)}k` : c.pnl.toFixed(0)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div key={`${monthId(month)}-mobile-empty-${i}`} />
                    )
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Trades */}
          <TabsContent value="trades">
            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 overflow-hidden">
              <div className="space-y-3 border-b border-[#1a2235] px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold">Trade journal</h3>
                  <p className="text-xs text-[#6b7a96]">{trades.length} ta trade</p>
                </div>
                <div className="relative sm:ml-auto sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-[#6b7a96]" size={15} />
                  <Input value={p.query} onChange={e => p.onQuery(e.target.value)} className="border-[#1a2235] bg-[#060b14] pl-9 text-sm" placeholder="Symbol yoki setup" />
                </div>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#1a2235] bg-[#060b14] p-1 sm:flex">
                    {[
                      ["daily", "Daily"],
                      ["monthly", "Monthly"],
                      ["quarter", "3 months"],
                      ["yearly", "Yearly"],
                      ["custom", "Custom"],
                    ].map(([value, label]) => (
                      <button key={value} type="button" onClick={() => p.onRange(value as TradeRange)}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${p.tradeRange === value ? "bg-blue-500/18 text-blue-200 ring-1 ring-blue-400/20" : "text-[#6b7a96] hover:bg-white/[.04] hover:text-[#dde6f8]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {p.tradeRange === "custom" ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:ml-auto lg:w-[360px]">
                      <Input type="date" value={p.customStart} onChange={event => p.onCustomStart(event.target.value)} className="border-[#1a2235] bg-[#060b14] text-sm" />
                      <Input type="date" value={p.customEnd} onChange={event => p.onCustomEnd(event.target.value)} className="border-[#1a2235] bg-[#060b14] text-sm" />
                    </div>
                  ) : null}
                </div>
              </div>
              {trades.length
                ? trades.map(e => (
                    <button key={e.id} type="button" onClick={() => setSelectedTrade(e)} className="flex w-full items-center gap-3 border-t border-[#1a2235] px-5 py-3 text-left transition hover:bg-[#172336]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
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
                          {e.riskPercent && (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">{e.riskPercent}</span>
                          )}
                          {e.errorMade && (
                          <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400" title={e.mistakeType}>Xato</span>
                          )}
                          {!e.followingPlan && !e.errorMade && (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">Off-plan</span>
                          )}
                          {e.reviewCompleted && (
                            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">Reviewed</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#6b7a96]">{e.setup || "No setup"} / {e.session || "No session"} / {e.date}</p>
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
                    </button>
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
                            {s.rate}% / {s.pnl >= 0 ? "+" : ""}{cash.format(s.pnl)}
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
              <h3 className="font-bold">Discipline</h3>
              <p className="text-xs text-[#6b7a96]">Notion: Following plan?</p>
              <div className="mt-4">
                <ProgressBar label={`${monthCount} trade ichidan`} value={planRate} color="bg-emerald-500" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <MiniStat label="PLANGA MOS" value={`${planRate}%`} />
                <MiniStat label="XATOLI TRADE" value={String(mistakes.reduce((s, m) => s + m.trades, 0))} />
              </div>
            </div>

            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5 xl:col-span-2">
              <h3 className="font-bold">Outside of Plan</h3>
              <p className="text-xs text-[#6b7a96]">Eng ko&apos;p uchragan xatolar va ular keltirgan zarar</p>
              <div className="mt-4 space-y-3">
                {mistakes.length
                  ? mistakes.map(m => (
                      <div key={m.name} className="flex items-center justify-between rounded-xl bg-[#060b14]/60 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-[11px] text-[#6b7a96]">{m.trades} marta takrorlandi</p>
                        </div>
                        <b className={`font-mono font-bold ${m.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {m.pnl >= 0 ? "+" : ""}{cash.format(m.pnl)}
                        </b>
                      </div>
                    ))
                  : <Empty text="Bu oyda xato qayd etilmagan. Ajoyib disciplina!" />
                }
              </div>
            </div>

            <div className="rounded-2xl border border-[#1a2235] bg-[#0d1525]/80 p-5 xl:col-span-2">
              <h3 className="font-bold">Account details</h3>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
        {selectedTrade ? (
          <TradeEditor
            trade={selectedTrade}
            saving={p.saving}
            onClose={() => setSelectedTrade(null)}
            onSave={async (form) => {
              await p.onUpdateTrade(selectedTrade.id, form);
              setSelectedTrade(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function TradeEditor({ trade, saving, onClose, onSave }: { trade: JournalEntry; saving: boolean; onClose: () => void; onSave: (form: FormData) => Promise<void> }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <form action={onSave} className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#1a2235] bg-[#070b12] text-white shadow-2xl shadow-black/80">
        <header className="flex items-center gap-3 border-b border-[#1a2235] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-black">{trade.symbol} trade</h3>
            <p className="text-xs text-[#6b7a96]">Trade detail va edit</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-[#6b7a96] hover:bg-white/[.05] hover:text-white" aria-label="Close">
            <X size={17} />
          </button>
        </header>
        <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-[#6b7a96]">Symbol<Input name="symbol" defaultValue={trade.symbol} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">Side<select name="side" defaultValue={trade.side} className="mt-1 h-10 w-full rounded-lg border border-[#1a2235] bg-[#060b14] px-3 text-sm text-white"><option>Long</option><option>Short</option></select></label>
            <label className="text-xs text-[#6b7a96]">Date<Input name="tradedAt" type="date" defaultValue={trade.rawDate} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-[#6b7a96]">PnL<Input name="pnl" inputMode="decimal" defaultValue={String(trade.pnl)} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">Quantity<Input name="quantity" inputMode="decimal" defaultValue={String(trade.quantity)} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">Fees<Input name="fees" inputMode="decimal" defaultValue={String(trade.fees)} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-[#6b7a96]">Risk $<Input name="riskAmount" inputMode="decimal" defaultValue={String(trade.riskAmount ?? 0)} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">RR<Input name="resultR" inputMode="decimal" defaultValue={String(trade.resultR ?? 0)} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">Risk %<Input name="riskPercent" defaultValue={trade.riskPercent ?? ""} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-[#6b7a96]">Setup<Input name="setup" defaultValue={trade.setup ?? ""} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">Session<Input name="session" defaultValue={trade.session ?? ""} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
            <label className="text-xs text-[#6b7a96]">Tags<Input name="tags" defaultValue={(trade.tags ?? []).join(", ")} className="mt-1 border-[#1a2235] bg-[#060b14]" /></label>
          </div>
          <label className="block text-xs text-[#6b7a96]">Review note<Textarea name="note" defaultValue={trade.note} className="mt-1 min-h-28 border-[#1a2235] bg-[#060b14]" /></label>
        </div>
        <footer className="flex gap-2 border-t border-[#1a2235] p-4">
          <Button type="button" variant="outline" onClick={onClose} className="border-[#1a2235] bg-transparent">Cancel</Button>
          <Button disabled={saving} className="ml-auto bg-blue-600 hover:bg-blue-500">{saving ? <LoaderCircle className="animate-spin" size={15} /> : null} Save changes</Button>
        </footer>
      </form>
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

function BalanceMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-[#d9f96d]" : tone === "bad" ? "text-rose-300" : "text-[#dfe5f2]";
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#848da3]">{label}</p>
      <b className={`mt-1 block truncate font-mono text-xl font-black ${color}`}>{value}</b>
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
