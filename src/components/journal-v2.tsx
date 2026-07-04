"use client";

import {
  ArrowLeft, BarChart3, BookOpen, BrainCircuit, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Download, ImageIcon, LoaderCircle, MoreHorizontal, Plus, Search, ShieldCheck,
  Target, Trash2, TrendingDown, TrendingUp, WalletCards, X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../lib/api-client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from "./auth-context";
import { InstrumentBadge } from "./instrument-badge";
import { MediaImage } from "./media-image";
import { PlatformLogoBadge } from "./platform-logo-badge";
import { PropAccountDialog } from "./prop-account-dialog";
import { PropFirmLogo } from "./prop-firm-logo";
import { Mt5Settings } from "./mt5-settings";
import { TradeReviewModal } from "./trade-review-modal";
import type { JournalEntry, OpenPosition, PropAccount } from "./types";

type AccountRow = { id: string; name: string; account_type?: "prop" | "real" | null; firm: string; prop_site?: string | null; prop_login?: string | null; import_source?: "manual" | "mt5_bridge" | "ctrader" | "tradovate" | "ninjatrader" | "official_api" | null; platform?: string | null; phase: string; market_type: string; account_size: string; initial_balance: string; profit_target: string; max_drawdown: string; daily_drawdown: string; start_date: string; status: PropAccount["status"] };
type EntryRow = { id: string; prop_account_id?: string | null; symbol: string; side: "Long" | "Short"; entry_price: string; exit_price: string; quantity: string; fees: string; pnl: string; note: string; traded_at: string; account_name?: string; market_type?: string; setup?: string; emotion?: string; risk_amount?: string; result_r?: string; risk_percent?: string; session?: string; following_plan?: boolean; error_made?: boolean; mistake_type?: string; review_completed?: boolean; to_trading_bible?: boolean; image_url?: string | null; tags?: string[] };
type Summary = { account: PropAccount; trades: number; pnl: number; winRate: number; target: number; dd: number };
type TradeRange = "daily" | "monthly" | "quarter" | "yearly" | "custom";
type AiCoachReport = {
  title: string;
  summary: string;
  score: number;
  mood: "protect" | "neutral" | "push";
  strengths: string[];
  mistakes: string[];
  riskWarnings: string[];
  nextSteps: string[];
  generatedBy: "rules" | "openai";
};

const cash = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const WEEKDAYS_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
const WORKSPACE_TABS = [["overview", "Overview"], ["calendar", "Calendar"], ["trades", "Trades"], ["bible", "Bible"], ["analytics", "Analytics"], ["settings", "Settings"]] as const;
type WorkspaceTab = typeof WORKSPACE_TABS[number][0];

const accountFrom = (a: AccountRow): PropAccount => ({ id: a.id, name: a.name, accountType: a.account_type || "prop", firm: a.firm, propSite: a.prop_site || "", propLogin: a.prop_login || "", importSource: a.import_source || "manual", platform: a.platform || "mt5", phase: a.phase, marketType: a.market_type, accountSize: +a.account_size, initialBalance: +a.initial_balance, profitTarget: +a.profit_target, maxDrawdown: +a.max_drawdown, dailyDrawdown: +a.daily_drawdown, startDate: a.start_date, status: a.status });
const parseTradeImages = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 3) : [value];
  } catch {
    return [value];
  }
};
const entryFrom = (e: EntryRow): JournalEntry => { const imageUrls = parseTradeImages(e.image_url); return ({ id: e.id, propAccountId: e.prop_account_id, symbol: e.symbol, side: e.side, entry: +e.entry_price, exit: +e.exit_price, quantity: +e.quantity, fees: +e.fees, pnl: +e.pnl, note: e.note, rawDate: e.traded_at, date: new Date(`${e.traded_at}T00:00:00`).toLocaleDateString("uz-UZ"), accountName: e.account_name, marketType: e.market_type, setup: e.setup || "", emotion: e.emotion || "Neutral", riskAmount: +(e.risk_amount || 0), resultR: +(e.result_r || 0), riskPercent: e.risk_percent || "1.0%", session: e.session || "", followingPlan: e.following_plan ?? true, errorMade: e.error_made ?? false, mistakeType: e.mistake_type || "", reviewCompleted: e.review_completed ?? false, toTradingBible: e.to_trading_bible ?? false, imageUrl: imageUrls[0] ?? null, imageUrls, tags: e.tags || [] }); };
const monthId = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const reviewScore = (entry: JournalEntry) => [entry.note, entry.setup, entry.session, entry.imageUrl, entry.reviewCompleted, entry.toTradingBible].filter(Boolean).length;

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
  const bibleEntries = useMemo(() => accountEntries.filter(e => e.toTradingBible).sort((a, b) => reviewScore(b) - reviewScore(a)), [accountEntries]);
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
      const body: Record<string, string> = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, String(v)])
      );
      const mt5Login    = (body.mt5Login    ?? "").trim();
      const mt5Password = (body.mt5Password ?? "").trim();
      const mt5Server   = (body.mt5Server   ?? "").trim();
      delete body.mt5Login; delete body.mt5Password; delete body.mt5Server;

      const r = await apiRequest<{ account: AccountRow }>("/api/prop-accounts", {
        method: "POST", body: JSON.stringify(body),
      });
      const next = accountFrom(r.account);
      setAccounts(v => [next, ...v]);
      setAccountId(next.id);
      setAccountOpen(false);

      if (mt5Login && mt5Password && mt5Server) {
        await apiRequest(`/api/prop-accounts/${next.id}/mt5`, {
          method: "PUT",
          body: JSON.stringify({ login: mt5Login, password: mt5Password, server: mt5Server }),
        });
      }
      return next;
    } catch (e) { setError(e instanceof Error ? e.message : "Account was not saved."); }
    finally { setSaving(false); }
    return null;
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

  async function addTrade(form: FormData): Promise<{ id: string; symbol: string; side: string; pnl: number; resultR: number | null; note: string | null; setup: string | null } | null> {
    if (!account) return null;
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
        followingPlan: form.has("followingPlan"),
        errorMade: form.has("errorMade"),
        mistakeType: form.get("mistakeType"),
        reviewCompleted: form.has("reviewCompleted"),
        toTradingBible: form.has("toTradingBible"),
        tradedAt: form.get("tradedAt"),
        setup: form.get("setup"),
        tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: form.get("note"),
        imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
      }) });
      const next = entryFrom(r.entry);
      setEntries(v => [next, ...v]);
      setMonth(new Date(`${next.rawDate}T00:00:00`));
      // Modal handles its own close/share lifecycle now
      return {
        id: next.id,
        symbol: next.symbol,
        side: next.side,
        pnl: next.pnl,
        resultR: next.resultR ?? null,
        note: next.note ?? null,
        setup: next.setup ?? null,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade was not saved.");
      return null;
    }
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
        followingPlan: form.has("followingPlan"),
        errorMade: form.has("errorMade"),
        mistakeType: form.get("mistakeType"),
        reviewCompleted: form.has("reviewCompleted"),
        toTradingBible: form.has("toTradingBible"),
        tradedAt: form.get("tradedAt"),
        setup: form.get("setup"),
        tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: form.get("note"),
        imageUrls: JSON.parse(String(form.get("imageUrls") || "[]")),
      }) });
      const next = entryFrom(response.entry);
      setEntries(current => current.map(entry => entry.id === id ? next : entry));
      setMonth(new Date(`${next.rawDate}T00:00:00`));
    } catch (e) { setError(e instanceof Error ? e.message : "Trade yangilanmadi"); }
    finally { setSaving(false); }
  }

  async function removeTrade(id: string) {
    setSaving(true);
    try {
      await apiRequest(`/api/journal/${id}`, { method: "DELETE" });
      setEntries(current => current.filter(entry => entry.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Trade o'chirilmadi"); }
    finally { setSaving(false); }
  }

  const reloadJournal = useCallback(async () => {
    const response = await apiRequest<{ entries: EntryRow[] }>("/api/journal");
    setEntries(response.entries.map(entryFrom));
  }, []);

  const shiftMonth = (n: number) => setMonth(d => new Date(d.getFullYear(), d.getMonth() + n, 1));
  const exportCsv = () => { const rows = [["Date", "Symbol", "Side", "PnL", "R", "Setup"], ...shown.map(e => [e.rawDate, e.symbol, e.side, e.pnl, e.resultR, e.setup])], a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = `${account?.name || "journal"}-${monthId(month)}.csv`; a.click(); URL.revokeObjectURL(a.href); };

  if (!user) return (
    <div className="grid min-h-[75dvh] place-items-center text-center">
      <div className="animate-page-in">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/[.06]">
          <ShieldCheck className="text-zinc-300" size={32} />
        </div>
        <h2 className="mt-5 text-3xl font-black">Professional trading journal</h2>
        <p className="mt-2 text-[#8a8a8a]">Track real and prop accounts in one focused workspace.</p>
        <Button className="mt-6 h-11 bg-white px-8 text-black hover:bg-zinc-200" onClick={onLogin}>Sign in with Google</Button>
      </div>
    </div>
  );

  if (loading) return <div className="grid min-h-[70dvh] place-items-center"><LoaderCircle className="animate-spin text-zinc-300" size={28} /></div>;

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
        ? <Workspace account={account} stats={stats} equity={equity} setups={setups} mistakes={mistakes} planRate={planRate} monthCount={monthEntries.length} calendar={calendar} trades={shown} bibleTrades={bibleEntries} query={query} month={month} deleting={deleting === account.id} saving={saving} tradeRange={tradeRange} customStart={customStart} customEnd={customEnd} onRange={setTradeRange} onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} onQuery={setQuery} onBack={() => setAccountId(null)} onTrade={() => setTradeOpen(true)} onDelete={() => removeAccount(account)} onCsv={exportCsv} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onToday={() => setMonth(new Date())} onUpdateTrade={updateTrade} onRemoveTrade={removeTrade} onMt5Synced={reloadJournal} />
        : <Accounts summaries={summaries} entries={entries} deleting={deleting} onAdd={() => setAccountOpen(true)} onOpen={setAccountId} onDelete={removeAccount} />
      }
      <PropAccountDialog open={accountOpen} saving={saving} onOpenChange={setAccountOpen} onSave={addAccount} />
      <TradeReviewModal open={tradeOpen} saving={saving} account={account} onOpenChange={setTradeOpen} onSave={addTrade} />
    </div>
  );
}

// Accounts list.
function Accounts({ summaries, entries, deleting, onAdd, onOpen, onDelete }: { summaries: Summary[]; entries: JournalEntry[]; deleting: string | null; onAdd: () => void; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void }) {
  const total = summaries.reduce((s, a) => s + a.pnl, 0);
  const capital = summaries.reduce((s, a) => s + a.account.accountSize, 0);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const dayEntries = entries.filter((entry) => entry.rawDate === key);
    const pnl = dayEntries.reduce((sum, entry) => sum + entry.pnl, 0);
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      day: String(date.getDate()).padStart(2, "0"),
      trades: dayEntries.length,
      pnl,
    };
  });
  const totalTrades = entries.length;
  const winningTrades = entries.filter((entry) => entry.pnl > 0).length;
  const losingTrades = entries.filter((entry) => entry.pnl < 0).length;
  const breakevenTrades = Math.max(0, totalTrades - winningTrades - losingTrades);
  const grossWins = entries.filter((entry) => entry.pnl > 0).reduce((sum, entry) => sum + entry.pnl, 0);
  const grossLosses = Math.abs(entries.filter((entry) => entry.pnl < 0).reduce((sum, entry) => sum + entry.pnl, 0));
  const profitFactor = grossLosses ? grossWins / grossLosses : grossWins ? grossWins : 0;
  const winRate = totalTrades ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const symbolLeaders = [...entries.reduce((map, entry) => {
    const current = map.get(entry.symbol) || { symbol: entry.symbol, trades: 0, pnl: 0 };
    current.trades += 1;
    current.pnl += entry.pnl;
    map.set(entry.symbol, current);
    return map;
  }, new Map<string, { symbol: string; trades: number; pnl: number }>()).values()].sort((a, b) => b.trades - a.trades).slice(0, 4);
  const recentTrades = [...entries].sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate))).slice(0, 4);
  const equitySeries = entries
    .slice()
    .sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)))
    .reduce<Array<{ trade: number; equity: number; label: string }>>((points, entry, index) => {
      const previousEquity = points[index - 1]?.equity ?? capital;
      return [...points, { trade: index + 1, equity: previousEquity + entry.pnl, label: entry.rawDate || `Trade ${index + 1}` }];
    }, []);

  return (
    <div className="animate-page-in mx-auto max-w-[1700px] space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] px-4 py-4 shadow-[0_24px_70px_rgba(0,0,0,.24)] backdrop-blur-[24px] lg:px-6 lg:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-white/[.06]">
                <ShieldCheck size={14} className="text-zinc-300" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">All accounts / dashboard</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-[#8a8a8a]">
              {today.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <Button variant="outline" className="border-white/10 bg-white/[.03]">Current week</Button>
            <Button onClick={onAdd} className="h-10 bg-white text-black hover:bg-zinc-200">
              <Plus size={16} /> Add account
            </Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day.key} className="rounded-[22px] border border-white/8 bg-black/18 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">{day.label} {day.day}</span>
                <span className="text-xs font-bold text-zinc-500">{day.trades} trades</span>
              </div>
              <p className={`mt-3 text-lg font-black ${day.pnl > 0 ? "text-emerald-300" : day.pnl < 0 ? "text-rose-300" : "text-zinc-300"}`}>
                {day.pnl === 0 ? "$0" : `${day.pnl > 0 ? "+" : ""}${cash.format(day.pnl)}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      {!summaries.length
        ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#2a2a2a] text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[.06]">
                <WalletCards size={24} className="text-zinc-300" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Add your first trading account</h2>
              <p className="mt-1 text-sm text-[#8a8a8a]">Track real accounts, prop challenges or funded accounts.</p>
              <Button onClick={onAdd} className="mt-5 bg-white text-black hover:bg-zinc-200"><Plus size={16} /> Create account</Button>
            </div>
          </div>
        : <>
            <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
              <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.022))] shadow-[0_24px_70px_rgba(0,0,0,.22)]">
                <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-base font-black text-white">Account balance</h3>
                    <p className="mt-1 text-sm text-zinc-500">Combined equity across all active workspaces.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 sm:ml-auto sm:min-w-[420px]">
                    <BalanceMetric label="Current P&L" value={`${total >= 0 ? "+" : ""}${cash.format(total)}`} tone={total >= 0 ? "good" : "bad"} />
                    <BalanceMetric label="Equity" value={cash.format(capital + total)} />
                    <BalanceMetric label="Active accounts" value={String(summaries.filter((item) => item.account.status === "Active").length)} />
                  </div>
                </div>
                <div className="h-[320px] px-2 pb-4 pt-3 sm:px-4">
                  {equitySeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{ trade: 0, equity: capital, label: "Start" }, ...equitySeries]} margin={{ left: 8, right: 14, top: 12, bottom: 2 }}>
                        <defs>
                          <linearGradient id="allAccountsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d9f96d" stopOpacity={0.34} />
                            <stop offset="45%" stopColor="#d4d4d8" stopOpacity={0.14} />
                            <stop offset="100%" stopColor="#171717" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                        <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#707b91" }} />
                        <YAxis width={72} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`} tick={{ fontSize: 11, fill: "#707b91" }} />
                        <Tooltip formatter={(value) => cash.format(Number(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#171717", border: "1px solid #333333", borderRadius: 12, color: "#f1f1f1" }} />
                        <Area type="monotone" dataKey="equity" stroke="#d9f96d" fill="url(#allAccountsFill)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#d9f96d", stroke: "#171717", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty text="Create an account and add trades to build the dashboard." />
                  )}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <DashboardStatCard title="Most traded assets">
                  {symbolLeaders.length ? symbolLeaders.map((leader) => (
                    <div key={leader.symbol} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <InstrumentBadge symbol={leader.symbol} compact className="bg-[#121212]" showFullSymbol={false} />
                        <span className="text-sm font-bold text-white">{leader.symbol}</span>
                      </div>
                      <span className={`text-xs font-black ${leader.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{leader.trades} trades</span>
                    </div>
                  )) : <p className="text-sm text-zinc-500">No trades yet.</p>}
                </DashboardStatCard>

                <DashboardStatCard title="Trade stats">
                  <div className="space-y-3 text-sm text-zinc-300">
                    {[
                      ["Total trades", totalTrades],
                      ["Winning", winningTrades],
                      ["Breakeven", breakevenTrades],
                      ["Losing", losingTrades],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex items-center justify-between border-b border-white/6 pb-2 last:border-0 last:pb-0">
                        <span className="text-zinc-500">{label}</span>
                        <strong className="text-white">{value}</strong>
                      </div>
                    ))}
                  </div>
                </DashboardStatCard>

                <DashboardStatCard title="Trade winrate">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-5xl font-black text-white">{winRate}%</p>
                      <p className="mt-2 text-sm text-zinc-500">{winningTrades} winning / {losingTrades} losing</p>
                    </div>
                    <div className="grid size-24 place-items-center rounded-full border border-white/8 bg-black/15">
                      <div className="grid size-16 place-items-center rounded-full border border-white/10 text-sm font-black text-white">{winRate}%</div>
                    </div>
                  </div>
                </DashboardStatCard>

                <DashboardStatCard title="Profit factor">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-5xl font-black text-white">{profitFactor.toFixed(2)}</p>
                      <p className="mt-2 text-sm text-zinc-500">Gross wins {cash.format(grossWins)}</p>
                      <p className="text-sm text-zinc-500">Gross loss {cash.format(grossLosses)}</p>
                    </div>
                    <div className="flex h-24 items-end gap-1">
                      {Array.from({ length: 22 }, (_, index) => {
                        const active = index < Math.max(4, Math.min(22, winningTrades + losingTrades));
                        const positive = index < Math.max(1, Math.round((winningTrades / Math.max(1, winningTrades + losingTrades)) * 22));
                        return <span key={index} className={`w-1.5 rounded-full ${active ? positive ? "h-10 bg-emerald-400" : "h-10 bg-rose-400" : "h-6 bg-white/10"}`} />;
                      })}
                    </div>
                  </div>
                </DashboardStatCard>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
              <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] p-5 shadow-[0_22px_60px_rgba(0,0,0,.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black text-white">Recent trades</h3>
                    <p className="mt-1 text-sm text-zinc-500">Latest registered closed trades across all accounts.</p>
                  </div>
                  <Button variant="outline" className="border-white/10 bg-white/[.03]">See all</Button>
                </div>
                {recentTrades.length ? (
                  <div className="mt-4 space-y-2">
                    {recentTrades.map((trade) => (
                      <button key={trade.id} type="button" onClick={() => trade.propAccountId ? onOpen(trade.propAccountId) : null} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-left transition hover:bg-white/[.04]">
                        <InstrumentBadge symbol={trade.symbol} compact className="bg-[#121212]" showFullSymbol={false} />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <strong className="truncate text-sm text-white">{trade.symbol}</strong>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{trade.accountName || "TradeWay account"} / {trade.rawDate}</p>
                        </div>
                        <strong className={`font-mono text-sm font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{trade.pnl >= 0 ? "+" : ""}{cash.format(trade.pnl)}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid min-h-44 place-items-center rounded-2xl border border-white/8 bg-black/15 text-center text-sm text-zinc-500">
                    Add trades to bring the dashboard to life.
                  </div>
                )}
              </section>

              <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] p-5 shadow-[0_22px_60px_rgba(0,0,0,.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black text-white">Accounts</h3>
                    <p className="mt-1 text-sm text-zinc-500">Open a workspace or manage status.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {summaries.map(s => <AccountCard key={s.account.id} s={s} deleting={deleting} onOpen={onOpen} onDelete={onDelete} compact />)}
                </div>
              </section>
            </div>
          </>
      }
    </div>
  );
}

function AccountCard({ s, deleting, onOpen, onDelete, compact = false }: { s: Summary; deleting: string | null; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void; compact?: boolean }) {
  const statusColor: Record<string, string> = { Processing: "text-sky-300 bg-sky-400/10 border-sky-400/20", Active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", Passed: "text-zinc-300 bg-white/[.06] border-white/15", Failed: "text-rose-400 bg-rose-400/10 border-rose-400/20", Paused: "text-amber-400 bg-amber-400/10 border-amber-400/20" };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(s.account.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpen(s.account.id); }}
      className={`prop-card-glow group relative cursor-pointer overflow-hidden border border-white/10 bg-white/[.035] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${compact ? "rounded-[24px]" : "rounded-[28px]"}`}
    >
      {/* Top bar accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className={compact ? "p-4" : "p-5"}>
        {/* Header row */}
        <div className="flex items-start gap-3">
          <PropFirmLogo firm={s.account.firm} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{s.account.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#8a8a8a]">
              <span>{s.account.accountType === "real" ? "Real" : "Prop"}</span>
              <span>/</span>
              <span>{s.account.phase}</span>
              <span>/</span>
              <span>{s.account.marketType}</span>
              <PlatformLogoBadge platform={s.account.platform} compact className="ml-1" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${statusColor[s.account.status] || statusColor.Active}`}>
              {s.account.status}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Actions" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-[#2a2a2a] bg-[#181818]" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem variant="destructive" disabled={deleting === s.account.id} onClick={() => onDelete(s.account)}>
                  <Trash2 size={14} /> Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* PnL */}
        <div className={`${compact ? "mt-3" : "mt-4"} flex items-end justify-between`}>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a8a8a]">Result</p>
            <p className={`font-mono ${compact ? "text-xl" : "text-2xl"} font-black ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {s.pnl >= 0 ? "+" : ""}{cash.format(s.pnl)}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-mono ${compact ? "text-base" : "text-lg"} font-bold`}>{cash.format(s.account.accountSize)}</p>
            <p className="text-[10px] text-[#8a8a8a]">Account size</p>
          </div>
        </div>

        {/* Stats row */}
        <div className={`${compact ? "mt-2.5" : "mt-3"} flex gap-4 rounded-xl bg-[#121212]/60 px-4 py-2.5`}>
          {[["Trades", s.trades], ["Win rate", `${s.winRate}%`]].map(([l, v]) => (
            <div key={String(l)}>
              <p className="text-[10px] text-[#8a8a8a]">{l}</p>
              <p className="font-mono text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className={`${compact ? "mt-3" : "mt-4"} space-y-2.5`}>
          <ProgressBar label="Profit target" value={s.target} color="bg-emerald-500" />
          <ProgressBar label="Drawdown used" value={s.dd} color="bg-rose-500" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#2a2a2a] px-5 py-3">
        <span className="text-xs text-[#8a8a8a]">Open journal</span>
        <ChevronRight size={16} className="text-[#8a8a8a] transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

function DashboardStatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] p-5 shadow-[0_20px_60px_rgba(0,0,0,.16)]">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AiCoachCard({ report, loading, error, onRefresh }: { report: AiCoachReport | null; loading: boolean; error: string | null; onRefresh: () => void }) {
  const tone = report?.mood === "protect" ? "border-rose-400/20 bg-rose-400/[.055]" : report?.mood === "push" ? "border-[#d9f96d]/25 bg-[#d9f96d]/[.055]" : "border-white/10 bg-[#1b1b1b]/80";
  return (
    <section className={`overflow-hidden rounded-[24px] border ${tone}`}>
      <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-start sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/20 text-[#d9f96d]"><BrainCircuit size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black">{report?.title || "AI Trade Coach"}</h3>
            {report ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#8a8a8a]">{report.generatedBy}</span> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">{loading ? "Analyzing your execution, risk and discipline..." : error || report?.summary || "Premium AI coach reads your journal and turns trades into concrete next actions."}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="border-[#2a2a2a] bg-transparent">
          {loading ? <LoaderCircle className="animate-spin" size={15} /> : <Zap size={15} />} Refresh
        </Button>
      </div>
      {report ? (
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[220px_1fr_1fr]">
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8a8a8a]">Coach score</p>
            <p className="mt-2 font-mono text-4xl font-black text-white">{Math.round(report.score)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#d9f96d]" style={{ width: `${Math.max(0, Math.min(100, report.score))}%` }} /></div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8a8a8a]">Risk warnings</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-[#d4d4d8]">{(report.riskWarnings.length ? report.riskWarnings : ["No critical risk warning yet."]).map((item) => <li key={item}>- {item}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8a8a8a]">Next actions</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-[#d4d4d8]">{report.nextSteps.map((item) => <li key={item}>- {item}</li>)}</ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// Workspace.
function Workspace(p: {
  account: PropAccount; stats: { pnl: number; wins: number; losses: number; rate: number; r: number; pf: number };
  equity: Array<{ trade: number; equity: number; label: string }>; setups: Array<{ name: string; pnl: number; trades: number; wins: number; rate: number }>;
  mistakes: Array<{ name: string; pnl: number; trades: number }>; planRate: number; monthCount: number;
  calendar: Array<{ day: number; trades: JournalEntry[]; pnl: number } | null>;
  trades: JournalEntry[]; bibleTrades: JournalEntry[]; query: string; month: Date; deleting: boolean; saving: boolean; tradeRange: TradeRange; customStart: string; customEnd: string;
  onRange: (value: TradeRange) => void; onCustomStart: (value: string) => void; onCustomEnd: (value: string) => void;
  onQuery: (v: string) => void; onBack: () => void; onTrade: () => void; onDelete: () => void;
  onCsv: () => void; onPrev: () => void; onNext: () => void; onToday: () => void;
  onUpdateTrade: (id: string, form: FormData) => Promise<void>;
  onRemoveTrade: (id: string) => Promise<void>;
  onMt5Synced: () => Promise<void>;
}) {
  const { account, stats, equity, setups, mistakes, planRate, monthCount, calendar, trades, bibleTrades, month } = p;
  const [selectedTrade, setSelectedTrade] = useState<JournalEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; trades: JournalEntry[]; pnl: number } | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [coachReport, setCoachReport] = useState<AiCoachReport | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [positionsPendingSetup, setPositionsPendingSetup] = useState(false);
  const currentPnl = (equity.at(-1)?.equity ?? account.initialBalance) - account.initialBalance;
  const currentEquity = account.initialBalance + currentPnl;
  const targetProgress = account.profitTarget ? Math.min(100, Math.max(0, currentPnl / account.profitTarget * 100)) : 0;
  const drawdownUsed = account.maxDrawdown && currentPnl < 0 ? Math.min(100, Math.abs(currentPnl) / account.maxDrawdown * 100) : 0;

  const loadCoach = useCallback(async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const response = await apiRequest<{ report: AiCoachReport }>(`/api/ai/trade-report?accountId=${encodeURIComponent(account.id)}`);
      setCoachReport(response.report);
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : "AI coach failed to load.");
    } finally {
      setCoachLoading(false);
    }
  }, [account.id]);

  const loadOpenPositions = useCallback(async () => {
    try {
      const response = await apiRequest<{ positions: OpenPosition[]; pendingSetup?: boolean }>(`/api/prop-accounts/${account.id}/mt5/positions`);
      setOpenPositions(response.positions || []);
      setPositionsPendingSetup(Boolean(response.pendingSetup));
    } catch {
      setOpenPositions([]);
      setPositionsPendingSetup(false);
    }
  }, [account.id]);

  useEffect(() => {
    if (activeTab !== "overview") return;
    void loadCoach();
    void loadOpenPositions();
  }, [activeTab, loadCoach, loadOpenPositions, trades.length]);

  return (
    <div className="animate-page-in mx-auto max-w-[1700px]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex min-w-0 items-center gap-2 border-b border-[#2a2a2a] bg-[#0e0e0e]/90 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3 lg:gap-3 lg:px-6">
        <Button variant="ghost" size="icon" onClick={p.onBack} className="shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <PropFirmLogo firm={account.firm} compact />
        <div className="min-w-0">
          <h1 className="truncate text-base font-black lg:text-lg">{account.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8a8a8a]">
            <span>{account.phase}</span>
            <span>/</span>
            <span>{cash.format(account.accountSize)}</span>
            <PlatformLogoBadge platform={account.platform} compact className="ml-1" />
          </div>
        </div>
        <span className={`ml-1 hidden rounded-lg border px-2 py-0.5 text-[11px] font-semibold md:block ${account.status === "Active" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400" : "border-[#2a2a2a] text-[#8a8a8a]"}`}>
          {account.status}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button variant="outline" className="hidden border-[#2a2a2a] bg-transparent sm:flex" onClick={p.onCsv}>
            <Download size={15} /> CSV
          </Button>
          <Button variant="outline" size="icon" className="border-[#2a2a2a] bg-transparent text-rose-400 hover:bg-rose-500/10" disabled={p.deleting} onClick={p.onDelete}>
            {p.deleting ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
          </Button>
          <Button onClick={p.onTrade} className="bg-white text-black hover:bg-zinc-200">
            <Plus size={16} />
            <span className="hidden sm:inline">Add trade</span>
          </Button>
        </div>
      </header>

      <div className="space-y-3 p-3 sm:p-4 lg:space-y-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
          {[
            { title: "Monthly P&L", value: `${stats.pnl >= 0 ? "+" : ""}${cash.format(stats.pnl)}`, icon: stats.pnl >= 0 ? TrendingUp : TrendingDown, color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
            { title: "Win rate", value: `${stats.rate}%`, icon: Target, color: "text-zinc-300" },
            { title: "Average R", value: `${stats.r.toFixed(2)}R`, icon: BarChart3, color: "text-zinc-300" },
            { title: "Profit factor", value: stats.pf.toFixed(2), icon: TrendingUp, color: "text-amber-400" },
            { title: "Wins / Losses", value: `${stats.wins} / ${stats.losses}`, icon: CalendarDays, color: "text-[#f1f1f1]" },
          ].map((s, index) => (
            <Card key={s.title} size="sm" className={`gap-0 py-0 ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
              <CardContent className="flex min-h-18 items-center gap-2 p-3 sm:min-h-20 sm:gap-3 sm:p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted sm:size-10">
                  <s.icon size={18} className={s.color} />
                </span>
                <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#8a8a8a]">{s.title}</p>
                  <p className={`truncate font-mono text-base font-black sm:text-xl ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="gap-4">
          <div className="block md:hidden">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">View</span>
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {WORKSPACE_TABS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden min-h-14 w-full justify-start overflow-x-auto rounded-2xl border border-white/10 bg-white/[.035] p-1.5 md:inline-flex">
            {WORKSPACE_TABS.map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="h-11 min-w-[132px] flex-1 rounded-xl px-5 text-sm font-semibold text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm">{l}</TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,249,109,.14),transparent_18%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] shadow-[0_28px_80px_rgba(0,0,0,.34)]">
              <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-5 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <h3 className="text-base font-black">Account balance</h3>
                  <p className="mt-1 text-xs text-zinc-500">{account.name} equity curve and closed-trade performance.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:ml-auto lg:min-w-[560px]">
                  <BalanceMetric label="Current P&L" value={`${currentPnl >= 0 ? "+" : ""}${cash.format(currentPnl)}`} tone={currentPnl >= 0 ? "good" : "bad"} />
                  <BalanceMetric label="Equity" value={cash.format(currentEquity)} />
                  <BalanceMetric label="Closed Balance" value={cash.format(currentEquity)} />
                </div>
              </div>
              <div className="h-[250px] px-1 pb-3 pt-2 sm:h-[390px] sm:px-4 sm:pb-4 sm:pt-3">
                {equity.length > 1
                  ? <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equity} margin={{ left: 8, right: 14, top: 16, bottom: 4 }}>
                        <defs>
                          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d9f96d" stopOpacity={0.42} />
                            <stop offset="42%" stopColor="#a1a1aa" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#171717" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                        <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#707b91" }} />
                        <YAxis width={72} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`} tick={{ fontSize: 11, fill: "#707b91" }} domain={["dataMin - 100", "dataMax + 100"]} />
                        <Tooltip formatter={v => cash.format(Number(v))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#171717", border: "1px solid #333333", borderRadius: 12, color: "#f1f1f1" }} />
                        <Area type="monotone" dataKey="equity" stroke="#d9f96d" fill="url(#balanceFill)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#d9f96d", stroke: "#171717", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  : <Empty text="Add trades to build the balance chart." />
                }
              </div>
            </section>

            <AiCoachCard report={coachReport} loading={coachLoading} error={coachError} onRefresh={() => void loadCoach()} />

            <div className="grid gap-4 lg:grid-cols-[1.25fr_.85fr_.85fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <h3 className="font-bold">Challenge limits</h3>
                <div className="mt-4 space-y-5">
                  <ProgressBar label="Profit target" value={targetProgress} color="bg-[#d9f96d]" />
                  <ProgressBar label="Max drawdown" value={drawdownUsed} color="bg-rose-500" />
                </div>
              </div>
              <MiniStat label="DAILY LIMIT" value={cash.format(account.dailyDrawdown)} />
              <MiniStat label="START BALANCE" value={cash.format(account.initialBalance)} />
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Live positions</h3>
                  <p className="mt-1 text-xs text-[#8a8a8a]">Open MT5 trades tracked by auto sync.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-400">
                  {openPositions.length} open
                </span>
              </div>
              {openPositions.length ? (
                <div className="mt-4 grid gap-2">
                  {openPositions.slice(0, 4).map((position) => {
                    const positive = (position.unrealizedPnl || 0) >= 0;
                    return (
                      <div key={position.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <InstrumentBadge symbol={position.symbol} compact className="bg-[#121212]" />
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${position.side === "long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                              {position.side}
                            </span>
                            <span className="text-[10px] text-zinc-500">{position.volume.toFixed(2)} lots</span>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            Entry {position.entryPrice?.toFixed(2) || "-"} / Now {position.currentPrice?.toFixed(2) || "-"}
                          </p>
                        </div>
                        <div className="text-right">
                          <strong className={`font-mono text-sm font-black ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                            {(position.unrealizedPnl || 0) >= 0 ? "+" : ""}{cash.format(position.unrealizedPnl || 0)}
                          </strong>
                          <p className="mt-1 text-[10px] text-zinc-600">{position.openedAt ? new Date(position.openedAt).toLocaleString("uz-UZ") : "Live"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">
                  {positionsPendingSetup ? "Open positions table is waiting for DB migration." : "No open MT5 positions right now."}
                </p>
              )}
            </section>
          </TabsContent>

          {/* Calendar */}
          <TabsContent value="calendar">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-[#2a2a2a] px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="font-bold capitalize">{month.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })} natijalari</h3>
                  <p className="text-xs text-[#8a8a8a]">Har bir kunning P&L va trade soni</p>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-xl border border-[#2a2a2a] bg-[#121212] p-1 sm:flex sm:gap-2 lg:ml-auto">
                  <Button variant="ghost" size="icon-sm" onClick={p.onPrev}><ChevronLeft size={16} /></Button>
                  <strong className="min-w-0 text-center text-xs capitalize sm:min-w-32 sm:text-sm">{month.toLocaleDateString("uz-UZ", { month: "short", year: "numeric" })}</strong>
                  <Button variant="ghost" size="icon-sm" onClick={p.onNext}><ChevronRight size={16} /></Button>
                  <Button variant="outline" size="sm" onClick={p.onToday} className="col-span-3 w-full border-[#2a2a2a] bg-transparent text-xs sm:w-auto">Joriy oy</Button>
                </div>
              </div>
              {/* Desktop calendar */}
              <div className="hidden p-4 md:block">
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {WEEKDAYS_FULL.map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 content-start gap-1.5 [grid-auto-rows:130px]">
                  {calendar.map((c, i) =>
                    c ? (
                      <button key={`${monthId(month)}-desktop-${i}`} type="button" onClick={() => c.trades.length ? setSelectedDay(c) : null}
                        className={`h-full w-full rounded-xl border p-2.5 text-left transition ${c.trades.length ? c.pnl >= 0 ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/8" : "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/8" : "border-[#2a2a2a] bg-[#121212]/40"} ${c.trades.length ? "cursor-pointer" : "cursor-default"}`}>
                        <div className="flex items-start justify-between">
                          <span className={`grid size-6 place-items-center rounded-md text-[11px] font-bold ${c.trades.length ? "bg-[#2a2a2a] text-[#f1f1f1]" : "text-[#8a8a8a]"}`}>{c.day}</span>
                          {c.trades.length > 0 && (
                            <span className="rounded-md bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] font-medium text-[#8a8a8a]">
                              {c.trades.length}t
                            </span>
                          )}
                        </div>
                        {c.trades.length > 0 ? (
                          <>
                            <p className={`mt-3 font-mono text-sm font-black ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {c.pnl >= 0 ? "+" : ""}{cash.format(c.pnl)}
                            </p>
                            <div className="mt-5 flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Open day</span>
                              <span className="rounded-full border border-white/8 bg-white/[.04] px-2 py-1 text-[10px] font-black text-zinc-300">View trades</span>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {c.trades.filter(t => t.pnl > 0).length > 0 && (
                                <span className="rounded-md bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-400">{c.trades.filter(t => t.pnl > 0).length}W</span>
                              )}
                              {c.trades.filter(t => t.pnl <= 0).length > 0 && (
                                <span className="rounded-md bg-rose-500/15 px-1 py-0.5 text-[9px] font-bold text-rose-400">{c.trades.filter(t => t.pnl <= 0).length}L</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="mt-8 text-center text-[10px] text-[#333333]">-</p>
                        )}
                      </button>
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
                    <div key={d} className="py-1 text-center text-[10px] font-semibold text-[#8a8a8a]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((c, i) =>
                    c ? (
                      <button key={`${monthId(month)}-mobile-${i}`} type="button" onClick={() => c.trades.length ? setSelectedDay(c) : null}
                        className={`flex flex-col items-center rounded-lg p-1 py-1.5 text-center ${c.trades.length ? c.pnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10" : ""} ${c.trades.length ? "cursor-pointer" : "cursor-default"}`}>
                        <span className={`text-[11px] font-bold ${c.trades.length ? "text-[#f1f1f1]" : "text-[#8a8a8a]"}`}>{c.day}</span>
                        {c.trades.length > 0 && (
                          <span className={`mt-0.5 text-[9px] font-black ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {c.pnl >= 0 ? "+" : ""}{Math.abs(c.pnl) >= 1000 ? `${(c.pnl / 1000).toFixed(1)}k` : c.pnl.toFixed(0)}
                          </span>
                        )}
                      </button>
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
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80 overflow-hidden">
              <div className="space-y-3 border-b border-[#2a2a2a] px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold">Trade journal</h3>
                  <p className="text-xs text-[#8a8a8a]">{trades.length} ta trade</p>
                </div>
                <div className="relative sm:ml-auto sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-[#8a8a8a]" size={15} />
                  <Input value={p.query} onChange={e => p.onQuery(e.target.value)} className="border-[#2a2a2a] bg-[#121212] pl-9 text-sm" placeholder="Symbol yoki setup" />
                </div>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
                  <div className="w-full sm:w-56">
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">Period</span>
                    <Select value={p.tradeRange} onValueChange={(value) => p.onRange(value as TradeRange)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" align="start">
                        <SelectItem value="daily">Today</SelectItem>
                        <SelectItem value="monthly">This month</SelectItem>
                        <SelectItem value="quarter">Last 3 months</SelectItem>
                        <SelectItem value="yearly">This year</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {p.tradeRange === "custom" ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:ml-auto lg:w-[420px]">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">From<Input type="date" value={p.customStart} onChange={event => p.onCustomStart(event.target.value)} className="mt-1.5 text-sm" /></label>
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">To<Input type="date" value={p.customEnd} onChange={event => p.onCustomEnd(event.target.value)} className="mt-1.5 text-sm" /></label>
                    </div>
                  ) : (
                    <p className="pb-3 text-xs text-[#8a8a8a] lg:ml-auto">
                      {p.tradeRange === "daily" ? "Bugungi tradelar" : p.tradeRange === "monthly" ? "Joriy oy natijalari" : p.tradeRange === "quarter" ? "Oxirgi uch oy" : "Joriy yil"}
                    </p>
                  )}
                </div>
              </div>
              {trades.length
                ? <div className="divide-y divide-border bg-[#0f0f0f] p-2 sm:p-3">
                    {trades.map(e => {
                      const winning = e.pnl >= 0;
                      return (
                        <div
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTrade(e)}
                          onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") setSelectedTrade(e); }}
                          className="group flex min-h-[68px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:px-4"
                        >
                          <InstrumentBadge symbol={e.symbol} compact className="shrink-0 rounded-xl bg-[#151515]" showFullSymbol={false} />
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <strong className="truncate text-[13px] font-bold text-zinc-100 sm:text-sm">{e.symbol}</strong>
                              <span className="size-1 rounded-full bg-zinc-600" />
                              <span className="truncate text-[10px] text-zinc-500">{e.setup || e.session || e.date}</span>
                            </span>
                            <span className="mt-1 flex items-center gap-1.5">
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${e.side === "Long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                                {e.side === "Long" ? "Buy" : "Sell"}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400">{e.quantity.toFixed(2)} Lots</span>
                              {e.riskPercent ? <span className="hidden text-[10px] text-zinc-600 sm:inline">Risk {e.riskPercent}</span> : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <strong className={`block rounded-md px-2 py-0.5 font-mono text-[11px] font-black sm:text-xs ${winning ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                              {e.pnl >= 0 ? "+" : ""}{cash.format(e.pnl)}
                            </strong>
                            <span className="mt-1 flex items-center justify-end gap-1">
                              <span className={`rounded px-1 py-0.5 text-[8px] font-black ${!winning ? "bg-rose-400/20 text-rose-300" : "bg-white/[.04] text-zinc-600"}`}>SL</span>
                              <span className={`rounded px-1 py-0.5 text-[8px] font-black ${winning ? "bg-emerald-400/20 text-emerald-300" : "bg-white/[.04] text-zinc-600"}`}>TP</span>
                              <span className="font-mono text-[9px] text-zinc-500">{(e.resultR || 0).toFixed(2)}R</span>
                            </span>
                          </span>
                          <ChevronDown className="-rotate-90 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" size={16} />
                        </div>
                      );
                    })}
                  </div>
                : <Empty text="Bu oyda trade yo'q." />
              }
            </div>
          </TabsContent>

          {/* Trading Bible */}
          <TabsContent value="bible">
            <section className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80">
              <div className="flex flex-col gap-3 border-b border-[#2a2a2a] px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="flex items-center gap-2 font-bold"><BookOpen size={17} className="text-zinc-300" /> Trading Bible</h3>
                  <p className="text-xs text-[#8a8a8a]">Eng yaxshi setup va reviewlar playbook sifatida saqlanadi.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
                  <MiniStat label="BIBLE TRADES" value={String(bibleTrades.length)} />
                  <MiniStat label="REVIEWED" value={String(bibleTrades.filter(t => t.reviewCompleted).length)} />
                </div>
              </div>
              {bibleTrades.length ? (
                <div className="grid gap-3 p-3 lg:grid-cols-2">
                  {bibleTrades.map((trade) => (
                    <button key={trade.id} type="button" onClick={() => setSelectedTrade(trade)} className="group overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#121212] text-left transition hover:border-white/20 hover:bg-[#101827]">
                      {trade.imageUrl ? (
                        <div className="h-40 overflow-hidden border-b border-[#2a2a2a] bg-black">
                          <MediaImage src={trade.imageUrl} alt={`${trade.symbol} bible chart`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                        </div>
                      ) : null}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${trade.side === "Long" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{trade.side}</span>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-base font-black text-white">{trade.symbol}</h4>
                            <p className="mt-0.5 truncate text-xs text-[#8a8a8a]">{trade.setup || "No setup"} / {trade.session || "No session"} / {trade.date}</p>
                          </div>
                          <span className="rounded-xl bg-white/[.06] px-2.5 py-1 text-[10px] font-black text-zinc-300">{reviewScore(trade)}/6</span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#d4d4d8]">{trade.note || "Review note yozilmagan."}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {trade.reviewCompleted ? <span className="inline-flex items-center gap-1 rounded-lg bg-white/[.06] px-2 py-1 text-[10px] font-bold text-zinc-300"><CheckCircle2 size={11} /> Reviewed</span> : null}
                          {trade.followingPlan ? <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Plan</span> : <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">Off-plan</span>}
                          {trade.riskPercent ? <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">{trade.riskPercent}</span> : null}
                          {(trade.tags ?? []).slice(0, 3).map(tag => <span key={tag} className="rounded-lg bg-white/[.045] px-2 py-1 text-[10px] text-[#a1a1aa]">{tag}</span>)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-72 place-items-center px-6 text-center">
                  <div>
                    <BookOpen className="mx-auto text-[#454545]" size={38} />
                    <h3 className="mt-4 text-lg font-black">Trading Bible bo'sh</h3>
                    <p className="mt-1 max-w-md text-sm leading-6 text-[#8a8a8a]">Trade review ochib "+ to Trading Bible" ni belgilang. Eng yaxshi setup va saboqlar shu yerda playbook bo'lib yig'iladi.</p>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80 p-5">
              <h3 className="font-bold">Setup performance</h3>
              <div className="mt-4 space-y-4">
                {setups.length
                  ? setups.map(s => (
                      <div key={s.name}>
                        <div className="flex text-sm">
                          <span className="text-[#f1f1f1]">{s.name}</span>
                          <span className={`ml-auto font-mono font-bold ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {s.rate}% / {s.pnl >= 0 ? "+" : ""}{cash.format(s.pnl)}
                          </span>
                        </div>
                        <ProgressBar label={`${s.trades} trades`} value={s.rate} color="bg-zinc-300" />
                      </div>
                    ))
                  : <Empty text="Setup statistikasi yo'q." />
                }
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80 p-5">
              <h3 className="font-bold">Discipline</h3>
              <p className="text-xs text-[#8a8a8a]">Notion: Following plan?</p>
              <div className="mt-4">
                <ProgressBar label={`${monthCount} trade ichidan`} value={planRate} color="bg-emerald-500" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <MiniStat label="PLANGA MOS" value={`${planRate}%`} />
                <MiniStat label="XATOLI TRADE" value={String(mistakes.reduce((s, m) => s + m.trades, 0))} />
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80 p-5 xl:col-span-2">
              <h3 className="font-bold">Outside of Plan</h3>
              <p className="text-xs text-[#8a8a8a]">Eng ko&apos;p uchragan xatolar va ular keltirgan zarar</p>
              <div className="mt-4 space-y-3">
                {mistakes.length
                  ? mistakes.map(m => (
                      <div key={m.name} className="flex items-center justify-between rounded-xl bg-[#121212]/60 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-[11px] text-[#8a8a8a]">{m.trades} marta takrorlandi</p>
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

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]/80 p-5 xl:col-span-2">
              <h3 className="font-bold">Account details</h3>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[
                  ["FIRM", account.firm || "Independent"],
                  ["PHASE", account.phase],
                  ["MARKET", account.marketType],
                  ["PLATFORM", (account.platform || "manual").toUpperCase()],
                  ["START DATE", account.startDate],
                  ["TARGET", cash.format(account.profitTarget)],
                  ["MAX DD", cash.format(account.maxDrawdown)],
                  ["DAILY DD", cash.format(account.dailyDrawdown)],
                ].map(([l, v]) => <MiniStat key={l} label={l} value={v} />)}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <Mt5Settings account={account} onSynced={p.onMt5Synced} />
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
            onDelete={async () => {
              await p.onRemoveTrade(selectedTrade.id);
              setSelectedTrade(null);
            }}
          />
        ) : null}
      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => { if (!open) setSelectedDay(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-hidden border-border bg-background p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-white/8 px-5 py-4 text-left">
            <DialogTitle className="text-white">
              {selectedDay ? new Date(`${monthId(month)}-${String(selectedDay.day).padStart(2, "0")}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Day trades"}
            </DialogTitle>
            <DialogDescription>
              {selectedDay ? `${selectedDay.trades.length} trades / ${selectedDay.pnl >= 0 ? "+" : ""}${cash.format(selectedDay.pnl)}` : "Closed trades for this day"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(90dvh-84px)] overflow-y-auto p-3 sm:p-4">
            {selectedDay?.trades.length ? (
              <div className="space-y-2">
                {selectedDay.trades.map((trade) => {
                  const winning = trade.pnl >= 0;
                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => {
                        setSelectedDay(null);
                        setSelectedTrade(trade);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-3 py-3 text-left transition hover:bg-white/[.05]"
                    >
                      <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 rounded-xl bg-[#151515]" showFullSymbol={false} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <strong className="truncate text-sm font-black text-white">{trade.symbol}</strong>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                            {trade.side === "Long" ? "Buy" : "Sell"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500">{trade.setup || trade.session || trade.note || "Open trade review"}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <strong className={`block font-mono text-sm font-black ${winning ? "text-emerald-300" : "text-rose-300"}`}>
                          {trade.pnl >= 0 ? "+" : ""}{cash.format(trade.pnl)}
                        </strong>
                        <span className="mt-1 block text-[10px] text-zinc-500">{(trade.resultR || 0).toFixed(2)}R</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty text="No trades for this day." />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function TradeEditor({ trade, saving, onClose, onSave, onDelete }: { trade: JournalEntry; saving: boolean; onClose: () => void; onSave: (form: FormData) => Promise<void>; onDelete: () => Promise<void> }) {
  const [imageUrls, setImageUrls] = useState(trade.imageUrls?.length ? trade.imageUrls : trade.imageUrl ? [trade.imageUrl] : []);
  const [previewUrl, setPreviewUrl] = useState("");
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const uploadTradeImages = async (files?: FileList | null) => {
    const selected = Array.from(files ?? []).slice(0, 3 - imageUrls.length);
    if (!selected.length) return;
    setUploadingImages(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/journal/image", { method: "POST", credentials: "same-origin", body: form });
        const payload = (await response.json()) as { imageUrl?: string; error?: string };
        if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Image upload failed.");
        uploaded.push(payload.imageUrl);
      }
      setImageUrls((current) => [...current, ...uploaded].slice(0, 3));
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/70 p-2 pt-[max(.5rem,env(safe-area-inset-top))] pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <form action={onSave} className="relative z-10 flex h-[calc(100dvh-1rem)] max-h-[920px] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-border bg-card text-foreground shadow-2xl shadow-black/80 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-black">{trade.symbol} trade</h3>
            <p className="text-xs text-[#8a8a8a]">Trade review va edit</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-[#8a8a8a] hover:bg-white/[.05] hover:text-white" aria-label="Close">
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">Symbol<Input name="symbol" defaultValue={trade.symbol} className="mt-1" /></label>
            <label className="min-w-0 text-xs text-[#8a8a8a]">
              Side
              <Select name="side" defaultValue={trade.side}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="min-w-0 text-xs text-[#8a8a8a]">Date<Input name="tradedAt" type="date" defaultValue={trade.rawDate} className="mt-1" /></label>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            <label className="min-w-0 text-xs text-[#8a8a8a]">PnL<Input name="pnl" inputMode="decimal" defaultValue={String(trade.pnl)} className="mt-1" /></label>
            <label className="min-w-0 text-xs text-[#8a8a8a]">Quantity<Input name="quantity" inputMode="decimal" defaultValue={String(trade.quantity)} className="mt-1" /></label>
            <label className="col-span-2 min-w-0 text-xs text-[#8a8a8a] sm:col-span-1">Fees<Input name="fees" inputMode="decimal" defaultValue={String(trade.fees)} className="mt-1" /></label>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            <label className="text-xs text-[#8a8a8a]">Risk $<Input name="riskAmount" inputMode="decimal" defaultValue={String(trade.riskAmount ?? 0)} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
            <label className="text-xs text-[#8a8a8a]">RR<Input name="resultR" inputMode="decimal" defaultValue={String(trade.resultR ?? 0)} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
            <label className="col-span-2 text-xs text-[#8a8a8a] sm:col-span-1">Risk %<Input name="riskPercent" defaultValue={trade.riskPercent ?? ""} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            <label className="col-span-2 text-xs text-[#8a8a8a] sm:col-span-1">Setup<Input name="setup" defaultValue={trade.setup ?? ""} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
            <label className="text-xs text-[#8a8a8a]">Session<Input name="session" defaultValue={trade.session ?? ""} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
            <label className="text-xs text-[#8a8a8a]">Tags<Input name="tags" defaultValue={(trade.tags ?? []).join(", ")} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
          </div>
          <Separator />
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8a8a8a]">Chart screenshot</p>
              <span className="text-xs text-zinc-500">{imageUrls.length}/3</span>
            </div>
            <input ref={imageInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadTradeImages(event.target.files)} />
            <input type="hidden" name="imageUrls" value={JSON.stringify(imageUrls)} />
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black"><button type="button" onClick={() => { setPreviewUrl(url); setScreenshotOpen(true); }} className="h-full w-full"><MediaImage src={url} alt={`${trade.symbol} screenshot ${index + 1}`} className="h-full w-full object-cover" /></button><button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-black/75 text-rose-200"><Trash2 size={12} /></button></div>)}
              {imageUrls.length < 3 ? <button type="button" onClick={() => imageInputRef.current?.click()} className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/10 text-zinc-500 hover:bg-white/[.04] hover:text-white">{uploadingImages ? <LoaderCircle className="animate-spin" size={20} /> : <Plus size={22} />}</button> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#121212] p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[#8a8a8a]">Notion review checklist</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="followingPlan" value="true" defaultChecked={trade.followingPlan} /> Following plan?</label>
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="reviewCompleted" value="true" defaultChecked={trade.reviewCompleted} /> Review completed</label>
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="errorMade" value="true" defaultChecked={trade.errorMade} /> Error made?</label>
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm text-foreground"><Checkbox name="toTradingBible" value="true" defaultChecked={trade.toTradingBible} /> Add to Trading Bible</label>
            </div>
            <label className="mt-3 block text-xs text-[#8a8a8a]">Mistake type<Input name="mistakeType" defaultValue={trade.mistakeType ?? ""} className="mt-1 border-[#2a2a2a] bg-[#121212]" /></label>
          </div>
          <label className="block text-xs text-[#8a8a8a]">Review note<Textarea name="note" defaultValue={trade.note} className="mt-1 min-h-28 border-[#2a2a2a] bg-[#121212]" /></label>
          <details className="group overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#121212]">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-bold text-zinc-200 transition hover:bg-white/[.035]">
              <ImageIcon size={17} className="text-zinc-500" />
              Share image
              <span className="ml-auto text-xs font-medium text-zinc-600 group-open:hidden">PNG yaratish</span>
              <ChevronDown className="ml-auto hidden text-zinc-500 group-open:block" size={16} />
            </summary>
            <div className="border-t border-[#2a2a2a] p-3 sm:p-4">
              <TradeReviewImage trade={trade} chartUrls={imageUrls} />
            </div>
          </details>
        </div>
        <footer className="grid shrink-0 grid-cols-3 gap-2 border-t border-border bg-card p-3 sm:flex sm:p-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={saving} variant="destructive">
                <Trash2 size={15} /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tradeni o&apos;chirish</AlertDialogTitle>
                <AlertDialogDescription>
                  {trade.symbol} trade jurnal va analytics hisobidan butunlay o&apos;chadi. Bu amalni qaytarib bo&apos;lmaydi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                  O&apos;chirish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button disabled={saving} className="bg-white text-black hover:bg-zinc-200 sm:ml-auto">{saving ? <LoaderCircle className="animate-spin" size={15} /> : null}<span className="sm:hidden">Save</span><span className="hidden sm:inline">Save changes</span></Button>
        </footer>
      </form>
      <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[min(1100px,calc(100vw-1rem))] overflow-hidden border-border bg-background p-0 sm:max-w-[min(1100px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-border px-4 py-3 pr-14">
            <DialogTitle>{trade.symbol} screenshot</DialogTitle>
            <DialogDescription>Chart screenshotni to&apos;liq o&apos;lchamda ko&apos;rish</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[calc(92dvh-72px)] place-items-center overflow-auto bg-black p-2 sm:p-4">
            {previewUrl ? <MediaImage src={previewUrl} alt={`${trade.symbol} full chart screenshot`} className="max-h-[calc(92dvh-104px)] max-w-full object-contain" /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeReviewImage({ trade, chartUrls }: { trade: JournalEntry; chartUrls: string[] }) {
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    let active = true;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return;

    const winning = trade.pnl >= 0;
    const accent = winning ? "#42d99b" : "#fb7185";
    const date = new Date(`${trade.rawDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const render = (chart: HTMLImageElement | null) => {
      const background = context.createLinearGradient(0, 0, 1080, 1080);
      background.addColorStop(0, "#0b0b0b");
      background.addColorStop(0.55, "#171717");
      background.addColorStop(1, "#232323");
      context.fillStyle = background;
      context.fillRect(0, 0, 1080, 1080);

      if (chart) {
        const scale = Math.max(1080 / chart.width, 1080 / chart.height);
        const width = chart.width * scale;
        const height = chart.height * scale;
        context.globalAlpha = 0.34;
        context.drawImage(chart, (1080 - width) / 2, (1080 - height) / 2, width, height);
        context.globalAlpha = 1;
      } else {
        const candleHeights = [105, 174, 130, 238, 182, 310, 244];
        candleHeights.forEach((height, index) => {
          const x = 710 + index * 45;
          const y = 620 - height;
          context.strokeStyle = "rgba(212,212,216,.22)";
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(x + 12, y - 42);
          context.lineTo(x + 12, y + height + 42);
          context.stroke();
          context.fillStyle = index % 3 === 0 ? "rgba(66,217,155,.28)" : "rgba(212,212,216,.24)";
          context.fillRect(x, y, 24, height);
        });
      }

      const shade = context.createLinearGradient(0, 0, 1080, 0);
      shade.addColorStop(0, "rgba(11,11,11,.98)");
      shade.addColorStop(0.58, "rgba(11,11,11,.9)");
      shade.addColorStop(1, "rgba(11,11,11,.2)");
      context.fillStyle = shade;
      context.fillRect(0, 0, 1080, 1080);

      context.fillStyle = "#ffffff";
      context.font = "900 58px Arial, sans-serif";
      context.fillText("TRADEWAY", 82, 125);
      context.fillStyle = "#75819b";
      context.font = "500 30px Arial, sans-serif";
      context.fillText(date, 82, 245);

      context.fillStyle = "#ffffff";
      context.font = "900 72px Arial, sans-serif";
      context.fillText(trade.symbol, 82, 355);
      context.font = "700 38px Arial, sans-serif";
      context.fillText(trade.side, 82, 440);
      context.fillStyle = "rgba(255,255,255,.28)";
      context.fillRect(225, 400, 3, 50);
      context.fillStyle = accent;
      context.fillText(trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "BE", 260, 440);

      context.font = "900 92px Arial, sans-serif";
      context.fillText(`${(trade.resultR ?? 0).toFixed(2)}R`, 82, 565);
      context.font = "800 32px Arial, sans-serif";
      context.fillText(`${trade.pnl >= 0 ? "+" : ""}${cash.format(trade.pnl)}`, 86, 615);

      context.fillStyle = "rgba(255,255,255,.13)";
      context.fillRect(82, 665, 916, 2);

      const drawMetric = (label: string, value: string, x: number, y: number) => {
        context.fillStyle = "#6f7b94";
        context.font = "600 27px Arial, sans-serif";
        context.fillText(label, x, y);
        context.fillStyle = "#ffffff";
        context.font = "800 39px Arial, sans-serif";
        context.fillText(value, x, y + 58);
      };

      drawMetric("Entry Price", String(trade.entry), 82, 750);
      drawMetric("Exit Price", String(trade.exit), 570, 750);
      drawMetric("Lot Size", String(trade.quantity), 82, 900);
      drawMetric("Risk", trade.riskPercent || cash.format(trade.riskAmount || 0), 330, 900);
      drawMetric("Setup", trade.setup || "Unspecified", 570, 900);

      context.strokeStyle = accent;
      context.lineWidth = 8;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(690, 550);
      context.bezierCurveTo(760, 500, 820, 430, 900, 330);
      context.stroke();
      context.fillStyle = accent;
      context.beginPath();
      context.moveTo(900, 330);
      context.lineTo(846, 350);
      context.lineTo(884, 392);
      context.closePath();
      context.fill();

      try {
        const url = canvas.toDataURL("image/png", 1);
        if (active) setGeneratedUrl(url);
      } catch {
        if (chart) render(null);
      }
    };

    const chartUrl = chartUrls[0] ?? "";
    if (chartUrl) {
      const chart = new Image();
      chart.crossOrigin = "anonymous";
      chart.onload = () => render(chart);
      chart.onerror = () => render(null);
      chart.src = chartUrl;
    } else {
      render(null);
    }

    return () => {
      active = false;
    };
  }, [chartUrls, trade]);

  const download = () => {
    if (!generatedUrl) return;
    const link = document.createElement("a");
    link.href = generatedUrl;
    link.download = `${trade.symbol}-${trade.rawDate}-tradeway.png`;
    link.click();
  };

  return (
    <section className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-xl shadow-black/25">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-sm font-black text-white">Trade review image</p>
          <p className="text-xs text-[#8a8a8a]">1080 x 1080 PNG</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" disabled={!generatedUrl} onClick={download} size="sm" variant="outline" className="border-white/10 bg-white/[.04]">
            <Download size={15} /> PNG
          </Button>
        </div>
      </div>
      {generatedUrl ? (
        <MediaImage src={generatedUrl} alt={`${trade.symbol} TradeWay review image`} className="aspect-square w-full bg-[#0b0b0b] object-contain" />
      ) : (
        <div className="grid aspect-square w-full place-items-center text-[#8a8a8a]">
          <LoaderCircle className="animate-spin" size={24} />
        </div>
      )}
    </section>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex text-xs">
        <span className="text-[#8a8a8a]">{label}</span>
        <b className="ml-auto text-[#f1f1f1]">{value.toFixed(0)}%</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#242424]">
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
    <div className="rounded-xl bg-[#121212]/60 p-3 text-center">
      <b className="block truncate font-mono text-sm">{value}</b>
      <small className="text-[9px] font-semibold uppercase tracking-wider text-[#8a8a8a]">{label}</small>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-[#8a8a8a]">{text}</div>;
}
