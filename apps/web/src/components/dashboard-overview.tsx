import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import type { JournalTrade } from "@/lib/journal-data";
import { Money } from "./pnl-preferences";
import { WelcomeHeading } from "./welcome-heading";

export type JournalPeriod = "all" | "month" | "week";
const dateLabel = (value: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    value,
  );

export function DashboardOverview({
  name,
  username,
  trades,
  failed = false,
  period = "month",
  initialBalance = 0,
  now = new Date().toISOString(),
}: {
  name: string;
  username?: string | null;
  trades: JournalTrade[];
  failed?: boolean;
  period?: JournalPeriod;
  initialBalance?: number;
  now?: string;
}) {
  const today = new Date(now);
  const dayKey = today.toISOString().slice(0, 10);
  const weekStart = new Date(dayKey + "T00:00:00Z");
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const from =
    period === "all"
      ? ""
      : period === "month"
        ? dayKey.slice(0, 7) + "-01"
        : weekStart.toISOString().slice(0, 10);
  const eligible = trades.filter(
    (trade) => trade.traded_at.slice(0, 10) <= dayKey,
  );
  const included = eligible.filter(
    (trade) => trade.traded_at.slice(0, 10) >= from,
  );
  const hasClosedHistory = eligible.some((trade) => trade.pnl !== null);
  const closed = included.filter((trade) => trade.pnl !== null);
  const wins = closed.filter((trade) => Number(trade.pnl) > 0);
  const losses = closed.filter((trade) => Number(trade.pnl) < 0);
  const pnl = closed.reduce((sum, trade) => sum + Number(trade.pnl), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const grossProfit = wins.reduce((sum, trade) => sum + Number(trade.pnl), 0);
  const grossLoss = losses.reduce((sum, trade) => sum - Number(trade.pnl), 0);
  const profitFactor = grossLoss
    ? (grossProfit / grossLoss).toFixed(2)
    : grossProfit
      ? "∞"
      : "—";
  const rTrades = closed.filter((trade) => trade.result_r !== null);
  const averageR = rTrades.length
    ? rTrades.reduce((sum, trade) => sum + Number(trade.result_r), 0) /
      rTrades.length
    : 0;
  const opening =
    initialBalance +
    eligible
      .filter((trade) => trade.traded_at.slice(0, 10) < from)
      .reduce((sum, trade) => sum + Number(trade.pnl ?? 0), 0);
  const sorted = [...closed].sort((a, b) =>
    a.traded_at.localeCompare(b.traded_at),
  );
  let running = opening;
  const values = [
    opening,
    ...sorted.map((trade) => (running += Number(trade.pnl))),
  ];
  const min = Math.min(...values),
    max = Math.max(...values);
  const span = max - min || Math.max(1, Math.abs(opening) * 0.01);
  const points = values
    .map(
      (value, index) =>
        (index ? "L" : "M") +
        ((index / Math.max(1, values.length - 1)) * 760).toFixed(1) +
        " " +
        (200 - ((value - min) / span) * 160).toFixed(1),
    )
    .join(" ");
  const totalBalance =
    initialBalance +
    eligible.reduce((sum, trade) => sum + Number(trade.pnl ?? 0), 0);
  const symbolMap = new Map<string, { count: number; pnl: number }>();
  const dayMap = new Map<string, { count: number; pnl: number }>();
  for (const trade of eligible) {
    const key = trade.traded_at.slice(0, 10);
    const day = dayMap.get(key) ?? { count: 0, pnl: 0 };
    day.count++;
    day.pnl += Number(trade.pnl ?? 0);
    dayMap.set(key, day);
    if (key < from) continue;
    const symbol = symbolMap.get(trade.symbol) ?? { count: 0, pnl: 0 };
    symbol.count++;
    symbol.pnl += Number(trade.pnl ?? 0);
    symbolMap.set(trade.symbol, symbol);
  }
  const symbols = [...symbolMap]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date, key, ...(dayMap.get(key) ?? { count: 0, pnl: 0 }) };
  });
  const weekToDate = week.filter((day) => day.key <= dayKey);
  const weeklyTrades = weekToDate.reduce((sum, day) => sum + day.count, 0);
  const weeklyPnl = weekToDate.reduce((sum, day) => sum + day.pnl, 0);
  const recent = [...eligible]
    .sort((a, b) => b.traded_at.localeCompare(a.traded_at))
    .slice(0, 3);
  const gainShare =
    grossProfit + grossLoss ? grossProfit / (grossProfit + grossLoss) : 0;
  const periodLabel =
    period === "all"
      ? "All time"
      : period === "week"
        ? "This week"
        : "This month";

  return (
    <div className="original-dashboard">
      <header className="original-dashboard-heading">
        <WelcomeHeading
          eyebrow="PERFORMANCE / OVERVIEW"
          name={username ? `@${username}` : name.split(" ")[0] || "Trader"}
          detail={dateLabel(today, {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
        <div className="original-dashboard-controls">
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
      </header>
      {failed && (
        <p role="alert" className="community-error">
          Your journal could not be loaded. Please refresh to try again.
        </p>
      )}
      <div className="original-week-heading">
        <div>
          <span>THIS WEEK</span>
          <strong>
            {weeklyTrades} {weeklyTrades === 1 ? "trade" : "trades"} recorded
          </strong>
        </div>
        <p
          className={
            weeklyPnl > 0 ? "text-profit" : weeklyPnl < 0 ? "text-loss" : ""
          }
        >
          <Money value={weeklyPnl} compact />
          <span>net result</span>
        </p>
      </div>
      <section className="original-week" aria-label="This week's trading">
        {week.map((day) => (
          <Link
            key={day.key}
            href={"/trades?date=" + day.key}
            className={day.key === dayKey ? "is-today" : ""}
          >
            <div>
              <time dateTime={day.key}>
                {dateLabel(day.date, { weekday: "short", day: "2-digit" })}
              </time>
              {day.key === dayKey && <i aria-label="Today" />}
            </div>
            <div>
              <strong
                className={
                  day.pnl > 0 ? "text-profit" : day.pnl < 0 ? "text-loss" : ""
                }
              >
                {day.count ? <Money value={day.pnl} compact /> : "—"}
              </strong>
              <small>
                {day.count} {day.count === 1 ? "trade" : "trades"}
              </small>
            </div>
          </Link>
        ))}
      </section>
      <section className="original-performance">
        <article className="original-equity">
          <header>
            <div>
              <p>Account Balance</p>
              <strong>
                <Money value={totalBalance} balance />
              </strong>
              <span className={pnl >= 0 ? "text-profit" : "text-loss"}>
                <Money value={pnl} /> · {periodLabel.toLowerCase()}
              </span>
            </div>
            <div className="original-equity-start">
              <p>Start</p>
              <b>
                <Money value={opening} balance />
              </b>
            </div>
          </header>
          {sorted.length ? (
            <div className="original-equity-plot">
              <div className="original-equity-axis">
                {[max, min + span / 2, min].map((value, index) => (
                  <span key={index}>
                    <Money value={value} compact balance />
                  </span>
                ))}
              </div>
              <svg
                viewBox="0 0 760 240"
                preserveAspectRatio="none"
                role="img"
                aria-label="Account balance curve"
                className="original-equity-svg"
              >
                <defs>
                  <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 120, 200].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="760"
                    y1={y}
                    y2={y}
                    stroke="#202020"
                    strokeDasharray="3 5"
                  />
                ))}
                <path
                  d={points + " L760 240 L0 240 Z"}
                  fill="url(#balance-fill)"
                />
                <path
                  d={points}
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="original-equity-dates">
                <time>
                  {dateLabel(new Date(sorted[0]!.traded_at), {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <time>
                  {dateLabel(new Date(sorted[sorted.length - 1]!.traded_at), {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
            </div>
          ) : (
            <div className="original-equity-empty">
              <TrendingUp size={23} />
              <h3>
                No closed trades{" "}
                {period === "all" ? "yet" : periodLabel.toLowerCase()}
              </h3>
              <p>
                {hasClosedHistory
                  ? "Your earlier results are still available in all-time view."
                  : "Your balance curve appears after your first closed trade."}
              </p>
              <Link
                href={
                  hasClosedHistory ? "/dashboard?period=all" : "/trades?add=1"
                }
                className="ui-button"
              >
                {hasClosedHistory ? "View all time" : "Add first trade"}
              </Link>
            </div>
          )}
        </article>
        <div className="original-performance-grid">
          <article className="original-stat">
            <header>
              <h3>Most Traded Assets</h3>
              <p>{periodLabel}</p>
            </header>
            <div className="original-asset-list">
              {symbols.length ? (
                symbols.map(([symbol, stats]) => (
                  <Link
                    key={symbol}
                    href={"/trades?symbol=" + encodeURIComponent(symbol)}
                  >
                    <div>
                      <strong>{symbol}</strong>
                      <span>{stats.count} trades</span>
                    </div>
                    <ArrowUpRight size={15} />
                  </Link>
                ))
              ) : (
                <p className="original-stat-empty">No symbol data yet</p>
              )}
            </div>
          </article>
          <article className="original-stat">
            <header>
              <h3>Total Trades</h3>
              <p>{periodLabel}</p>
            </header>
            <div className="original-stat-body">
              <strong className="original-stat-number">
                {included.length}
              </strong>
              <dl>
                <div>
                  <dt>Winning</dt>
                  <dd className="text-profit">{wins.length}</dd>
                </div>
                <div>
                  <dt>Breakeven</dt>
                  <dd>{closed.length - wins.length - losses.length}</dd>
                </div>
                <div>
                  <dt>Losing</dt>
                  <dd className="text-loss">{losses.length}</dd>
                </div>
              </dl>
            </div>
          </article>
          <article className="original-stat">
            <header>
              <h3>Trade Winrate</h3>
              <p>Closed trades</p>
            </header>
            <div className="original-winrate">
              <dl>
                <div>
                  <dt>Winning trades</dt>
                  <dd className="text-profit">{wins.length}</dd>
                </div>
                <div>
                  <dt>Losing trades</dt>
                  <dd className="text-loss">{losses.length}</dd>
                </div>
              </dl>
              <div
                className="original-win-ring"
                style={{
                  background:
                    "conic-gradient(#22c55e " +
                    winRate * 3.6 +
                    "deg, #202020 0deg)",
                }}
              >
                <div>
                  <strong>{Math.round(winRate)}%</strong>
                  <span>Win rate</span>
                </div>
              </div>
            </div>
          </article>
          <article className="original-stat">
            <header>
              <h3>Profit Factor</h3>
              <p>Gross profit / gross loss</p>
            </header>
            <div className="original-stat-body">
              <strong className="original-stat-number">{profitFactor}</strong>
              <div className="original-profit-scale" aria-hidden="true">
                {Array.from({ length: 20 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      background:
                        grossProfit + grossLoss
                          ? i < Math.round(gainShare * 20)
                            ? "#22c55e"
                            : "#fb7185"
                          : "#252525",
                    }}
                  />
                ))}
              </div>
              <p className="original-stat-caption">
                {closed.length
                  ? grossProfit >= grossLoss
                    ? "Positive net result"
                    : "Negative net result"
                  : "No closed trades"}
              </p>
            </div>
          </article>
        </div>
      </section>
      <section className="original-dashboard-bottom">
        <article className="original-recent">
          <header>
            <div>
              <h3>Recent Trades</h3>
              <p>Latest journal entries</p>
            </div>
            <Link href="/trades" className="ui-button">
              See all <ArrowUpRight size={14} />
            </Link>
          </header>
          <div>
            {recent.length ? (
              recent.map((trade) => (
                <Link
                  key={trade.id}
                  href={"/trades?date=" + trade.traded_at.slice(0, 10)}
                >
                  <span
                    className={
                      Number(trade.pnl) >= 0 ? "text-profit" : "text-loss"
                    }
                  >
                    {["long", "buy"].includes(trade.side.toLowerCase()) ? (
                      <ArrowUpRight size={17} />
                    ) : (
                      <ArrowDownRight size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{trade.symbol}</strong>
                    <small>
                      {trade.side} ·{" "}
                      {dateLabel(new Date(trade.traded_at), {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </div>
                  <b
                    className={
                      Number(trade.pnl) >= 0 ? "text-profit" : "text-loss"
                    }
                  >
                    {trade.pnl === null ? (
                      "Pending"
                    ) : (
                      <Money value={trade.pnl} />
                    )}
                  </b>
                </Link>
              ))
            ) : (
              <p className="original-stat-empty">No trades recorded yet.</p>
            )}
          </div>
        </article>
        <article className="original-execution">
          <header>
            <h3>Execution Review</h3>
            <p>{periodLabel}</p>
          </header>
          <div>
            <section>
              <span>Average R</span>
              <strong>
                {rTrades.length ? averageR.toFixed(2) + "R" : "—"}
              </strong>
              <small>{rTrades.length} trades with R recorded</small>
            </section>
            <section>
              <span>Expectancy</span>
              <strong>
                {closed.length ? <Money value={pnl / closed.length} /> : "—"}
              </strong>
              <small>Per closed trade</small>
            </section>
            <section>
              <span>Trading days</span>
              <strong>
                {
                  new Set(included.map((trade) => trade.traded_at.slice(0, 10)))
                    .size
                }
              </strong>
              <small>{included.length} journal entries</small>
            </section>
          </div>
        </article>
      </section>
    </div>
  );
}
