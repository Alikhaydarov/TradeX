import Link from "next/link";
import { ArrowUpRight, Gauge, ShieldAlert, ShieldCheck } from "lucide-react";
import { MetricCard, PageHeader, Panel } from "@/components/page-primitives";
import { getAccountProgress } from "@/lib/account-progress";
import { Money } from "@/components/pnl-preferences";
const money = (value: number) => <Money value={value} />;

export const dynamic = "force-dynamic";

function LimitMeter({
  label,
  used,
  limit,
  detail,
}: {
  label: string;
  used: number;
  limit: number | null;
  detail: React.ReactNode;
}) {
  const ratio = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-[var(--muted)]">{detail}</span>
      </div>
      {ratio === null ? (
        <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
          No limit configured for this account.
        </div>
      ) : (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
            <div
              className={`h-full rounded-full ${ratio >= 100 ? "bg-[var(--danger)]" : "bg-[var(--primary)]"}`}
              style={{ width: `${ratio}%` }}
            />
          </div>
          <p className="mt-1.5 text-right font-mono text-[10px] text-[var(--muted)]">
            {ratio.toFixed(1)}% used
          </p>
        </>
      )}
    </div>
  );
}

export default async function RiskPage() {
  const { account, trades, failed } = await getAccountProgress();
  const today = new Date().toLocaleDateString("en-CA");
  const todayTrades = trades.filter(
    (trade) => trade.traded_at.slice(0, 10) === today,
  );
  const todayPnl = todayTrades.reduce(
    (sum, trade) => sum + (trade.pnl ?? 0),
    0,
  );
  const todayLoss = Math.max(0, -todayPnl);
  let equity = account?.initial_balance ?? 0;
  let equityPeak = equity;
  let maxObservedDrawdown = 0;
  for (const trade of [...trades].sort((a, b) =>
    a.traded_at.localeCompare(b.traded_at),
  )) {
    equity += trade.pnl ?? 0;
    equityPeak = Math.max(equityPeak, equity);
    maxObservedDrawdown = Math.max(maxObservedDrawdown, equityPeak - equity);
  }
  const largestRisk = Math.max(
    0,
    ...trades.map((trade) => trade.risk_amount ?? 0),
  );
  const dailyLimit = account?.daily_drawdown ?? null;
  const totalLimit = account?.max_drawdown ?? null;
  const alerts =
    Number(Boolean(dailyLimit && dailyLimit > 0 && todayLoss >= dailyLimit)) +
    Number(
      Boolean(
        totalLimit && totalLimit > 0 && maxObservedDrawdown >= totalLimit,
      ),
    );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Journal-based monitoring"
        title="Risk overview"
        description="Review realized results against limits saved on your selected account. Open positions are not tracked by this journal."
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
          description="Risk numbers are calculated from one account at a time."
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              Select or create an account to review your recorded risk.
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
                label="Today's realized P&L"
                value={money(todayPnl)}
                helper={`${todayTrades.length} journaled trades today`}
                icon={Gauge}
                tone={todayPnl >= 0 ? "positive" : "warning"}
              />
              <MetricCard
                label="Daily loss used"
                value={dailyLimit && dailyLimit > 0 ? money(todayLoss) : "—"}
                helper={
                  dailyLimit && dailyLimit > 0 ? (
                    <>of {money(dailyLimit)} configured</>
                  ) : (
                    "Set a daily drawdown limit"
                  )
                }
                icon={ShieldCheck}
              />
              <MetricCard
                label="Peak-to-trough drawdown"
                value={money(maxObservedDrawdown)}
                helper="Historical realized equity decline"
                icon={ShieldAlert}
                tone={
                  totalLimit &&
                  totalLimit > 0 &&
                  maxObservedDrawdown >= totalLimit
                    ? "warning"
                    : "default"
                }
              />
              <MetricCard
                label="Largest recorded trade risk"
                value={largestRisk ? money(largestRisk) : "—"}
                helper="From risk amounts on journal entries"
                icon={Gauge}
              />
            </div>
          </Panel>
          <Panel
            title="Configured drawdown limits"
            description="Bars show realized journal drawdown only; open positions and unrealized P&L are not included."
          >
            <div className="space-y-6">
              <LimitMeter
                label="Daily drawdown"
                used={todayLoss}
                limit={dailyLimit}
                detail={
                  <>
                    {money(todayLoss)} realized loss today
                    {dailyLimit && dailyLimit > 0 ? (
                      <> · {money(dailyLimit)} limit</>
                    ) : null}
                  </>
                }
              />
              <LimitMeter
                label="Largest peak-to-trough drawdown"
                used={maxObservedDrawdown}
                limit={totalLimit}
                detail={
                  <>
                    {money(maxObservedDrawdown)} observed
                    {totalLimit && totalLimit > 0 ? (
                      <> · {money(totalLimit)} limit</>
                    ) : null}
                  </>
                }
              />
            </div>
            <div
              className={`mt-5 rounded-md border px-4 py-3 text-sm ${alerts ? "border-[#4b292f] bg-[#1b0e11] text-[#ff9ea7]" : "border-[var(--border)] bg-[var(--secondary)] text-[var(--muted)]"}`}
              role="status"
            >
              {alerts
                ? `${alerts} configured drawdown limit${alerts === 1 ? " has" : "s have"} been reached based on journaled trades.`
                : "No configured drawdown limit has been reached by the recorded results."}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
