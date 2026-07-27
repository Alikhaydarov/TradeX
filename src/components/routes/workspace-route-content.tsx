"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { WorkspaceSectionSkeleton } from "../workspace-section-skeleton";

const JournalAccounts = dynamic(
  () =>
    import("../journal/journal-accounts").then(
      (module) => module.JournalAccounts,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const JournalStats = dynamic(
  () =>
    import("../journal/journal-stats").then((module) => module.JournalStats),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const JournalTradeList = dynamic(
  () =>
    import("../journal/journal-trade-list").then(
      (module) => module.JournalTradeList,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const JournalAnalytics = dynamic(
  () =>
    import("../journal/journal-analytics").then(
      (module) => module.JournalAnalytics,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const JournalCalendar = dynamic(
  () =>
    import("../journal/journal-calendar").then(
      (module) => module.JournalCalendar,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const AccountSettings = dynamic(
  () =>
    import("../account-settings").then((module) => module.AccountSettings),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const Account = dynamic(
  () =>
    import("../profile/profile-page").then((module) => module.ProfilePage),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const CommunityWorkspace = dynamic(
  () =>
    import("../community-workspace").then(
      (module) => module.CommunityWorkspace,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const Pricing = dynamic(
  () => import("../pricing").then((module) => module.Pricing),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const AdminPanel = dynamic(
  () => import("../admin-panel").then((module) => module.AdminPanel),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const TradeDetailPage = dynamic(
  () =>
    import("@/features/trades/components/trade-detail-page").then(
      (module) => module.TradeDetailPage,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

export function AccountsRouteContent() {
  return <JournalAccounts />;
}

export function DashboardRouteContent() {
  return <JournalStats />;
}

export function TradesRouteContent() {
  return <JournalTradeList />;
}

export function AnalyticsRouteContent() {
  return <JournalAnalytics />;
}

export function CalendarRouteContent() {
  return <JournalCalendar />;
}

export function SettingsRouteContent() {
  return <AccountSettings onLogin={openLogin} />;
}

export function ProfileRouteContent({ username }: { username?: string }) {
  return <Account onLogin={openLogin} profileUsername={username} />;
}

export function CommunityRouteContent() {
  return <CommunityWorkspace />;
}

export function PricingRouteContent() {
  return <Pricing onLogin={openLogin} />;
}

export function AdminRouteContent() {
  return <AdminPanel onLogin={openLogin} />;
}

export function TradeDetailRouteContent({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  return (
    <TradeDetailPage
      tradeId={tradeId}
      onBack={() => router.push("/trades")}
    />
  );
}
