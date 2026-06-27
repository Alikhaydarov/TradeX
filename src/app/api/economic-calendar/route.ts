import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ForexFactoryEvent = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
};

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

const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const IMPORTANT_IMPACTS = new Set(["High", "Medium"]);

function formatEvent(event: ForexFactoryEvent, index: number): CalendarEvent | null {
  if (!event.date || !event.title || !event.country) return null;
  const date = new Date(event.date);
  if (Number.isNaN(date.getTime())) return null;
  const impact = event.impact === "High" || event.impact === "Medium" ? event.impact : "Low";

  return {
    id: `${event.country}-${date.getTime()}-${index}`,
    title: event.title,
    currency: event.country,
    impact,
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    }).format(date),
    day: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(date),
    forecast: event.forecast || "-",
    previous: event.previous || "-",
    timestamp: date.toISOString(),
  };
}

export async function GET() {
  try {
    const response = await fetch(FEED_URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 20 },
    });

    if (!response.ok) {
      return NextResponse.json({ events: [], source: "Forex Factory", error: "Calendar feed unavailable." }, { status: 502 });
    }

    const raw = (await response.json()) as ForexFactoryEvent[];
    const now = Date.now();
    const events = raw
      .map(formatEvent)
      .filter((event): event is CalendarEvent => Boolean(event))
      .filter((event) => IMPORTANT_IMPACTS.has(event.impact))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const upcoming = events.filter((event) => new Date(event.timestamp).getTime() >= now).slice(0, 8);
    const fallback = events.slice(-8);

    return NextResponse.json({
      events: upcoming.length ? upcoming : fallback,
      source: "Forex Factory",
      timezone: "America/New_York",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ events: [], source: "Forex Factory", error: "Calendar feed unavailable." }, { status: 502 });
  }
}
