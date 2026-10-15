import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Flag,
  Target,
  TrendingUp,
} from "lucide-react";
import { MetricCard, PageHeader, Panel } from "@/components/page-primitives";
import { getAccountProgress } from "@/lib/account-progress";
import { Money } from "@/components/pnl-preferences";
const money = (value: number) => <Money value={value} />;

export const dynamic = "force-dynamic";

export default async function EvaluationsPage() {
  const { account, trades, failed } = await getAccountProgress();
  const pnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const target = account?.profit_target ?? 0;
  const progress =
    target > 0 ? Math.max(0, Math.min(100, (pnl / target) * 100)) : null;
  const tradingDays = new Set(
    trades.map((trade) => trade.traded_at.slice(0, 10)),
  ).size;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account tracking"
        title="Evaluation progress"
        description="Follow the targets and trading activity configured for your selected account."
        action={
          account && (
            <Link
              href="/accounts"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 text-sm hover:bg-[var(--elevated)]"
            >
              Account settings <ArrowUpRight size={15} />
            </Link>
          )
        }
      />
      {failed && (
        <p
          role="status"
          className="rounded-md border border-[#4b292f] bg-[#1b0e11] px-4 py-3 text-sm text-[#ff9ea7]"
        >
          Account data could not be loaded. Refresh and try again.
        </p>
      )}
      {!account ? (
        <Panel
          title="Choose an account"
          description="Progress is calculated from the selected account and its journal entries."
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              Select an account from the header, or create one before tracking
              an evaluation.
            </p>
            <Link
              href="/accounts"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-black"
            >
              Manage accounts <ArrowUpRight size={15} />
            </Link>
          </div>
        </Panel>
      ) : (
        <>
          <Panel
            title={account.name}
            description={
              [account.firm, account.phase, account.status]
                .filter(Boolean)
                .join(" · ") || "Selected trading account"
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Journal P&L"
                value={money(pnl)}
                helper={`${trades.length} recorded trades`}
                icon={TrendingUp}
                tone={pnl >= 0 ? "positive" : "warning"}
              />
              <MetricCard
                label="Profit target"
                value={target > 0 ? money(target) : "Not set"}
                helper={
                  progress === null
                    ? "Configure a target on the account"
                    : `${progress.toFixed(1)}% of target`
                }
                icon={Target}
              />
              <MetricCard
                label="Target remaining"
                value={target > 0 ? money(Math.max(0, target - pnl)) : "—"}
                helper={
                  target > 0 && pnl >= target
                    ? "Configured target reached"
                    : "Based on recorded net P&L"
                }
                icon={Flag}
                tone={target > 0 && pnl >= target ? "positive" : "default"}
              />
              <MetricCard
                label="Trading days"
                value={String(tradingDays)}
                helper="Distinct dates in this account journal"
                icon={CalendarDays}
              />
            </div>
            {target > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-[var(--muted)]">Target progress</span>
                  <span className="font-mono">
                    {money(pnl)} / {money(target)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </Panel>
          <Panel
            title="Configured rules"
            description="These are the limits saved on this account, not a third-party evaluation feed."
          >
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Account size", account.account_size],
                ["Maximum daily drawdown", account.daily_drawdown],
                ["Maximum drawdown", account.max_drawdown],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-md border border-[var(--border)] bg-[var(--secondary)] p-4"
                >
                  <p className="text-xs text-[var(--muted)]">{String(label)}</p>
                  <p className="mt-3 font-mono text-lg font-semibold">
                    {typeof value === "number" && value > 0
                      ? money(value)
                      : "Not configured"}
                  </p>
                </div>
              ))}
            </div>
            {!target && (
              <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                Add a profit target to this account to see target progress.
                Minimum trading days and pass/fail rules are not stored, so this
                page does not infer them.
              </p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
