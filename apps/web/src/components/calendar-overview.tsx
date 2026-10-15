import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { JournalTrade } from "@/lib/journal-data";
import { CalendarMonthSwitcher } from "./calendar-month-switcher";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const keyForMonth = (date: Date) => date.toISOString().slice(0, 7);
const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    date,
  );

export function CalendarOverview({
  trades,
  month,
  failed = false,
  now = new Date().toISOString(),
}: {
  trades: JournalTrade[];
  month: string;
  failed?: boolean;
  now?: string;
}) {
  const date = new Date(month + "-01T00:00:00Z");
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const previous = keyForMonth(new Date(Date.UTC(year, monthIndex - 1, 1)));
  const next = keyForMonth(new Date(Date.UTC(year, monthIndex + 1, 1)));
  const monthName = format(date, { month: "long", year: "numeric" });
  const monthly = trades.filter(
    (trade) => trade.traded_at.slice(0, 7) === month,
  );
  const days = new Map<string, { count: number; pnl: number }>();
  monthly.forEach((trade) => {
    const key = trade.traded_at.slice(0, 10);
    const day = days.get(key) ?? { count: 0, pnl: 0 };
    day.count++;
    day.pnl += trade.pnl ?? 0;
    days.set(key, day);
  });
  const net = monthly.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const closed = monthly.filter((trade) => trade.pnl !== null);
  const wins = closed.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const prefix = (date.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const weekCount = Math.ceil((prefix + daysInMonth) / 7);
  const todayKey = now.slice(0, 10);
  return (
    <div className="calendar-page">
      <header className="calendar-page-heading">
        <div>
          <p className="section-label">YOUR TRADING RHYTHM</p>
          <h1>
            Performance calendar<span>.</span>
          </h1>
          <p>One session at a time. See the bigger picture.</p>
        </div>
        <Link href="/trades?add=1" className="ui-button">
          <Plus size={16} />
          Log trade
        </Link>
      </header>
      {failed && (
        <p className="community-error" role="alert">
          Calendar results could not be loaded. Please refresh.
        </p>
      )}
      <CalendarMonthSwitcher month={month} />
      <section
        className="performance-calendar"
        aria-label={monthName + " trading performance"}
      >
        <header className="calendar-toolbar">
          <div>
            <h2>{monthName}</h2>
            <p>Select a session to review its trades.</p>
          </div>
          <div>
            <Link
              href={"/calendar?month=" + previous}
              aria-label="Previous month"
              className="calendar-nav-button"
            >
              <ChevronLeft size={17} />
            </Link>
            <Link href="/calendar" className="calendar-today">
              Today
            </Link>
            <Link
              href={"/calendar?month=" + next}
              aria-label="Next month"
              className="calendar-nav-button"
            >
              <ChevronRight size={17} />
            </Link>
          </div>
        </header>
        <div className="calendar-stats">
          <div>
            <span>Month P&amp;L</span>
            <strong className={net >= 0 ? "text-profit" : "text-loss"}>
              {money(net)}
            </strong>
          </div>
          <div>
            <span>Trades</span>
            <strong>{monthly.length}</strong>
          </div>
          <div>
            <span>Trading days</span>
            <strong>{days.size}</strong>
          </div>
          <div>
            <span>Win rate</span>
            <strong>
              {closed.length ? ((wins / closed.length) * 100).toFixed(0) : "0"}
              <small>%</small>
            </strong>
          </div>
        </div>
        <div className="calendar-board">
          <div className="calendar-week-labels">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
            <span className="calendar-week-summary">Week</span>
          </div>
          {Array.from({ length: weekCount }, (_, week) => {
            let weekPnl = 0,
              weekTrades = 0;
            const cells = Array.from({ length: 7 }, (_, weekday) => {
              const day = week * 7 + weekday - prefix + 1;
              if (day < 1 || day > daysInMonth)
                return <div className="calendar-day-empty" key={weekday} />;
              const key = month + "-" + String(day).padStart(2, "0");
              const result = days.get(key);
              weekPnl += result?.pnl ?? 0;
              weekTrades += result?.count ?? 0;
              return (
                <Link
                  key={key}
                  href={"/trades?date=" + key}
                  className={
                    "calendar-day" +
                    (result
                      ? result.pnl >= 0
                        ? " profitable"
                        : " losing"
                      : "") +
                    (key === todayKey ? " is-today" : "")
                  }
                  aria-label={
                    format(new Date(key + "T00:00:00Z"), {
                      month: "long",
                      day: "numeric",
                    }) +
                    (result
                      ? ": " +
                        money(result.pnl) +
                        ", " +
                        result.count +
                        " trades"
                      : ": no trades")
                  }
                >
                  <span className="calendar-day-number">
                    {day}
                    {key === todayKey && <i />}
                  </span>
                  <div>
                    {result ? (
                      <>
                        <strong className="calendar-pnl-full">
                          {money(result.pnl)}
                        </strong>
                        <strong className="calendar-pnl-short">
                          {compactMoney(result.pnl)}
                        </strong>
                        <small>
                          {result.count} trade{result.count === 1 ? "" : "s"}
                        </small>
                      </>
                    ) : (
                      <span className="calendar-no-trades">—</span>
                    )}
                  </div>
                </Link>
              );
            });
            return (
              <div className="calendar-week-row" key={week}>
                {cells}
                <div
                  className={
                    "calendar-week-summary" +
                    (weekTrades
                      ? weekPnl >= 0
                        ? " text-profit"
                        : " text-loss"
                      : "")
                  }
                >
                  <strong>{weekTrades ? money(weekPnl) : "—"}</strong>
                  <small>{weekTrades} trades</small>
                </div>
              </div>
            );
          })}
        </div>
        <footer className="calendar-legend">
          <span>
            <i className="profit-dot" />
            Profit
          </span>
          <span>
            <i className="loss-dot" />
            Loss
          </span>
          <span>
            <i />
            No trades
          </span>
          <Link href="/trades">
            View trade journal <ArrowRight size={13} />
          </Link>
        </footer>
      </section>
      {!monthly.length && (
        <div className="calendar-empty">
          <p>No entries for {monthName} yet.</p>
          <span>Your sessions will appear as you log trades.</span>
          <Link href="/trades?add=1">
            Add a trade <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
