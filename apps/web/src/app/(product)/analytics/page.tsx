import Link from "next/link";
import { Activity, BarChart3, Percent, Trophy } from "lucide-react";
import { MetricCard, PageHeader, Panel } from "@/components/page-primitives";
import { getJournalData, summarizeTrades } from "@/lib/journal-data";
import { Money } from "@/components/pnl-preferences";
const money = (value: number) => <Money value={value} />;

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { trades, failed } = await getJournalData();
  const summary = summarizeTrades(trades);
  const symbols = new Map<
    string,
    { pnl: number; trades: number; wins: number }
  >();
  for (const trade of trades) {
    const item = symbols.get(trade.symbol) ?? { pnl: 0, trades: 0, wins: 0 };
    item.pnl += trade.pnl ?? 0;
    item.trades += 1;
    if ((trade.pnl ?? 0) > 0) item.wins += 1;
    symbols.set(trade.symbol, item);
  }
  const ranked = [...symbols].sort((a, b) => b[1].pnl - a[1].pnl).slice(0, 6);
  const days = new Map<string, number>();
  for (const trade of trades)
    days.set(
      trade.traded_at.slice(0, 10),
      (days.get(trade.traded_at.slice(0, 10)) ?? 0) + (trade.pnl ?? 0),
    );
  const distribution = [...days].slice(0, 20).reverse();
  const scale = Math.max(
    1,
    ...distribution.map(([, value]) => Math.abs(value)),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Journal intelligence"
        title="Performance analytics"
        description="Understand your actual outcomes, instrument by instrument. Values use your latest 1,000 recorded trades."
        action={
          <Link
            href="/trades"
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm hover:bg-[var(--elevated)]"
          >
            Open journal
          </Link>
        }
      />
      {failed && (
        <p
          role="status"
          className="rounded-md border border-[#54373a] bg-[#1a1011] px-4 py-3 text-sm text-[#ff9ea7]"
        >
          Your analytics could not be loaded. Please retry.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Expectancy"
          value={money(summary.expectancy)}
          helper="Per closed trade"
          icon={Activity}
          tone={summary.expectancy >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Average R"
          value={`${summary.averageR.toFixed(2)}R`}
          helper="Recorded risk multiple"
          icon={BarChart3}
        />
        <MetricCard
          label="Win rate"
          value={`${summary.winRate.toFixed(1)}%`}
          helper={`${summary.wins} wins · ${summary.losses} losses`}
          icon={Percent}
        />
        <MetricCard
          label="Profit factor"
          value={
            Number.isFinite(summary.profitFactor)
              ? summary.profitFactor.toFixed(2)
              : "∞"
          }
          helper="Gross profit / gross loss"
          icon={Trophy}
          tone="positive"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Daily realized P&amp;L"
          description={
            <>
              Net {money(summary.pnl)} across {trades.length} trades
            </>
          }
        >
          {distribution.length ? (
            <div className="flex min-h-64 items-end gap-1.5 overflow-x-auto pb-6 pt-3">
              {distribution.map(([day, value]) => (
                <div
                  key={day}
                  className="group relative flex h-52 min-w-3 flex-1 items-end"
                  aria-label={day}
                >
                  <div
                    className={`w-full rounded-t-sm ${value >= 0 ? "bg-[var(--primary)]/75" : "bg-[var(--danger)]/75"}`}
                    style={{
                      height: `${Math.max(3, (Math.abs(value) / scale) * 100)}%`,
                    }}
                  />
                  <span className="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[9px] text-[var(--muted)] group-hover:block">
                    {day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <p className="text-sm">Not enough journal data yet</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Log a few trades to reveal your performance pattern.
                </p>
              </div>
            </div>
          )}
        </Panel>
        <Panel
          title="By instrument"
          description="Ranked by net realized P&amp;L"
        >
          {ranked.length ? (
            <div className="divide-y divide-[var(--border)]">
              {ranked.map(([symbol, item]) => (
                <div
                  key={symbol}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{symbol}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.trades} trades ·{" "}
                      {item.trades
                        ? ((item.wins / item.trades) * 100).toFixed(0)
                        : 0}
                      % wins
                    </p>
                  </div>
                  <strong
                    className={`shrink-0 font-mono text-sm ${item.pnl >= 0 ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}
                  >
                    {money(item.pnl)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Your traded instruments will appear here.
            </p>
          )}
        </Panel>
      </div>
      <Panel
        title="Outcome snapshot"
        description="A transparent summary from your journal"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-[var(--border)] bg-[#080a0b] p-4">
            <p className="text-xs text-[var(--muted)]">Closed trades</p>
            <p className="mt-2 font-mono text-xl">{summary.closed}</p>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[#080a0b] p-4">
            <p className="text-xs text-[var(--muted)]">Gross P&amp;L</p>
            <p
              className={`mt-2 font-mono text-xl ${summary.pnl >= 0 ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}
            >
              {money(summary.pnl)}
            </p>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[#080a0b] p-4">
            <p className="text-xs text-[var(--muted)]">Top instrument</p>
            <p className="mt-2 font-mono text-xl">{ranked[0]?.[0] ?? "—"}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
