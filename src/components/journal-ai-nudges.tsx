"use client";

import { Bell, BrainCircuit, CheckCircle2, LoaderCircle, RefreshCw, ShieldAlert, Sparkles, X } from "lucide-react";
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

function buildNudges(entries: EntryRow[]): AiNudge[] {
  if (!entries.length) {
    return [
      {
        id: "empty-start",
        type: "advice",
        title: "AI coach tayyor",
        text: "Birinchi trade qo'shilgandan keyin men risk, setup va discipline bo'yicha eslatmalar beraman.",
      },
      {
        id: "empty-reminder",
        type: "reminder",
        title: "Jurnal qoidasi",
        text: "Har trade uchun setup, session, risk va bitta lesson yozib bor. Keyin AI aniqroq maslahat beradi.",
      },
    ];
  }

  const sorted = [...entries].sort((a, b) => String(b.traded_at).localeCompare(String(a.traded_at)));
  const latest = sorted[0];
  const recent = sorted.slice(0, 12);
  const today = sorted.filter((entry) => entry.traded_at === todayId());
  const todayPnl = today.reduce((sum, entry) => sum + number(entry.pnl), 0);
  const recentLosses = recent.slice(0, 3).filter((entry) => number(entry.pnl) < 0).length;
  const planBreaks = recent.filter((entry) => entry.following_plan === false || entry.error_made).length;
  const missingSetup = recent.filter((entry) => !entry.setup).length;
  const missingNote = recent.filter((entry) => !entry.note).length;
  const highRisk = recent.filter((entry) => Math.abs(number(entry.result_r)) >= 4 || number(entry.risk_amount) > 0 && Math.abs(number(entry.pnl)) > number(entry.risk_amount) * 4);
  const nudges: AiNudge[] = [];

  if (recentLosses >= 3) {
    nudges.push({
      id: "loss-streak",
      type: "warning",
      title: "Loss streak detected",
      text: "Oxirgi 3 ta trade loss. Keyingi setupdan oldin kamida 30 daqiqa pause va lotni kamaytir.",
    });
  }

  if (today.length && todayPnl < 0) {
    nudges.push({
      id: "today-negative",
      type: "warning",
      title: "Bugungi P&L minusda",
      text: `Bugungi natija ${compactMoney(todayPnl)}. Revenge trade qilmaslik uchun faqat A+ setup qoldir.`,
    });
  }

  if (planBreaks > 0) {
    nudges.push({
      id: "plan-break",
      type: "warning",
      title: "Plan buzilgan trade bor",
      text: `${planBreaks} ta recent trade'da rule break yoki xato belgilangan. Shu xatoni takrorlamaslik uchun checklist yoz.`,
    });
  }

  if (highRisk.length > 0) {
    nudges.push({
      id: "risk-warning",
      type: "warning",
      title: "Risk nazoratini tekshir",
      text: "Recent trade ichida riskdan katta siljish bor. SL, lot va maximum daily loss qoidalarini qayta tekshir.",
    });
  }

  if (missingSetup > 0) {
    nudges.push({
      id: "missing-setup",
      type: "reminder",
      title: "Setup nomi yetishmayapti",
      text: `${missingSetup} ta recent trade setup'siz. Setup yozilmasa AI qaysi model ishlayotganini aniq topa olmaydi.`,
    });
  }

  if (missingNote > 0) {
    nudges.push({
      id: "missing-note",
      type: "reminder",
      title: "Review note yoz",
      text: "Trade yopilgandan keyin bitta lesson yoz. Bu keyingi AI coaching sifatini oshiradi.",
    });
  }

  if (latest && number(latest.pnl) > 0) {
    nudges.push({
      id: "profit-discipline",
      type: "advice",
      title: "Profitdan keyin discipline",
      text: `Oxirgi ${latest.symbol} trade profit bilan yopilgan. Endi riskni oshirma, aynan shu modelni kut.`,
    });
  }

  if (!nudges.length) {
    nudges.push({
      id: "clean-state",
      type: "success",
      title: "Discipline holati yaxshi",
      text: "Critical warning yo'q. Rejangni saqla: 1-2 ta sifatli setup, riskni oshirmaslik, review yozish.",
    });
  }

  nudges.push({
    id: "always-checklist",
    type: "advice",
    title: "Next trade checklist",
    text: "Entry oldidan: setup, invalidation, risk amount, session va target yozilgan bo'lsin.",
  });

  return nudges.slice(0, 5);
}

export function JournalAiNudges({ section }: { section: Section }) {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const nudges = useMemo(() => buildNudges(entries), [entries]);
  const warningCount = nudges.filter((nudge) => nudge.type === "warning").length;

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

  if (section !== "journal" || dismissed) return null;

  return (
    <aside className="fixed bottom-[5.4rem] right-3 z-[45] sm:right-4 lg:bottom-5 lg:right-5">
      <div className="relative">
        <div
          className={cn(
            "absolute bottom-[calc(100%+12px)] right-0 w-[min(92vw,380px)] origin-bottom-right transition-all duration-200",
            open
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          )}
        >
          <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[rgba(8,8,8,.82)] shadow-[0_22px_70px_rgba(0,0,0,.58),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-2xl">
            <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-[#d9f96d]">
                <BrainCircuit size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-black">TradeWay AI</h3>
                  {warningCount ? (
                    <span className="rounded-full bg-rose-400/12 px-2 py-0.5 text-[10px] font-black text-rose-200">
                      {warningCount} warning
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-zinc-500">Journal reminders · risk alerts · next action</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06] hover:text-white" aria-label="Close AI nudges">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 p-3 sm:p-4">
              {loading && !entries.length ? (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-3 py-3 text-xs text-zinc-400">
                  <LoaderCircle className="animate-spin" size={14} /> AI journalni o&apos;qiyapti...
                </div>
              ) : null}

              {nudges.map((nudge) => {
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

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500"><Sparkles size={12} /> Auto refresh 45s</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="h-8 rounded-xl text-[11px]">
                  {loading ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />} Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="group relative grid size-14 place-items-center rounded-full border border-white/12 bg-[rgba(10,10,10,.84)] text-[#d9f96d] shadow-[0_18px_50px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-2xl transition hover:scale-[1.03] hover:bg-white/[.06] active:scale-95 sm:size-16"
          aria-label="Open TradeWay AI"
        >
          <BrainCircuit size={26} />
          {warningCount ? (
            <span className="absolute -right-1 -top-1 grid min-w-[22px] place-items-center rounded-full border border-rose-300/20 bg-rose-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-black">
              {warningCount}
            </span>
          ) : null}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
        </button>
      </div>
    </aside>
  );
}
