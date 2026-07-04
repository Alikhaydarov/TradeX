"use client";

import { CalendarClock, ExternalLink, Radio, RefreshCw } from "lucide-react";
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
    <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[300px] shrink-0 overflow-y-auto 2xl:block">
      <section className="rounded-[1.3rem] border border-white/8 bg-[#17181b] p-3.5 shadow-[0_18px_48px_rgba(0,0,0,.22)]">
        <div className="flex items-start gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-2xl bg-rose-300/10 text-rose-200">
            <CalendarClock size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">Red news</h2>
            <p className="mt-0.5 text-[10px] text-zinc-500">Weekly · New York time</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/[.05] px-2 py-1 text-[9px] font-bold text-zinc-400">
            <Radio size={10} /> NY
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {loading && !calendar ? (
            <div className="flex items-center justify-center gap-2 rounded-[1rem] border border-white/8 bg-black/12 py-6 text-xs text-zinc-500">
              <RefreshCw size={14} className="animate-spin" />
              Loading news
            </div>
          ) : null}

          {!loading && calendar?.error ? (
            <div className="rounded-[1rem] border border-rose-300/15 bg-rose-300/[.06] p-3 text-xs leading-5 text-rose-100">
              {calendar.error}
            </div>
          ) : null}

          {!loading && calendar && !calendar.error && calendar.events.length === 0 ? (
            <div className="rounded-[1rem] border border-white/8 bg-black/12 p-3 text-xs text-zinc-500">
              No red news found this week.
            </div>
          ) : null}

          {Object.entries(grouped).map(([day, events]) => (
            <div key={day} className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{day}</p>
              {events.map((event) => (
                <div key={event.id} className="rounded-[1rem] border border-white/8 bg-black/12 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 font-mono text-[11px] font-bold text-zinc-200">{event.time}</span>
                    <span className="rounded-md bg-rose-300/10 px-1.5 py-0.5 text-[10px] font-black text-rose-200">
                      {event.currency}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-300">{event.title}</p>
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
          className="mt-3 flex items-center justify-center gap-2 rounded-[1rem] border border-white/8 bg-black/12 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[.04]"
        >
          Forex Factory
          <ExternalLink size={13} />
        </a>
      </section>
    </aside>
  );
}
