export const runtime = "nodejs";
export const revalidate = 3600;

const FOREX_FACTORY_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

type ForexFactoryEvent = {
  title?: string;
  country?: string;
  date?: string;
  impact?: "High" | "Medium" | "Low" | "Holiday" | string;
  forecast?: string;
  previous?: string;
};

const COUNTRY_BY_CURRENCY: Record<string, string> = {
  USD: "United States",
  EUR: "Euro Area",
  GBP: "United Kingdom",
  JPY: "Japan",
  CAD: "Canada",
  AUD: "Australia",
  NZD: "New Zealand",
  CHF: "Switzerland",
  CNY: "China",
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function validIsoDate(value: string | null) {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()),
  );
}

async function fetchForexFactoryCalendar() {
  const response = await fetch(FOREX_FACTORY_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Tradox/1.0 economic-calendar",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Forex Factory responded with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Forex Factory calendar export was rate limited");
  }

  const data = await response.json().catch(() => []);
  if (!Array.isArray(data)) throw new Error("Invalid Forex Factory response");
  return data as ForexFactoryEvent[];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const requestedStart = url.searchParams.get("start");
  const requestedEnd = url.searchParams.get("end");
  const hasRange = validIsoDate(requestedStart) && validIsoDate(requestedEnd);
  const start = hasRange ? requestedStart! : isoDate(now);
  const end = hasRange ? requestedEnd! : isoDate(tomorrow);

  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T23:59:59Z`).getTime();
  const maxRangeMs = 45 * 24 * 60 * 60 * 1000;

  if (endTime < startTime || endTime - startTime > maxRangeMs) {
    return Response.json(
      {
        events: [],
        date: start,
        provider: "Forex Factory",
        limited: true,
      },
      { status: 400 },
    );
  }

  try {
    const raw = await fetchForexFactoryCalendar();
    const oneDay = 24 * 60 * 60 * 1000;
    const rangeStart = hasRange ? startTime - oneDay : startTime;
    const rangeEnd = hasRange ? endTime + oneDay : endTime;

    const events = raw
      .filter((item) => item.title && item.date && item.impact === "High")
      .map((item, index) => {
        const currency = String(item.country || "").toUpperCase();
        return {
          id: `${item.date}-${currency}-${item.title}-${index}`,
          date: String(item.date),
          country: COUNTRY_BY_CURRENCY[currency] || currency || "Global",
          currency,
          event: String(item.title || "Economic release"),
          category: "High Impact",
          actual: "",
          forecast: String(item.forecast || ""),
          previous: String(item.previous || ""),
          importance: 3,
          source: "Forex Factory",
        };
      })
      .filter((item) => {
        const timestamp = new Date(item.date).getTime();
        return Number.isFinite(timestamp) && timestamp >= rangeStart && timestamp <= rangeEnd;
      })
      .sort(
        (left, right) =>
          new Date(left.date).getTime() - new Date(right.date).getTime(),
      )
      .slice(0, hasRange ? 160 : 12);

    return Response.json(
      {
        events,
        date: start,
        provider: "Forex Factory",
        limited: true,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        events: [],
        date: start,
        provider: "Forex Factory",
        limited: true,
        error:
          error instanceof Error
            ? error.message
            : "Forex Factory calendar unavailable",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  }
}
