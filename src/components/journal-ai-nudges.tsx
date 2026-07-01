"use client";

import {
  Bell,
  BrainCircuit,
  CheckCircle2,
  Flame,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import type { Section } from "./types";

type EntryRow = {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  pnl: string;
  note?: string | null;
  traded_at: string;
  setup?: string | null;
  session?: string | null;
  risk_amount?: string | null;
  result_r?: string | null;
  following_plan?: boolean | null;
  error_made?: boolean | null;
  mistake_type?: string | null;
};

type AiNudge = {
  id: string;
  type: "warning" | "advice" | "reminder" | "success";
  title: string;
  text: string;
};

type CoachMode = "protect" | "neutral" | "push";

type CoachDashboard = {
  mode: CoachMode;
  score: number;
  headline: string;
  command: string;
  todayTrades: number;
  todayPnl: number;
  recentPnl: number;
  winRate: number;
  avgR: number;
  alerts: AiNudge[];
  actions: string[];
  blocked: string[];
  reviewQuestions: string[];
  weakPatterns: string[];
};

const typeIcon = {
  warning: ShieldAlert,
  advice: BrainCircuit,
  reminder: Bell,
  success: CheckCircle2,
};

const typeClass = {
  warning: "border-rose-300/18 bg-rose-400/[.075] text-rose-100",
  advice: "border-sky-300/18 bg-sky-400/[.075] text-sky-100",
  reminder: "border-amber-300/18 bg-amber-400/[.075] text-amber-100",
  success: "border-emerald-300/18 bg-emerald-400/[.075] text-emerald-100",
};

const modeClass = {
  protect: "border-rose-300/20 bg-rose-400/[.08] text-rose-100",
  neutral: "border-sky-300/20 bg-sky-400/[.08] text-sky-100",
  push: "border-emerald-300/20 bg-emerald-400/[.08] text-emerald-100",
};

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayId() {
  return new Date().toISOString().slice(0, 10);
}

function compactMoney(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function topBy<T extends string>(values: T[]) {
  const map = new Map<T, number>();
  values.forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function buildCoachDashboard(entries: EntryRow[]): CoachDashboard {
  if (!entries.length) {
    return {
      mode: "neutral",
      score: 60,
      headline: "AI coach tayyor",
      command: "Birinchi trade qo'sh. Keyin men risk, discipline va setup sifatini kuzataman.",
      todayTrades: 0,
      todayPnl: 0,
      recentPnl: 0,
      winRate: 0,
      avgR: 0,
      alerts: [
        { id: "empty-start", type: "advice", title: "Start journaling", text: "Har trade uchun setup, session, risk, screenshot va bitta lesson yoz." },
      ],
      actions: ["Birinchi accountni tanla", "Bitta trade qo'sh", "Setup va session fieldlarini to'ldir"],
      blocked: ["Jurnal to'ldirmasdan AI'dan signal kutish"],
      reviewQuestions: ["Mening asosiy modelim nima?", "Qaysi sessionda trade qilaman?", "Har trade uchun risk nechchi %?"],
      weakPatterns: ["Data yetarli emas"],
    };
  }

  const sorted = [...entries].sort((a, b) => String(b.traded_at).localeCompare(String(a.traded_at)));
  const latest = sorted[0];
  const recent = sorted.slice(0, 20);
  const today = sorted.filter((entry) => entry.traded_at === todayId());
  const wins = recent.filter((entry) => number(entry.pnl) > 0);
  const todayPnl = today.reduce((sum, entry) => sum + number(entry.pnl), 0);
  const recentPnl = recent.reduce((sum, entry) => sum + number(entry.pnl), 0);
  const avgR = recent.length ? recent.reduce((sum, entry) => sum + number(entry.result_r), 0) / recent.length : 0;
  const winRate = recent.length ? wins.length / recent.length * 100 : 0;
  const lossStreak = sorted.slice(0, 3).length === 3 && sorted.slice(0, 3).every((entry) => number(entry.pnl) < 0);
  const planBreaks = recent.filter((entry) => entry.following_plan === false || entry.error_made).length;
  const missingSetup = recent.filter((entry) => !entry.setup).length;
  const missingNote = recent.filter((entry) => !entry.note).length;
  const missingSession = recent.filter((entry) => !entry.session).length;
  const highRisk = recent.filter((entry) => Math.abs(number(entry.result_r)) >= 4 || number(entry.risk_amount) > 0 && Math.abs(number(entry.pnl)) > number(entry.risk_amount) * 4).length;
  const worstSession = topBy(recent.filter((entry) => number(entry.pnl) < 0).map((entry) => String(entry.session || "Unknown")));
  const worstSetup = topBy(recent.filter((entry) => number(entry.pnl) < 0).map((entry) => String(entry.setup || "Unmarked")));

  let score = 86;
  score -= Math.min(24, planBreaks * 6);
  score -= Math.min(18, missingSetup * 3);
  score -= Math.min(10, missingNote * 2);
  score -= Math.min(8, missingSession * 1);
  score -= Math.min(18, highRisk * 6);
  if (lossStreak) score -= 18;
  if (todayPnl < 0 && today.length >= 2) score -= 10;
  if (recentPnl < 0) score -= 8;
  if (avgR < 0) score -= 8;
  score = Math.max(0, Math.min(100, score));

  const mode: CoachMode = score < 60 || lossStreak || todayPnl < 0 && today.length >= 2 ? "protect" : score >= 82 && recentPnl >= 0 ? "push" : "neutral";

  const alerts: AiNudge[] = [];
  if (lossStreak) alerts.push({ id: "loss-streak", type: "warning", title: "3 loss ketma-ket", text: "Bugun revenge trade xavfi yuqori. Kamida 30 daqiqa pause va riskni pasaytir." });
  if (today.length && todayPnl < 0) alerts.push({ id: "today-negative", type: "warning", title: "Bugungi P&L minus", text: `Bugungi natija ${compactMoney(todayPnl)}. Kapitalni himoya qilish rejimiga o't.` });
  if (planBreaks) alerts.push({ id: "plan-break", type: "warning", title: "Rule break bor", text: `${planBreaks} ta recent trade'da plan buzilgan yoki xato belgilangan.` });
  if (highRisk) alerts.push({ id: "high-risk", type: "warning", title: "Risk siljishi", text: `${highRisk} ta trade planned riskdan katta siljigan. Lot va SL discipline'ni tekshir.` });
  if (missingSetup) alerts.push({ id: "missing-setup", type: "reminder", title: "Setup tagging yo'q", text: `${missingSetup} ta trade setup'siz. AI model performance'ni aniqlashi uchun setup yoz.` });
  if (missingNote) alerts.push({ id: "missing-note", type: "reminder", title: "Review note yetishmayapti", text: `${missingNote} ta recent trade'da review note yo'q. Har trade'dan bitta lesson chiqar.` });
  if (!alerts.length) alerts.push({ id: "clean", type: "success", title: "Critical warning yo'q", text: "Discipline saqlanyapti. Riskni oshirmasdan jarayonni takrorla." });

  const command = mode === "protect"
    ? "Bugungi buyruq: yangi trade faqat A+ setup bo'lsa. 1 ta rule breakdan keyin to'xta."
    : mode === "push"
      ? "Bugungi buyruq: faqat ishlayotgan modelni takrorla. Profitdan keyin riskni oshirma."
      : "Bugungi buyruq: 1-2 ta sifatli setup. Entry oldidan checklist majburiy.";

  const actions = uniq([
    mode === "protect" ? "30 daqiqa pause qil va keyingi trade riskini kamaytir" : "",
    missingSetup ? "Recent tradesga setup nomini qo'sh" : "",
    missingNote ? "Oxirgi 3 trade uchun bitta lesson yoz" : "",
    planBreaks ? "Rule break sababini mistake type fieldida belgilab chiq" : "",
    latest ? `Oxirgi ${latest.symbol} trade'ni review qil` : "",
    "Keyingi entrydan oldin SL, target va invalidation yoz",
  ]).slice(0, 5);

  const blocked = uniq([
    mode === "protect" ? "Ketma-ket trade ochish" : "",
    todayPnl < 0 ? "Minus kunni bitta trade bilan qaytarishga urinish" : "",
    lossStreak ? "Lossdan keyin lot oshirish" : "",
    "Setup yozilmagan trade",
    "Risk amount hisoblanmagan trade",
  ]).slice(0, 5);

  const weakPatterns = uniq([
    worstSession ? `Weak session: ${worstSession}` : "",
    worstSetup ? `Weak setup/model: ${worstSetup}` : "",
    avgR < 0 ? `Average R manfiy: ${avgR.toFixed(2)}R` : "",
    winRate < 45 && recent.length >= 8 ? `Win rate past: ${pct(winRate)}` : "",
    missingSession ? `${missingSession} ta trade session'siz` : "",
  ]).slice(0, 4);

  const reviewQuestions = [
    "Bu trade mening A+ modelimga kiradimi?",
    "Entry oldidan invalidation aniq edimi?",
    "Risk oldindan yozildimi yoki trade paytida o'zgardimi?",
    "Bu xatoni takrorlamaslik uchun bitta qoida nima?",
  ];

  return {
    mode,
    score,
    headline: mode === "protect" ? "Capital protection mode" : mode === "push" ? "Discipline yaxshi, lekin riskni oshirma" : "Execution focus mode",
    command,
    todayTrades: today.length,
    todayPnl,
    recentPnl,
    winRate,
    avgR,
    alerts: alerts.slice(0, 5),
    actions,
    blocked,
    reviewQuestions,
    weakPatterns,
  };
}

export function JournalAiNudges({ section }: { section: Section }) {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dashboard = useMemo(() => buildCoachDashboard(entries), [entries]);
  const warningCount = dashboard.alerts.filter((nudge) => nudge.type === "warning").length;

  const load = async () => {
    if (section !== "journal") return;
    setLoading(true);
    try {
      const response = await apiRequest<{ entries: EntryRow[] }>("/api/journal");
      setEntries(response.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section !== "journal") return;
    setDismissed(false);
    setOpen(false);
    void load();
    const timer = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(timer);
  }, [section]);

  if (section !== "journal" || dismissed || warningCount === 0) return null;

  return (
    <aside className="fixed bottom-[5.4rem] right-3 z-[45] sm:right-4 lg:bottom-5 lg:right-5">
      <div className="relative">
        <div
          className={cn(
            "absolute bottom-[calc(100%+12px)] right-0 w-[min(94vw,420px)] origin-bottom-right transition-all duration-200",
            open
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          )}
        >
          <div className="max-h-[min(74dvh,660px)] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[rgba(8,8,8,.86)] shadow-[0_22px_70px_rgba(0,0,0,.58),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-2xl">
            <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-[#d9f96d]">
                <BrainCircuit size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-black">Critical AI alert</h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase", modeClass[dashboard.mode])}>{dashboard.mode}</span>
                </div>
                <p className="truncate text-[11px] text-zinc-500">{dashboard.headline}</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06] hover:text-white" aria-label="Close AI coach">
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[calc(min(74dvh,660px)-64px)] space-y-3 overflow-y-auto p-3 sm:p-4">
              <div className={cn("rounded-2xl border p-3", modeClass[dashboard.mode])}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-white/55">Emergency command</p>
                    <p className="mt-1 text-sm font-black leading-5 text-white">{dashboard.command}</p>
                  </div>
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/25 text-lg font-black">
                    {dashboard.score}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MiniStat icon={Target} label="Today" value={`${dashboard.todayTrades}`} sub={compactMoney(dashboard.todayPnl)} negative={dashboard.todayPnl < 0} />
                <MiniStat icon={dashboard.recentPnl >= 0 ? TrendingUp : TrendingDown} label="Recent" value={compactMoney(dashboard.recentPnl)} sub="20 trades" negative={dashboard.recentPnl < 0} />
                <MiniStat icon={Flame} label="Win rate" value={pct(dashboard.winRate)} sub={`${dashboard.avgR.toFixed(2)}R`} negative={dashboard.winRate < 45} />
              </div>

              {loading && !entries.length ? (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-3 py-3 text-xs text-zinc-400">
                  <LoaderCircle className="animate-spin" size={14} /> AI journalni o&apos;qiyapti...
                </div>
              ) : null}

              <CoachSection title="Critical alerts" empty="Critical warning yo'q.">
                {dashboard.alerts.filter((nudge) => nudge.type === "warning").map((nudge) => {
                  const Icon = typeIcon[nudge.type];
                  return (
                    <div key={nudge.id} className={cn("rounded-2xl border p-3", typeClass[nudge.type])}>
                      <div className="flex gap-2.5">
                        <Icon className="mt-0.5 shrink-0" size={16} />
                        <div>
                          <p className="text-xs font-black">{nudge.title}</p>
                          <p className="mt-1 text-[11px] leading-5 text-white/68">{nudge.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CoachSection>

              <CoachList title="Do not do" items={dashboard.blocked} icon="×" danger />
              <CoachList title="Immediate action" items={dashboard.actions.slice(0, 3)} icon="✓" />

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500"><Sparkles size={12} /> AI Coach tab has the full plan</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="h-8 rounded-xl text-[11px]">
                  {loading ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />} Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="group relative grid size-14 place-items-center rounded-full border border-rose-300/24 bg-rose-400/[.12] text-rose-100 shadow-[0_18px_50px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-2xl transition hover:scale-[1.03] hover:bg-rose-400/[.18] active:scale-95 sm:size-16"
          aria-label="Open critical TradeWay AI alert"
        >
          <ShieldAlert size={26} />
          <span className="absolute -right-1 -top-1 grid min-w-[22px] place-items-center rounded-full border border-rose-300/20 bg-rose-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-black">
            {warningCount}
          </span>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
        </button>
      </div>
    </aside>
  );
}

function MiniStat({ icon: Icon, label, value, sub, negative }: { icon: typeof Target; label: string; value: string; sub: string; negative?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500"><Icon size={12} /> {label}</div>
      <p className={cn("mt-1 truncate text-sm font-black", negative ? "text-rose-200" : "text-white")}>{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-zinc-500">{sub}</p>
    </div>
  );
}

function CoachSection({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{title}</h4>
      <div className="space-y-2">{children || <p className="text-xs text-zinc-500">{empty}</p>}</div>
    </section>
  );
}

function CoachList({ title, items, icon, danger }: { title: string; items: string[]; icon: string; danger?: boolean }) {
  return (
    <section>
      <h4 className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{title}</h4>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] leading-5 text-zinc-300">
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black", danger ? "bg-rose-400/12 text-rose-200" : "bg-white/10 text-white")}>{icon}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
