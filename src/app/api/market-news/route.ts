export const runtime = "nodejs"
export const revalidate = 900

type TradingEconomicsEvent = {
  CalendarId?: string | number
  Date?: string
  Country?: string
  Event?: string
  Category?: string
  Actual?: string
  Forecast?: string
  Previous?: string
  Importance?: number
  Currency?: string
  Source?: string
}

const MAJOR_COUNTRIES = [
  "united states",
  "euro area",
  "united kingdom",
  "japan",
  "canada",
  "australia",
  "new zealand",
  "switzerland",
  "china",
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function apiUrl(path: string, key: string) {
  const url = new URL(`https://api.tradingeconomics.com${path}`)
  url.searchParams.set("c", key)
  url.searchParams.set("importance", "3")
  url.searchParams.set("f", "json")
  return url.toString()
}

async function fetchCalendar(key: string, start: string, end: string) {
  const countries = MAJOR_COUNTRIES.map(encodeURIComponent).join(",")
  const countryUrl = apiUrl(`/calendar/country/${countries}/${start}/${end}`, key)
  const response = await fetch(countryUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 900 },
  })

  if (response.ok) {
    const data = await response.json().catch(() => [])
    if (Array.isArray(data)) return data as TradingEconomicsEvent[]
  }

  const fallbackUrl = apiUrl(`/calendar/${start}/${end}`, key)
  const fallback = await fetch(fallbackUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 900 },
  })

  if (!fallback.ok) return []
  const data = await fallback.json().catch(() => [])
  return Array.isArray(data) ? data as TradingEconomicsEvent[] : []
}

export async function GET() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const start = isoDate(now)
  const end = isoDate(tomorrow)
  const key = process.env.TRADING_ECONOMICS_API_KEY?.trim() || "guest:guest"

  try {
    const raw = await fetchCalendar(key, start, end)
    const events = raw
      .filter((item) => item.Date && item.Event && Number(item.Importance || 0) >= 3)
      .map((item, index) => ({
        id: String(item.CalendarId || `${item.Date}-${item.Event}-${index}`),
        date: String(item.Date),
        country: String(item.Country || "Global"),
        currency: String(item.Currency || ""),
        event: String(item.Event || item.Category || "Economic release"),
        category: String(item.Category || ""),
        actual: String(item.Actual || ""),
        forecast: String(item.Forecast || ""),
        previous: String(item.Previous || ""),
        importance: Number(item.Importance || 0),
        source: String(item.Source || "Trading Economics"),
      }))
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(0, 8)

    return Response.json({
      events,
      date: start,
      provider: "Trading Economics",
      limited: key === "guest:guest",
    })
  } catch {
    return Response.json({
      events: [],
      date: start,
      provider: "Trading Economics",
      limited: key === "guest:guest",
    })
  }
}
