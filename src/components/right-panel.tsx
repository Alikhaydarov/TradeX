"use client";

import { CalendarClock, ExternalLink, Radio, RefreshCw, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type CalendarEvent = {
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

type CalendarResponse = {
  events: CalendarEvent[];
  source: string;
  timezone?: string;
  updatedAt?: string;
  error?: string;
};

function impactClass(impact: CalendarEvent["impact"]) {
  if (impact === "High") return "border-rose-300/20 bg-rose-300/10 text-rose-200";
  if (impact === "Medium") return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  return "border-white/10 bg-white/[.04] text-zinc-300";
}

function groupByDay(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    acc[event.day] = acc[event.day] || [];
    acc[event.day].push(event);
    return acc;
  }, {});
}

export function RightPanel() {
  const pathname = usePathname();
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => groupByDay(calendar?.events || []), [calendar?.events]);

  useEffect(() => {
    if (pathname?.startsWith("/journal")) return;
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    fetch("/api/economic-calendar", { signal: controller.signal })
      .then((response) => response.json() as Promise<CalendarResponse>)
      .then((data) => {
        if (active) setCalendar(data);
      })
      .catch(() => {
        if (active) setCalendar({ events: [], source: "Forex Factory", error: "Calendar unavailable." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [pathname]);

  if (pathname?.startsWith("/journal")) return null;

  return (
    <aside className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-[280px] shrink-0 overflow-y-auto xl:block">
      <section className="rounded-xl border border-border bg-card p-4 shadow-xl shadow-black/20">
        <div className="flex items-start gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[.05] text-zinc-200">
            <CalendarClock size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">News calendar</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">Forex Factory · New York time</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">
            <Radio size={10} /> NY
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[.055] p-3">
          <div className="flex items-center gap-2 text-amber-100">
            <Zap size={14} />
            <p className="text-xs font-bold">Trade around red-folder news carefully</p>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-zinc-400">
            Times below are shown in New York time for session planning.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {loading && !calendar ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-[#111] py-8 text-xs text-zinc-500">
              <RefreshCw size={14} className="animate-spin" />
              Loading news
            </div>
          ) : null}

          {!loading && calendar?.error ? (
            <div className="rounded-lg border border-rose-300/15 bg-rose-300/[.06] p-3 text-xs leading-5 text-rose-100">
              {calendar.error}
            </div>
          ) : null}

          {!loading && calendar && !calendar.error && calendar.events.length === 0 ? (
            <div className="rounded-lg border border-border bg-[#111] p-3 text-xs text-zinc-500">
              No high or medium impact news found this week.
            </div>
          ) : null}

          {Object.entries(grouped).map(([day, events]) => (
            <div key={day} className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{day}</p>
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border border-border bg-[#111] p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 min-w-10 rounded-md border border-white/10 bg-white/[.04] px-2 py-1 text-center font-mono text-[11px] font-bold text-zinc-200">
                      {event.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-zinc-100">{event.currency}</strong>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${impactClass(event.impact)}`}>
                          {event.impact}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">{event.title}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
                        <span>Forecast <b className="font-mono text-zinc-300">{event.forecast}</b></span>
                        <span>Previous <b className="font-mono text-zinc-300">{event.previous}</b></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <a
          href="https://www.forexfactory.com/calendar"
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-white/[.04] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[.07]"
        >
          Open Forex Factory
          <ExternalLink size={13} />
        </a>
      </section>
    </aside>
  );
}
