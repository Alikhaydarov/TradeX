import {
  DashboardOverview,
  type JournalPeriod,
} from "@/components/dashboard-overview";
import { getJournalData } from "@/lib/journal-data";
import { getWorkspaceBootstrap } from "@/lib/workspace-bootstrap";
import { getSelectedAccountId } from "@/lib/selected-account";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ user, trades, failed }, params, workspace] = await Promise.all([
    getJournalData(),
    searchParams,
    getWorkspaceBootstrap(),
  ]);
  const period: JournalPeriod =
    params.period === "week" || params.period === "all"
      ? params.period
      : "month";
  const name = String(
    workspace.profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.username ||
      user?.email?.split("@")[0] ||
      "Trader",
  );
  const selected = await getSelectedAccountId();
  const initialBalance = workspace.accounts
    .filter((account) => !selected || account.id === selected)
    .reduce(
      (total, account) => total + Number(account.initial_balance || 0),
      0,
    );
  return (
    <DashboardOverview
      name={name}
      username={workspace.profile?.username}
      trades={trades}
      failed={failed}
      period={period}
      initialBalance={initialBalance}
    />
  );
}
