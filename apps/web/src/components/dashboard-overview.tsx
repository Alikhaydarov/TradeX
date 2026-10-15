import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CirclePlus,
  MoveUpRight,
  NotebookPen,
  Target,
  TrendingUp,
} from "lucide-react";
import type { JournalTrade } from "@/lib/journal-data";

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
const dateLabel = (value: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    value,
  );
export type JournalPeriod = "all" | "month" | "week";

export function DashboardOverview({
  name,
  trades,
  failed = false,
  period = "month",
  now = new Date().toISOString(),
}: {
  name: string;
  trades: JournalTrade[];
  failed?: boolean;
  period?: JournalPeriod;
  now?: string;
}) {
  const today = new Date(now);
  const dayKey = today.toISOString().slice(0, 10);
  const weekStart = new Date(dayKey + "T00:00:00Z");
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const monthKey = dayKey.slice(0, 7);
  const included = trades.filter(
    (trade) =>
      period === "all" ||
      (period === "month"
        ? trade.traded_at.slice(0, 7) === monthKey
        : trade.traded_at.slice(0, 10) >=
            weekStart.toISOString().slice(0, 10) &&
          trade.traded_at.slice(0, 10) <= dayKey),
  );
  const closed = included.filter((trade) => trade.pnl !== null);
  const wins = closed.filter((trade) => (trade.pnl ?? 0) > 0);
  const losses = closed.filter((trade) => (trade.pnl ?? 0) < 0);
  const pnl = closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const grossProfit = wins.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const grossLoss = losses.reduce((sum, trade) => sum - (trade.pnl ?? 0), 0);
  const rTrades = included.filter((trade) => trade.result_r !== null);
  const averageR = rTrades.length
    ? rTrades.reduce((sum, trade) => sum + (trade.result_r ?? 0), 0) /
      rTrades.length
    : 0;
  const profitFactor = grossLoss
    ? (grossProfit / grossLoss).toFixed(2)
    : grossProfit
      ? "∞"
      : "—";
  const sorted = [...closed]
    .sort((a, b) => a.traded_at.localeCompare(b.traded_at))
    .slice(-30);
  let running = 0;
  const values = [0, ...sorted.map((trade) => (running += trade.pnl ?? 0))];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const points = values
    .map(
      (value, index) =>
        (index ? "L" : "M") +
        ((index / Math.max(1, values.length - 1)) * 760).toFixed(1) +
        " " +
        (190 - ((value - min) / span) * 155).toFixed(1),
    )
    .join(" ");
  const symbolMap = new Map<string, { count: number; pnl: number }>();
  included.forEach((trade) => {
    const entry = symbolMap.get(trade.symbol) ?? { count: 0, pnl: 0 };
    entry.count++;
    entry.pnl += trade.pnl ?? 0;
    symbolMap.set(trade.symbol, entry);
  });
  const symbols = [...symbolMap]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const dailyTrades = trades.filter(
      (trade) => trade.traded_at.slice(0, 10) === key,
    );
    return {
      date,
      key,
      count: dailyTrades.length,
      pnl: dailyTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0),
    };
  });
  const recent = trades.slice(0, 5);
  const dateRange = sorted.length
    ? dateLabel(new Date(sorted[0]!.traded_at), {
        month: "short",
        day: "numeric",
      }) +
      " – " +
      dateLabel(new Date(sorted[sorted.length - 1]!.traded_at), {
        month: "short",
        day: "numeric",
      })
    : dateLabel(today, { month: "long", year: "numeric" });

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-date">
            <CalendarDays size={14} />
            {dateLabel(today, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1>
            Good to see you, {name.split(" ")[0]}
            <span>.</span>
          </h1>
          <p>Your process. Your progress. All in one place.</p>
        </div>
        <Link href="/trades?add=1" className="ui-button ui-button-primary">
          <CirclePlus size={16} />
          Log a trade
        </Link>
      </header>
      {failed && (
        <p role="alert" className="community-error">
          Your journal could not be loaded. Please refresh to try again.
        </p>
      )}
      <div className="dashboard-section-toolbar">
        <h2>Performance overview</h2>
        <div className="ui-segmented" aria-label="Performance period">
          {(
            [
              ["week", "Week"],
              ["month", "Month"],
              ["all", "All time"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={"/dashboard?period=" + value}
              aria-current={period === value ? "true" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <section className="dashboard-metrics" aria-label="Performance metrics">
        <article>
          <div>
            <span>Net P&amp;L</span>
            <TrendingUp size={16} />
          </div>
          <strong className={pnl >= 0 ? "text-profit" : "text-loss"}>
            {currency(pnl)}
          </strong>
          <p>
            {closed.length} closed trades <span>in this period</span>
          </p>
        </article>
        <article>
          <div>
            <span>Win rate</span>
            <Target size={16} />
          </div>
          <strong>
            {winRate.toFixed(1)}
            <small>%</small>
          </strong>
          <div className="dashboard-win-bar">
            <i style={{ width: winRate + "%" }} />
          </div>
          <p>
            <b className="text-profit">{wins.length} wins</b>
            <span> / </span>
            <b className="text-loss">{losses.length} losses</b>
          </p>
        </article>
        <article>
          <div>
            <span>Profit factor</span>
            <ArrowUpRight size={16} />
          </div>
          <strong>{profitFactor}</strong>
          <p>
            {currency(grossProfit)} <span>gross profit</span>
          </p>
        </article>
        <article>
          <div>
            <span>Average return</span>
            <MoveUpRight size={16} />
          </div>
          <strong>
            {averageR.toFixed(2)}
            <small>R</small>
          </strong>
          <p>
            {rTrades.length} trades <span>with recorded risk/reward</span>
          </p>
        </article>
      </section>
      <section className="dashboard-main-grid">
        <article className="dashboard-chart">
          <header>
            <div>
              <h2>Cumulative P&amp;L</h2>
              <p>{dateRange}</p>
            </div>
            <span className="chart-legend">
              <i />
              Realized return
            </span>
          </header>
          <div className="dashboard-chart-value">
            <strong className={running >= 0 ? "text-profit" : "text-loss"}>
              {currency(running)}
            </strong>
            <span>Latest {sorted.length} closed trades in period</span>
          </div>
          {sorted.length ? (
            <div className="dashboard-chart-plot">
              <div className="chart-y-labels">
                {[max, min + span / 2, min].map((value, i) => (
                  <span key={i}>{currency(value)}</span>
                ))}
              </div>
              <div className="chart-graph">
                <div className="chart-grid-lines">
                  <i />
                  <i />
                  <i />
                </div>
                <svg
                  viewBox="0 0 760 220"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={
                    "Cumulative realized P&L ending at " + currency(running)
                  }
                >
                  <defs>
                    <linearGradient
                      id="equity-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop stopColor="currentColor" stopOpacity=".16" />
                      <stop
                        offset="1"
                        stopColor="currentColor"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d={points + " L760 220 L0 220Z"}
                    fill="url(#equity-fill)"
                  />
                  <path
                    d={points}
                    stroke="currentColor"
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                    fill="none"
                  />
                </svg>
                <div className="chart-x-labels">
                  <span>
                    {dateLabel(new Date(sorted[0]!.traded_at), {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>
                    {dateLabel(
                      new Date(
                        sorted[Math.floor(sorted.length / 2)]!.traded_at,
                      ),
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                  <span>
                    {dateLabel(new Date(sorted[sorted.length - 1]!.traded_at), {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-chart-empty">
              <NotebookPen size={26} />
              <h3>A clear picture starts with one trade.</h3>
              <p>
                Log your execution and start building your performance history.
              </p>
              <Link href="/trades?add=1">
                Add your first trade <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </article>
        <article className="dashboard-assets">
          <header>
            <h2>Most traded assets</h2>
            <span>{symbols.length ? "This period" : "No activity yet"}</span>
          </header>
          {symbols.length ? (
            <div>
              {symbols.map(([symbol, data], index) => (
                <div className="dashboard-asset-row" key={symbol}>
                  <span className="asset-number">0{index + 1}</span>
                  <div>
                    <strong>{symbol}</strong>
                    <span>
                      {data.count} trade{data.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <strong
                    className={data.pnl >= 0 ? "text-profit" : "text-loss"}
                  >
                    {currency(data.pnl)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-small-empty">
              Your most traded instruments will appear here.
            </p>
          )}
          <footer>
            <span>Trade with a plan.</span>
            <Link href="/analytics">
              Explore analytics <ArrowUpRight size={14} />
            </Link>
          </footer>
        </article>
      </section>
      <section className="dashboard-week">
        <div className="dashboard-section-toolbar">
          <h2>
            This week{" "}
            <span>
              {dateLabel(weekStart, { month: "short", day: "numeric" })} –{" "}
              {dateLabel(weekdays[6]!.date, { month: "short", day: "numeric" })}
            </span>
          </h2>
          <Link href="/calendar">
            Open calendar <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="dashboard-week-grid">
          {weekdays.map((day) => (
            <Link
              key={day.key}
              href={"/trades?date=" + day.key}
              className={
                "dashboard-day" + (day.key === dayKey ? " is-today" : "")
              }
            >
              <div>
                <span>{dateLabel(day.date, { weekday: "short" })}</span>
                <b>{day.date.getUTCDate()}</b>
              </div>
              <strong
                className={
                  day.count ? (day.pnl >= 0 ? "text-profit" : "text-loss") : ""
                }
              >
                {day.count ? currency(day.pnl) : "—"}
              </strong>
              <small>
                {day.count} trade{day.count === 1 ? "" : "s"}
                {day.key === dayKey && <i>Today</i>}
              </small>
            </Link>
          ))}
        </div>
      </section>
      <section className="dashboard-recent">
        <header className="dashboard-section-toolbar">
          <div>
            <h2>Recent trades</h2>
            <p>The latest entries in your journal.</p>
          </div>
          <Link href="/trades">
            View all trades <ArrowRight size={15} />
          </Link>
        </header>
        {recent.length ? (
          <div className="dashboard-recent-list">
            {recent.map((trade) => (
              <Link
                href={"/trades?date=" + trade.traded_at.slice(0, 10)}
                key={trade.id}
              >
                <span
                  className={
                    "trade-direction-icon " +
                    (["long", "buy"].includes(trade.side.toLowerCase())
                      ? "text-profit"
                      : "text-loss")
                  }
                >
                  {["long", "buy"].includes(trade.side.toLowerCase()) ? (
                    <ArrowUpRight size={19} />
                  ) : (
                    <ArrowDownRight size={19} />
                  )}
                </span>
                <div>
                  <strong>{trade.symbol}</strong>
                  <span>{trade.account_name || "Journal trade"}</span>
                </div>
                <span className="recent-side">{trade.side}</span>
                <time>
                  {dateLabel(new Date(trade.traded_at), {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <strong
                  className={
                    (trade.pnl ?? 0) >= 0 ? "text-profit" : "text-loss"
                  }
                >
                  {trade.pnl === null ? "Pending" : currency(trade.pnl)}
                </strong>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-recent-empty">
            <NotebookPen size={20} />
            <span>No trades yet. Your next entry starts here.</span>
            <Link href="/trades?add=1">
              Log a trade <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
