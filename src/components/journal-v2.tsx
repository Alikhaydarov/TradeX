"use client";

import {
  ArrowLeft, BarChart3, BookOpen, BrainCircuit, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Download, ImageIcon, LoaderCircle, MoreHorizontal, Plus, Search, ShieldCheck,
  Target, Trash2, TrendingDown, TrendingUp, WalletCards, X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
import { Tabs, TabsContent } from "./ui/tabs";
import { useActiveAccountStore } from "./active-account-context";
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
type CalendarNewsEvent = {
  id: string;
  title: string;
  currency: string;
  impact: "High" | "Medium" | "Low";
  time: string;
  day: string;
  forecast: string;
  previous: string;
  timestamp: string;
};
type CalendarNewsResponse = {
  events: CalendarNewsEvent[];
  source: string;
  timezone?: string;
  updatedAt?: string;
  error?: string;
};

const cash = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WORKSPACE_TABS = [["home", "Home"], ["overview", "Dashboard"], ["calendar", "Calendar"], ["trades", "Trades"], ["bible", "Bible"], ["analytics", "Analytics"], ["settings", "Settings"]] as const;
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
const groupCalendarNewsByDay = (events: CalendarNewsEvent[]) =>
  events.reduce<Record<string, CalendarNewsEvent[]>>((grouped, event) => {
    grouped[event.day] = grouped[event.day] || [];
    grouped[event.day].push(event);
    return grouped;
  }, {});

function buildWeeklyStrip(account: PropAccount, month: Date, trades: JournalEntry[]) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();
  const anchor = isCurrentMonth ? new Date(now) : new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (anchor.getDay() + 6) % 7;
  anchor.setDate(anchor.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const dayTrades = trades.filter((trade) => trade.rawDate === key);
    const pnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const percent = account.accountSize ? (pnl / account.accountSize) * 100 : 0;
    return {
      key,
      label: day.toLocaleDateString("en-US", { weekday: "short", day: "2-digit" }),
      trades: dayTrades.length,
      pnl,
      percent,
    };
  });
}

export function JournalV2({
  onLogin,
  mode = "accounts",
  forcedTab,
}: {
  onLogin: () => void;
  mode?: "accounts" | "workspace";
  forcedTab?: WorkspaceTab;
}) {
  const { user } = useAuth();
  const { accounts, activeAccountId, setActiveAccount, addAccount, refreshAccounts, loading: accountsLoading } = useActiveAccountStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
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
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    if (mode === "workspace" && accountsLoading && !accounts.length) {
      setLoading(true);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!accounts.length) await refreshAccounts();
        const search = mode === "workspace" && activeAccountId
          ? `?accountId=${encodeURIComponent(activeAccountId)}`
          : "";
        const response = await apiRequest<{ entries: EntryRow[] }>(`/api/journal${search}`);
        if (!active) return;
        setEntries(response.entries.map(entryFrom));
      } catch (nextError) {
        if (!active) return;
        const message = nextError instanceof Error ? nextError.message : "Failed to load journal.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [accounts.length, accountsLoading, activeAccountId, mode, refreshAccounts, user]);

  const account = accounts.find(a => a.id === activeAccountId) || null;
  const accountEntries = useMemo(() => {
    if (mode === "workspace") return entries;
    return activeAccountId ? entries.filter(e => e.propAccountId === activeAccountId) : entries;
  }, [entries, activeAccountId, mode]);
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

  async function createAccount(form: FormData) {
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
      addAccount(next);
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
      await refreshAccounts();
      if (activeAccountId === a.id) setActiveAccount(null);
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

  const embedded = mode === "workspace";

  return (
    <div className={embedded ? "min-h-0" : "min-h-full"}>
      {error && (
        <div className={`${embedded ? "mb-4" : "mx-4 mt-4"} flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300`}>
          <X size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {mode === "workspace" ? (
        account ? <Workspace embedded forcedTab={forcedTab} account={account} accounts={accounts} stats={stats} equity={equity} setups={setups} mistakes={mistakes} planRate={planRate} monthCount={monthEntries.length} calendar={calendar} trades={shown} bibleTrades={bibleEntries} query={query} month={month} deleting={deleting === account.id} saving={saving} tradeRange={tradeRange} customStart={customStart} customEnd={customEnd} onRange={setTradeRange} onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} onQuery={setQuery} onBack={() => setActiveAccount(null)} onAccountChange={setActiveAccount} onTrade={() => setTradeOpen(true)} onDelete={() => removeAccount(account)} onCsv={exportCsv} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onToday={() => setMonth(new Date())} onUpdateTrade={updateTrade} onRemoveTrade={removeTrade} onMt5Synced={reloadJournal} />
        : (
          <div className="rounded-[1.5rem] border border-white/8 bg-[#0b0b0b] p-5 shadow-[0_18px_46px_rgba(0,0,0,.22)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
                <h3 className="mt-2 text-xl font-black text-white">Select an account to load dashboard, calendar, trades and analytics.</h3>
                <p className="mt-1 text-sm text-zinc-500">Home keeps the feed at the top, and your account workspace opens right under it.</p>
              </div>
              <Button type="button" className="h-11 rounded-2xl bg-white px-4 text-black hover:bg-zinc-200" onClick={() => { window.history.pushState(null, "", "/accounts"); window.dispatchEvent(new Event("popstate")); }}>
                Open accounts
              </Button>
            </div>
          </div>
        )
      ) : (
        <Accounts activeAccountId={activeAccountId} summaries={summaries} deleting={deleting} onAdd={() => setAccountOpen(true)} onOpen={(id) => { setActiveAccount(id); window.history.pushState(null, "", "/dashboard"); window.dispatchEvent(new Event("popstate")); }} onDelete={removeAccount} />
      )}
      <PropAccountDialog open={accountOpen} saving={saving} onOpenChange={setAccountOpen} onSave={createAccount} />
      <TradeReviewModal open={tradeOpen} saving={saving} account={account} onOpenChange={setTradeOpen} onSave={addTrade} />
    </div>
  );
}

// Accounts list.
function Accounts({ activeAccountId, summaries, deleting, onAdd, onOpen, onDelete }: { activeAccountId: string | null; summaries: Summary[]; deleting: string | null; onAdd: () => void; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void }) {
  return (
    <div className="animate-page-in mx-auto max-w-[1880px] space-y-5 p-4 lg:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Workspace / Accounts</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Select account</h1>
          <p className="mt-1 text-sm text-zinc-500">Choose one card and we load its dashboard, calendar, trades and analytics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Button onClick={onAdd} className="h-11 rounded-2xl bg-white px-4 text-black hover:bg-zinc-200">
            <Plus size={16} /> Add Account
          </Button>
        </div>
      </div>

      {!summaries.length ? (
        <div className="grid min-h-72 place-items-center rounded-[26px] border border-dashed border-white/10 bg-[#17181b] text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[.06]">
              <WalletCards size={24} className="text-zinc-300" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">Add your first trading account</h2>
            <p className="mt-1 text-sm text-zinc-500">Create a manual account, connect MT5 or bring in your futures workflow.</p>
            <Button onClick={onAdd} className="mt-5 rounded-2xl bg-white text-black hover:bg-zinc-200">
              <Plus size={16} /> Create account
            </Button>
          </div>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {summaries.map((summary) => (
            <AccountCard key={summary.account.id} active={activeAccountId === summary.account.id} s={summary} deleting={deleting} onOpen={onOpen} onDelete={onDelete} />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="group grid min-h-[228px] place-items-center rounded-[24px] border border-dashed border-white/10 bg-[#0b0b0b] text-center transition hover:border-white/20 hover:bg-white/[.03]"
          >
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-black/20 text-zinc-400 transition group-hover:text-white">
                <Plus size={24} />
              </span>
              <p className="mt-4 text-xl font-black text-white">Add Account</p>
              <p className="mt-1 text-sm text-zinc-500">Create prop or real account.</p>
            </div>
          </button>
        </section>
      )}
    </div>
  );
}

function AccountCard({ active = false, s, deleting, onOpen, onDelete, compact = false }: { active?: boolean; s: Summary; deleting: string | null; onOpen: (id: string) => void; onDelete: (a: PropAccount) => void; compact?: boolean }) {
  const statusColor: Record<string, string> = { Processing: "text-sky-300 bg-sky-400/10 border-sky-400/20", Active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", Passed: "text-zinc-300 bg-white/[.06] border-white/15", Failed: "text-rose-400 bg-rose-400/10 border-rose-400/20", Paused: "text-amber-400 bg-amber-400/10 border-amber-400/20" };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(s.account.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpen(s.account.id); }}
      className={`prop-card-glow group relative cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${active ? "border-white/20 bg-white/[.05] ring-1 ring-white/10" : "border-white/10 bg-white/[.035] hover:border-white/20"} ${compact ? "rounded-[22px]" : "rounded-[24px]"}`}
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
        <div className={`${compact ? "mt-3" : "mt-3.5"} flex items-end justify-between`}>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a8a8a]">Result</p>
            <p className={`font-mono ${compact ? "text-xl" : "text-[1.7rem]"} font-black ${s.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
        <div className={`${compact ? "mt-3" : "mt-3.5"} space-y-2.5`}>
          <ProgressBar label="Profit target" value={s.target} color="bg-emerald-500" />
          <ProgressBar label="Drawdown used" value={s.dd} color="bg-rose-500" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#2a2a2a] px-4 py-3">
        <span className="text-xs text-[#8a8a8a]">{active ? "Selected workspace" : "Open workspace"}</span>
        <ChevronRight size={16} className="text-[#8a8a8a] transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
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
  embedded?: boolean;
  forcedTab?: WorkspaceTab;
  account: PropAccount; accounts: PropAccount[]; stats: { pnl: number; wins: number; losses: number; rate: number; r: number; pf: number };
  equity: Array<{ trade: number; equity: number; label: string }>; setups: Array<{ name: string; pnl: number; trades: number; wins: number; rate: number }>;
  mistakes: Array<{ name: string; pnl: number; trades: number }>; planRate: number; monthCount: number;
  calendar: Array<{ day: number; trades: JournalEntry[]; pnl: number } | null>;
  trades: JournalEntry[]; bibleTrades: JournalEntry[]; query: string; month: Date; deleting: boolean; saving: boolean; tradeRange: TradeRange; customStart: string; customEnd: string;
  onRange: (value: TradeRange) => void; onCustomStart: (value: string) => void; onCustomEnd: (value: string) => void;
  onQuery: (v: string) => void; onBack: () => void; onAccountChange: (id: string) => void; onTrade: () => void; onDelete: () => void;
  onCsv: () => void; onPrev: () => void; onNext: () => void; onToday: () => void;
  onUpdateTrade: (id: string, form: FormData) => Promise<void>;
  onRemoveTrade: (id: string) => Promise<void>;
  onMt5Synced: () => Promise<void>;
}) {
  const { account, accounts, stats, equity, setups, mistakes, planRate, monthCount, calendar, trades, bibleTrades, month, embedded = false, forcedTab } = p;
  const [selectedTrade, setSelectedTrade] = useState<JournalEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; trades: JournalEntry[]; pnl: number } | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("home");
  const [coachReport, setCoachReport] = useState<AiCoachReport | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [positionsPendingSetup, setPositionsPendingSetup] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"journal" | "news">("journal");
  const [analyticsView, setAnalyticsView] = useState<"overview" | "strategy" | "symbols">("overview");
  const [calendarNews, setCalendarNews] = useState<CalendarNewsResponse | null>(null);
  const [calendarNewsLoading, setCalendarNewsLoading] = useState(false);
  const currentPnl = (equity.at(-1)?.equity ?? account.initialBalance) - account.initialBalance;
  const currentEquity = account.initialBalance + currentPnl;
  const targetProgress = account.profitTarget ? Math.min(100, Math.max(0, currentPnl / account.profitTarget * 100)) : 0;
  const drawdownUsed = account.maxDrawdown && currentPnl < 0 ? Math.min(100, Math.abs(currentPnl) / account.maxDrawdown * 100) : 0;
  const sortedTrades = useMemo(
    () => [...trades].sort((left, right) => String(right.rawDate).localeCompare(String(left.rawDate))),
    [trades]
  );
  const weeklyStrip = useMemo(() => buildWeeklyStrip(account, month, trades), [account, month, trades]);
  const symbolStats = useMemo(
    () =>
      [...trades.reduce((map, trade) => {
        const current = map.get(trade.symbol) || { symbol: trade.symbol, trades: 0, pnl: 0, wins: 0 };
        current.trades += 1;
        current.pnl += trade.pnl;
        current.wins += trade.pnl > 0 ? 1 : 0;
        map.set(trade.symbol, current);
        return map;
      }, new Map<string, { symbol: string; trades: number; pnl: number; wins: number }>()).values()].sort((left, right) => right.trades - left.trades),
    [trades]
  );
  const recentTrades = sortedTrades.slice(0, 5);
  const groupedNews = useMemo(() => groupCalendarNewsByDay(calendarNews?.events || []), [calendarNews?.events]);
  const averageWin = useMemo(() => {
    const wins = trades.filter((trade) => trade.pnl > 0);
    return wins.length ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length : 0;
  }, [trades]);
  const averageLoss = useMemo(() => {
    const losses = trades.filter((trade) => trade.pnl < 0);
    return losses.length ? losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length : 0;
  }, [trades]);
  const bestTrade = useMemo(() => [...trades].sort((left, right) => right.pnl - left.pnl)[0] || null, [trades]);
  const worstTrade = useMemo(() => [...trades].sort((left, right) => left.pnl - right.pnl)[0] || null, [trades]);
  const scoreRadar = useMemo(() => {
    const pfScore = Math.max(0, Math.min(100, stats.pf * 25));
    const rrScore = Math.max(0, Math.min(100, (stats.r + 2) * 20));
    const recoveryScore = Math.max(0, Math.min(100, currentPnl >= 0 ? 85 + Math.min(15, stats.rate / 10) : 50 - drawdownUsed / 3));
    return [
      { subject: "Winrate", value: stats.rate, fullMark: 100 },
      { subject: "Discipline", value: planRate, fullMark: 100 },
      { subject: "Recovery", value: recoveryScore, fullMark: 100 },
      { subject: "Profit", value: pfScore, fullMark: 100 },
      { subject: "RR", value: rrScore, fullMark: 100 },
    ];
  }, [currentPnl, drawdownUsed, planRate, stats.pf, stats.r, stats.rate]);
  const profitabilityScore = useMemo(() => Math.round(scoreRadar.reduce((sum, item) => sum + item.value, 0) / scoreRadar.length), [scoreRadar]);

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
    if (!forcedTab) return;
    setActiveTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    const handleSidebarTab = (event: Event) => {
      const nextTab = (event as CustomEvent<{ tab?: WorkspaceTab }>).detail?.tab;
      if (nextTab && WORKSPACE_TABS.some(([value]) => value === nextTab)) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener("tradeway:journal-tab", handleSidebarTab as EventListener);
    window.addEventListener("tradeway:home-tab", handleSidebarTab as EventListener);
    return () => {
      window.removeEventListener("tradeway:journal-tab", handleSidebarTab as EventListener);
      window.removeEventListener("tradeway:home-tab", handleSidebarTab as EventListener);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "overview") return;
    void loadCoach();
    void loadOpenPositions();
  }, [activeTab, loadCoach, loadOpenPositions, trades.length]);

  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "overview" && activeTab !== "calendar") return;
    let active = true;
    const controller = new AbortController();
    setCalendarNewsLoading(true);
    fetch("/api/economic-calendar", { signal: controller.signal })
      .then((response) => response.json() as Promise<CalendarNewsResponse>)
      .then((payload) => {
        if (active) setCalendarNews(payload);
      })
      .catch(() => {
        if (active) setCalendarNews({ events: [], source: "Forex Factory", error: "Calendar unavailable." });
      })
      .finally(() => {
        if (active) setCalendarNewsLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab]);

  return (
    <div className="animate-page-in mx-auto max-w-[1780px]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 hidden min-w-0 items-center gap-3 border-b border-white/6 bg-[#0b0b0b]/96 px-6 py-3 lg:flex">
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
        <div className="hidden min-w-[220px] xl:block">
          <Select value={account.id} onValueChange={p.onAccountChange}>
            <SelectTrigger className="h-10 rounded-xl border-white/10 bg-white/[.04]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div className="space-y-3 p-3 sm:p-4 lg:space-y-4 lg:p-5">
        {!embedded ? (
          <div className="w-full sm:w-[320px]">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8a]">Account</span>
            <Select value={account.id} onValueChange={p.onAccountChange}>
              <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/[.04]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

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
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/18 sm:size-10">
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

        {/* Section content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="gap-4">
          <TabsContent value="home" className="space-y-4">
            <section className="rounded-[1.35rem] border border-white/8 bg-[#0b0b0b] p-4 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Selected account</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <PropFirmLogo firm={account.firm} compact />
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black text-white">{account.name}</h2>
                      <p className="mt-1 text-sm text-zinc-500">{account.accountType === "real" ? "Real account" : "Prop account"} / {account.marketType} / {account.phase}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${account.status === "Active" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[.04] text-zinc-300"}`}>
                      {account.status}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <QuickMetric label="Balance" value={cash.format(account.accountSize)} note="Everything below follows this account" />
                    <QuickMetric label="Trades" value={String(trades.length)} note={`${stats.wins} wins / ${stats.losses} losses`} />
                    <QuickMetric label="Net P&L" value={`${currentPnl >= 0 ? "+" : ""}${cash.format(currentPnl)}`} note={`${stats.rate}% win rate`} tone={currentPnl >= 0 ? "good" : "bad"} />
                  </div>
                </div>
                <div className="grid w-full gap-3 xl:w-[360px]">
                  <button type="button" onClick={p.onTrade} className="rounded-[1.1rem] border border-white/10 bg-white px-4 py-3 text-left text-sm font-black text-black transition hover:bg-zinc-200">
                    Add trade
                  </button>
                  <button type="button" onClick={() => window.dispatchEvent(new Event("tradeway:share-trade"))} className="rounded-[1.1rem] border border-white/10 bg-white/[.04] px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/[.08]">
                    Share trade from this account
                  </button>
                  <div className="rounded-[1.1rem] border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Flow</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">Change the account at the top and Home, Dashboard, Calendar, Trades and Analytics all switch to that account instantly.</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
              <section className="rounded-[1.3rem] border border-white/8 bg-[#0b0b0b] p-4 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white">Share-ready trades</h3>
                    <p className="mt-1 text-sm text-zinc-500">Open a trade or send your best setup to Home from this account.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="border-white/10 bg-black/15" onClick={() => setActiveTab("trades")}>
                    Open log
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {recentTrades.length ? recentTrades.map((trade) => (
                    <button key={trade.id} type="button" onClick={() => setSelectedTrade(trade)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-left transition hover:bg-white/[.04]">
                      <InstrumentBadge symbol={trade.symbol} compact className="bg-[#121212]" showFullSymbol={false} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="truncate text-sm text-white">{trade.symbol}</strong>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{trade.side === "Long" ? "Buy" : "Sell"}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500">{trade.setup || trade.session || trade.rawDate}</p>
                      </div>
                      <strong className={`font-mono text-sm font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{trade.pnl >= 0 ? "+" : ""}{cash.format(trade.pnl)}</strong>
                    </button>
                  )) : <div className="grid min-h-40 place-items-center rounded-2xl border border-white/8 bg-black/15 text-center text-sm text-zinc-500">No trades in this account yet.</div>}
                </div>
              </section>

              <div className="grid gap-4">
                <AiCoachCard report={coachReport} loading={coachLoading} error={coachError} onRefresh={loadCoach} />
                <section className="rounded-[1.3rem] border border-white/8 bg-[#0b0b0b] p-4 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-white">High Impact News</h3>
                      <p className="mt-1 text-sm text-zinc-500">Weekly red news in New York time.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {calendarNewsLoading && !calendarNews ? <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-4 text-sm text-zinc-500">Loading news...</div> : null}
                    {!calendarNewsLoading && (calendarNews?.events || []).length === 0 ? <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-4 text-sm text-zinc-500">No high impact news loaded yet.</div> : null}
                    {(calendarNews?.events || []).slice(0, 4).map((event) => (
                      <div key={event.id} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-14 shrink-0 font-mono text-[11px] font-bold text-zinc-200">{event.time}</span>
                          <span className="rounded-md bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-black text-rose-200">{event.currency}</span>
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-300">{event.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </TabsContent>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3">
            <section className="rounded-[1.2rem] border border-white/8 bg-[#0b0b0b] p-3 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {account.name} <span className="mx-1 text-zinc-700">&gt;</span> Dashboard
                  </p>
                  <h3 className="mt-1 text-base font-black tracking-tight text-white sm:text-lg">
                    Trading overview
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] gap-2 sm:flex sm:items-center lg:ml-auto">
                  <button type="button" className="grid size-9 place-items-center rounded-xl border border-white/8 bg-black/20 text-zinc-300">
                    <ChevronLeft size={15} />
                  </button>
                  <div className="grid h-9 place-items-center rounded-xl border border-white/8 bg-black/20 px-3 text-xs font-semibold text-white">Current Week</div>
                  <button type="button" className="grid size-9 place-items-center rounded-xl border border-white/8 bg-black/20 text-zinc-300">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-7">
                {weeklyStrip.map((day) => (
                  <div key={day.key} className="rounded-[0.95rem] border border-white/8 bg-black/18 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white sm:text-sm">{day.label}</span>
                      <span className={`text-xs font-black sm:text-sm ${day.percent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{day.percent >= 0 ? "+" : ""}{day.percent.toFixed(1)}%</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-zinc-500">{day.trades} trade{day.trades === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)_minmax(300px,.85fr)]">
              <section className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-[#0b0b0b] shadow-[0_18px_46px_rgba(0,0,0,.2)] xl:col-span-2">
                <div className="flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:px-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white sm:text-base">Account Balance</h3>
                    <p className="mt-1 text-xs text-zinc-500">{account.name} equity curve across closed trades.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:ml-auto lg:min-w-[520px]">
                    <BalanceMetric label="Current P&L" value={`${currentPnl >= 0 ? "+" : ""}${cash.format(currentPnl)}`} tone={currentPnl >= 0 ? "good" : "bad"} />
                    <BalanceMetric label="Equity" value={cash.format(currentEquity)} />
                    <BalanceMetric label="Closed balance" value={cash.format(currentEquity)} />
                  </div>
                </div>
                <div className="h-[240px] px-1 pb-3 pt-2 sm:h-[340px] sm:px-3 sm:pb-3 sm:pt-2.5">
                  {equity.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equity} margin={{ left: 8, right: 14, top: 16, bottom: 4 }}>
                        <defs>
                          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.34} />
                            <stop offset="55%" stopColor="#22c55e" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#171717" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                        <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#707b91" }} />
                        <YAxis width={72} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`} tick={{ fontSize: 11, fill: "#707b91" }} domain={["dataMin - 100", "dataMax + 100"]} />
                        <Tooltip formatter={v => cash.format(Number(v))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#171717", border: "1px solid #333333", borderRadius: 12, color: "#f1f1f1" }} />
                        <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#balanceFill)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#22c55e", stroke: "#171717", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <Empty text="Add trades to build the balance chart." />}
                </div>
              </section>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <MetricPanel title="Most Traded Asset" value={symbolStats[0]?.symbol || "N/A"} note={symbolStats[0] ? `${symbolStats[0].trades} trades` : "No data yet"} />
                  <MetricPanel title="Total Trades" value={String(trades.length)} note={`${stats.wins} winning / ${stats.losses} losing`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <MetricPanel title="Trade Winrate" value={`${stats.rate}%`} note={`${planRate}% discipline score`} accent="good" />
                  <MetricPanel title="Profit Factor" value={stats.pf.toFixed(2)} note={`${stats.pnl >= 0 ? "+" : ""}${cash.format(stats.pnl)} this month`} accent={stats.pf >= 1 ? "good" : "bad"} />
                </div>
                <section className="rounded-[1.05rem] border border-white/8 bg-[#0b0b0b] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white">Challenge Limits</h4>
                      <p className="mt-1 text-xs text-zinc-500">Daily and overall protection.</p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-zinc-400">{account.status}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <ProgressBar label="Profit target" value={targetProgress} color="bg-emerald-500" />
                    <ProgressBar label="Max drawdown used" value={drawdownUsed} color="bg-rose-500" />
                    <div className="grid grid-cols-2 gap-2">
                      <MiniStat label="DAILY LIMIT" value={cash.format(account.dailyDrawdown)} />
                      <MiniStat label="START BALANCE" value={cash.format(account.initialBalance)} />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="rounded-[1.2rem] border border-white/8 bg-[#0b0b0b] p-3 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">Recent Trades</h3>
                    <p className="mt-1 text-xs text-zinc-500">Latest entries registered in this account.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="border-white/10 bg-black/15" onClick={() => setActiveTab("trades")}>
                    See all
                  </Button>
                </div>
                {recentTrades.length ? (
                  <div className="mt-4 space-y-2">
                    {recentTrades.map((trade) => (
                      <button
                        key={trade.id}
                        type="button"
                        onClick={() => setSelectedTrade(trade)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-left transition hover:bg-white/[.04]"
                      >
                        <InstrumentBadge symbol={trade.symbol} compact className="bg-[#121212]" showFullSymbol={false} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="truncate text-sm text-white">{trade.symbol}</strong>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                              {trade.side === "Long" ? "Buy" : "Sell"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-500">{trade.setup || trade.session || trade.rawDate}</p>
                        </div>
                        <strong className={`font-mono text-sm font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{trade.pnl >= 0 ? "+" : ""}{cash.format(trade.pnl)}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 grid min-h-44 place-items-center rounded-2xl border border-white/8 bg-black/15 text-center text-sm text-zinc-500">
                    You don&apos;t have any trades yet. Register a trade to get started.
                  </div>
                )}
              </section>

              <section className="rounded-[1.2rem] border border-white/8 bg-[#0b0b0b] p-3 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">Execution Snapshot</h3>
                    <p className="mt-1 text-xs text-zinc-500">Compact read on risk, consistency and current focus.</p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-black text-zinc-400">
                    {account.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniStat label="PLAN ALIGNMENT" value={`${planRate}%`} />
                  <MiniStat label="ACTIVE SETUPS" value={String(setups.length)} />
                  <MiniStat label="MISTAKE TRADES" value={String(mistakes.reduce((sum, item) => sum + item.trades, 0))} />
                  <MiniStat label="MONTH TRADES" value={String(monthCount)} />
                </div>
                <div className="mt-4 space-y-3">
                  <ProgressBar label="Profit target" value={targetProgress} color="bg-emerald-500" />
                  <ProgressBar label="Drawdown used" value={drawdownUsed} color="bg-rose-500" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Best setup</p>
                    <p className="mt-1 text-sm font-bold text-white">{setups[0]?.name || "No setup data yet"}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {setups[0] ? `${setups[0].trades} trades / ${setups[0].rate}% win rate` : "Tag setups to unlock setup analytics."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Discipline focus</p>
                    <p className="mt-1 text-sm font-bold text-white">{mistakes[0]?.name || "Clean execution streak"}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {mistakes[0] ? `${mistakes[0].trades} repeats / ${cash.format(mistakes[0].pnl)}` : "No repeated mistake patterns this month."}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-[1.2rem] border border-white/8 bg-[#0b0b0b] p-3 shadow-[0_18px_46px_rgba(0,0,0,.2)] sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white">Live Positions</h3>
                  <p className="mt-1 text-xs text-zinc-500">Open MT5 trades tracked by auto sync.</p>
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
                          <p className="mt-1 text-[10px] text-zinc-600">{position.openedAt ? new Date(position.openedAt).toLocaleString("en-US") : "Live"}</p>
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

            <AiCoachCard report={coachReport} loading={coachLoading} error={coachError} onRefresh={() => void loadCoach()} />
          </TabsContent>

          {/* Calendar */}
          <TabsContent value="calendar">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="inline-flex rounded-2xl border border-white/8 bg-[#17181b] p-1">
                  <button type="button" onClick={() => setCalendarMode("journal")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${calendarMode === "journal" ? "bg-white text-black" : "text-zinc-400"}`}>Journal</button>
                  <button type="button" onClick={() => setCalendarMode("news")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${calendarMode === "news" ? "bg-white text-black" : "text-zinc-400"}`}>Economic Calendar</button>
                </div>
              </div>

              {calendarMode === "news" ? (
                <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-5 shadow-[0_18px_46px_rgba(0,0,0,.2)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-white">Red News Window</h3>
                      <p className="mt-1 text-sm text-zinc-500">Weekly high impact events in New York time from Forex Factory.</p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-400">NY time</span>
                  </div>
                  <div className="mt-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {calendarNewsLoading && !calendarNews ? (
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm text-zinc-500">Loading calendar...</div>
                    ) : null}
                    {!calendarNewsLoading && calendarNews?.error ? (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">{calendarNews.error}</div>
                    ) : null}
                    {!calendarNewsLoading && calendarNews && !calendarNews.error && !calendarNews.events.length ? (
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm text-zinc-500">No red news found this week.</div>
                    ) : null}
                    {Object.entries(groupedNews).map(([day, events]) => (
                      <div key={day} className="rounded-[1.2rem] border border-white/8 bg-black/15 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{day}</p>
                          <span className="rounded-full border border-white/8 bg-white/[.04] px-2 py-0.5 text-[10px] font-bold text-zinc-400">{events.length}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {events.map((event) => (
                            <div key={event.id} className="rounded-xl border border-white/8 bg-[#111214] px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 font-mono text-[11px] font-bold text-zinc-200">{event.time}</span>
                                <span className="rounded-md bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-black text-rose-200">{event.currency}</span>
                                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-300">{event.title}</p>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
                                <span>Forecast: {event.forecast}</span>
                                <span>Previous: {event.previous}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {calendarMode === "journal" ? (
                <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total trades", value: String(monthCount), note: `${calendar.filter((day) => day?.trades.length).length} active days` },
                  { label: "Month P&L", value: `${stats.pnl >= 0 ? "+" : ""}${cash.format(stats.pnl)}`, note: `${stats.wins} wins / ${stats.losses} losses` },
                  { label: "Most traded setup", value: setups[0]?.name || "No setup yet", note: setups[0] ? `${setups[0].trades} trades` : "Add reviewed trades" },
                  { label: "Plan alignment", value: `${planRate}%`, note: "Rules followed this month" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1rem] border border-white/8 bg-[#17181b] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">{item.label}</p>
                    <p className="mt-1 truncate text-xl font-black text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#17181b]">
                <div className="flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="font-bold capitalize">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })} performance</h3>
                  <p className="text-xs text-[#8a8a8a]">Open any day to review the exact trades behind that result.</p>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-[0.95rem] border border-white/8 bg-[#141518] p-1 sm:flex sm:gap-2 lg:ml-auto">
                  <Button variant="ghost" size="icon-sm" onClick={p.onPrev}><ChevronLeft size={16} /></Button>
                  <strong className="min-w-0 text-center text-xs capitalize sm:min-w-32 sm:text-sm">{month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</strong>
                  <Button variant="ghost" size="icon-sm" onClick={p.onNext}><ChevronRight size={16} /></Button>
                  <Button variant="outline" size="sm" onClick={p.onToday} className="col-span-3 w-full border-white/8 bg-transparent text-xs sm:w-auto">Current month</Button>
                </div>
              </div>
              {/* Desktop calendar */}
              <div className="hidden p-4 md:block">
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {WEEKDAYS_FULL.map(d => (
                    <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 content-start gap-1.5 [grid-auto-rows:108px]">
                  {calendar.map((c, i) =>
                    c ? (
                      <button key={`${monthId(month)}-desktop-${i}`} type="button" onClick={() => c.trades.length ? setSelectedDay(c) : null}
                        className={`h-full w-full rounded-[1rem] border p-2.5 text-left transition ${c.trades.length ? c.pnl >= 0 ? "border-emerald-500/18 bg-emerald-500/[.07] hover:bg-emerald-500/[.1]" : "border-rose-500/18 bg-rose-500/[.07] hover:bg-rose-500/[.1]" : "border-white/6 bg-[#141518]"} ${c.trades.length ? "cursor-pointer" : "cursor-default"}`}>
                        <div className="flex items-start justify-between">
                          <span className={`grid size-6 place-items-center rounded-md text-[11px] font-bold ${c.trades.length ? "bg-black/18 text-[#f1f1f1]" : "text-[#8a8a8a]"}`}>{c.day}</span>
                          {c.trades.length > 0 && (
                            <span className="rounded-md bg-black/18 px-1.5 py-0.5 text-[10px] font-medium text-[#8a8a8a]">
                              {c.trades.length}
                            </span>
                          )}
                        </div>
                        {c.trades.length > 0 ? (
                          <>
                            <p className={`mt-4 font-mono text-sm font-black ${c.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {c.pnl >= 0 ? "+" : ""}{cash.format(c.pnl)}
                            </p>
                            <div className="mt-4 flex items-center justify-between text-[10px]">
                              <span className="font-semibold uppercase tracking-[0.18em] text-zinc-500">Closed day</span>
                              <span className="text-zinc-400">{c.trades.length} trade{c.trades.length > 1 ? "s" : ""}</span>
                            </div>
                          </>
                        ) : (
                          <p className="mt-8 text-center text-[10px] text-[#333333]">No trades</p>
                        )}
                      </button>
                    ) : (
                      <div key={`${monthId(month)}-desktop-empty-${i}`} className="h-full rounded-[1rem] border border-transparent" />
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
                        className={`flex min-h-[56px] flex-col items-center justify-center rounded-[0.9rem] border p-1 py-1.5 text-center ${c.trades.length ? c.pnl >= 0 ? "border-emerald-500/18 bg-emerald-500/[.07]" : "border-rose-500/18 bg-rose-500/[.07]" : "border-white/6 bg-[#141518]"} ${c.trades.length ? "cursor-pointer" : "cursor-default"}`}>
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
                </>
              ) : null}
            </div>
          </TabsContent>

          {/* Trades */}
          <TabsContent value="trades">
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#17181b] shadow-[0_18px_46px_rgba(0,0,0,.2)]">
                  <div className="space-y-4 border-b border-white/8 px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-lg font-black text-white">Trade Log</h3>
                        <p className="text-xs text-zinc-500">Select a trade to review its full story.</p>
                      </div>
                      <div className="relative sm:ml-auto sm:w-72">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={15} />
                        <Input value={p.query} onChange={e => p.onQuery(e.target.value)} className="pl-9 text-sm" placeholder="Search symbol or setup" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
                      <div className="w-full sm:w-56">
                        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Period</span>
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
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">From<Input type="date" value={p.customStart} onChange={event => p.onCustomStart(event.target.value)} className="mt-1.5 text-sm" /></label>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">To<Input type="date" value={p.customEnd} onChange={event => p.onCustomEnd(event.target.value)} className="mt-1.5 text-sm" /></label>
                        </div>
                      ) : (
                        <p className="pb-3 text-xs text-zinc-500 lg:ml-auto">
                          {p.tradeRange === "daily" ? "Today only" : p.tradeRange === "monthly" ? "Current month" : p.tradeRange === "quarter" ? "Last 3 months" : "Current year"}
                        </p>
                      )}
                    </div>
                  </div>
                  {trades.length ? (
                    <div className="overflow-x-auto">
                      <div className="min-w-[820px] px-3 py-3">
                        <div className="grid grid-cols-[48px_1.3fr_1fr_.9fr_1fr_1fr_.9fr] rounded-2xl bg-black/20 px-4 py-3 text-xs font-semibold text-zinc-500">
                          <span />
                          <span>Entry date</span>
                          <span>Symbol</span>
                          <span>Side</span>
                          <span>Trade duration</span>
                          <span>Risk/Reward</span>
                          <span className="text-right">P&amp;L</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {sortedTrades.map((trade) => {
                            const winning = trade.pnl >= 0;
                            return (
                              <button
                                key={trade.id}
                                type="button"
                                onClick={() => setSelectedTrade(trade)}
                                className="grid w-full grid-cols-[48px_1.3fr_1fr_.9fr_1fr_1fr_.9fr] items-center rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-left transition hover:bg-white/[.04]"
                              >
                                <span className="grid size-5 place-items-center rounded-full border border-white/10" />
                                <span className="text-sm font-semibold text-white">{new Date(`${trade.rawDate}T00:00:00`).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                                <span className="flex items-center gap-2">
                                  <InstrumentBadge symbol={trade.symbol} compact className="bg-[#121212]" showFullSymbol={false} />
                                  <span className="font-bold text-white">{trade.symbol}</span>
                                </span>
                                <span className={`text-sm font-bold ${trade.side === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.side === "Long" ? "Buy ↑" : "Sell ↓"}</span>
                                <span className="text-sm text-zinc-400">{trade.session || "-"}</span>
                                <span className="font-mono text-sm text-zinc-300">{(trade.resultR || 0).toFixed(2)}R</span>
                                <span className={`text-right font-mono text-base font-black ${winning ? "text-emerald-400" : "text-rose-400"}`}>{trade.pnl >= 0 ? "+" : ""}{cash.format(trade.pnl)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : <Empty text="No trades in this range yet." />}
                </section>

                <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-5 shadow-[0_18px_46px_rgba(0,0,0,.2)]">
                  <h3 className="text-lg font-black text-white">Trade Snapshot</h3>
                  <p className="mt-1 text-sm text-zinc-500">A lighter side panel so the main log stays clean.</p>
                  <div className="mt-4 space-y-3">
                    <MiniStat label="Trades" value={String(trades.length)} />
                    <MiniStat label="Winning" value={String(stats.wins)} />
                    <MiniStat label="Losing" value={String(stats.losses)} />
                    <MiniStat label="Avg win" value={averageWin ? cash.format(averageWin) : "-"} />
                    <MiniStat label="Avg loss" value={averageLoss ? cash.format(averageLoss) : "-"} />
                  </div>
                </section>
              </div>
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
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ["overview", "Overview"],
                ["strategy", "Strategy"],
                ["symbols", "Symbols"],
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setAnalyticsView(value as "overview" | "strategy" | "symbols")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${analyticsView === value ? "bg-white text-black" : "border border-white/8 bg-[#17181b] text-zinc-400"}`}>
                  {label}
                </button>
              ))}
              <div className="ml-auto rounded-xl border border-white/8 bg-[#17181b] px-4 py-2 text-sm font-semibold text-white">All time</div>
            </div>

            {analyticsView === "overview" ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
                <section className="overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#17181b] shadow-[0_18px_46px_rgba(0,0,0,.2)]">
                  <div className="border-b border-white/8 px-5 py-4">
                    <h3 className="font-bold text-white">Account Balance</h3>
                    <p className="mt-1 text-xs text-zinc-500">{month.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <div className="h-[330px] p-4">
                    {equity.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equity} margin={{ left: 8, right: 8, top: 16, bottom: 4 }}>
                          <defs>
                            <linearGradient id="analyticsBalanceFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#171717" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                          <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#707b91" }} />
                          <YAxis width={72} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}K`} tick={{ fontSize: 11, fill: "#707b91" }} />
                          <Tooltip formatter={v => cash.format(Number(v))} labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? "Balance"} contentStyle={{ background: "#171717", border: "1px solid #333333", borderRadius: 12, color: "#f1f1f1" }} />
                          <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#analyticsBalanceFill)" strokeWidth={3} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <Empty text="Add trades to unlock analytics charts." />}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#17181b] shadow-[0_18px_46px_rgba(0,0,0,.2)]">
                  <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                    <div>
                      <h3 className="font-bold text-white">TradeWay Profitability Score</h3>
                      <p className="mt-1 text-xs text-zinc-500">{trades.length < 5 ? "Early read, score becomes sharper after 5+ trades." : "Live score based on execution quality."}</p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-xs font-black text-white">{profitabilityScore}</span>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-[1fr_96px]">
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={scoreRadar}>
                          <PolarGrid stroke="rgba(255,255,255,.12)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#d4d4d8", fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.36} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                      <p className="text-sm font-bold text-white">Score</p>
                      <p className="text-4xl font-black text-white">{profitabilityScore}</p>
                      <div className="h-full min-h-28 rounded-full bg-white/5 p-2">
                        <div className="h-full w-full rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" style={{ clipPath: `inset(${100 - profitabilityScore}% 0 0 0 round 999px)` }} />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
                  <MetricPanel title="Average Win" value={averageWin ? cash.format(averageWin) : "-"} note={bestTrade ? `Best ${bestTrade.symbol}` : "No winning trade"} accent="good" />
                  <MetricPanel title="Average Loss" value={averageLoss ? cash.format(averageLoss) : "-"} note={worstTrade ? `Worst ${worstTrade.symbol}` : "No losing trade"} accent="bad" />
                  <MetricPanel title="Best Trade" value={bestTrade ? `${bestTrade.pnl >= 0 ? "+" : ""}${cash.format(bestTrade.pnl)}` : "-"} note={bestTrade?.symbol || "No data"} accent={bestTrade && bestTrade.pnl >= 0 ? "good" : "neutral"} />
                  <MetricPanel title="Worst Trade" value={worstTrade ? `${worstTrade.pnl >= 0 ? "+" : ""}${cash.format(worstTrade.pnl)}` : "-"} note={worstTrade?.symbol || "No data"} accent={worstTrade && worstTrade.pnl < 0 ? "bad" : "neutral"} />
                </div>
              </div>
            ) : null}

            {analyticsView === "strategy" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-5">
                  <h3 className="font-bold text-white">Setup Performance</h3>
                  <div className="mt-4 space-y-4">
                    {setups.length ? setups.map((setup) => (
                      <div key={setup.name}>
                        <div className="flex text-sm">
                          <span className="text-white">{setup.name}</span>
                          <span className={`ml-auto font-mono font-bold ${setup.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {setup.rate}% / {setup.pnl >= 0 ? "+" : ""}{cash.format(setup.pnl)}
                          </span>
                        </div>
                        <ProgressBar label={`${setup.trades} trades`} value={setup.rate} color="bg-zinc-300" />
                      </div>
                    )) : <Empty text="No setup analytics yet." />}
                  </div>
                </section>
                <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-5">
                  <h3 className="font-bold text-white">Discipline & Mistakes</h3>
                  <div className="mt-4">
                    <ProgressBar label={`${monthCount} trades reviewed`} value={planRate} color="bg-emerald-500" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <MiniStat label="PLAN ALIGNMENT" value={`${planRate}%`} />
                    <MiniStat label="MISTAKE TRADES" value={String(mistakes.reduce((sum, item) => sum + item.trades, 0))} />
                  </div>
                  <div className="mt-4 space-y-3">
                    {mistakes.length ? mistakes.map((mistake) => (
                      <div key={mistake.name} className="flex items-center justify-between rounded-xl bg-black/15 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{mistake.name}</p>
                          <p className="text-[11px] text-zinc-500">{mistake.trades} repeats</p>
                        </div>
                        <b className={`font-mono font-bold ${mistake.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {mistake.pnl >= 0 ? "+" : ""}{cash.format(mistake.pnl)}
                        </b>
                      </div>
                    )) : <Empty text="No mistakes recorded this month." />}
                  </div>
                </section>
              </div>
            ) : null}

            {analyticsView === "symbols" ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-5">
                  <h3 className="font-bold text-white">Most Traded Symbols</h3>
                  <div className="mt-4 space-y-2">
                    {symbolStats.length ? symbolStats.map((symbol) => (
                      <div key={symbol.symbol} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <InstrumentBadge symbol={symbol.symbol} compact className="bg-[#121212]" showFullSymbol={false} />
                          <div>
                            <p className="text-sm font-bold text-white">{symbol.symbol}</p>
                            <p className="text-xs text-zinc-500">{symbol.trades} trades / {symbol.wins} wins</p>
                          </div>
                        </div>
                        <strong className={`font-mono text-sm font-black ${symbol.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{symbol.pnl >= 0 ? "+" : ""}{cash.format(symbol.pnl)}</strong>
                      </div>
                    )) : <Empty text="No symbol data yet." />}
                  </div>
                </section>
                <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-5">
                  <h3 className="font-bold text-white">Account Details</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {[
                      ["FIRM", account.firm || "Independent"],
                      ["PHASE", account.phase],
                      ["MARKET", account.marketType],
                      ["PLATFORM", (account.platform || "manual").toUpperCase()],
                      ["START DATE", account.startDate],
                      ["TARGET", cash.format(account.profitTarget)],
                      ["MAX DD", cash.format(account.maxDrawdown)],
                      ["DAILY DD", cash.format(account.dailyDrawdown)],
                    ].map(([label, value]) => <MiniStat key={label} label={label} value={value} />)}
                  </div>
                </section>
              </div>
            ) : null}
          </TabsContent>
          {!embedded && account.platform === "mt5" ? (
            <TabsContent value="settings">
              <Mt5Settings account={account} onSynced={p.onMt5Synced} />
            </TabsContent>
          ) : null}
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

function MetricPanel({ title, value, note, accent = "neutral" }: { title: string; value: string; note: string; accent?: "neutral" | "good" | "bad" }) {
  const color = accent === "good" ? "text-emerald-400" : accent === "bad" ? "text-rose-400" : "text-white";
  return (
    <section className="rounded-[1.2rem] border border-white/8 bg-[#17181b] p-4 shadow-[0_14px_34px_rgba(0,0,0,.18)]">
      <p className="text-sm font-bold text-zinc-400">{title}</p>
      <p className={`mt-3 font-mono text-[2rem] font-black tracking-tight ${color}`}>{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{note}</p>
    </section>
  );
}

function QuickMetric({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : "text-white";
  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/18 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-1 truncate font-mono text-lg font-black ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
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
