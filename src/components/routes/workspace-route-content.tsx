"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { ProfileSeed } from "../profile/use-profile-controller";

const loadJournalAccounts = () =>
  import("../journal/journal-accounts").then(
    (module) => module.JournalAccounts,
  );

const loadJournalStats = () =>
  import("../journal/journal-stats").then((module) => module.JournalStats);

const loadJournalTradeList = () =>
  import("../journal/journal-trade-list").then(
    (module) => module.JournalTradeList,
  );

const loadJournalAnalytics = () =>
  import("../journal/journal-analytics").then(
    (module) => module.JournalAnalytics,
  );

const loadJournalCalendar = () =>
  import("../journal/journal-calendar").then(
    (module) => module.JournalCalendar,
  );

const loadAccountSettings = () =>
  import("../account-settings").then((module) => module.AccountSettings);

const loadProfilePage = () =>
  import("../profile/profile-page").then((module) => module.ProfilePage);

const loadCommunityWorkspace = () =>
  import("../community-workspace").then(
    (module) => module.CommunityWorkspace,
  );

const loadPricing = () => import("../pricing").then((module) => module.Pricing);

const loadAdminPanel = () =>
  import("../admin-panel").then((module) => module.AdminPanel);

const loadTradeDetailPage = () =>
  import("@/features/trades/components/trade-detail-page").then(
    (module) => module.TradeDetailPage,
  );

const JournalAccounts = dynamic(loadJournalAccounts);

const JournalStats = dynamic(loadJournalStats);

const JournalTradeList = dynamic(loadJournalTradeList);

const JournalAnalytics = dynamic(loadJournalAnalytics);

const JournalCalendar = dynamic(loadJournalCalendar);

const AccountSettings = dynamic(loadAccountSettings);

const Account = dynamic(loadProfilePage);

const CommunityWorkspace = dynamic(loadCommunityWorkspace);

const Pricing = dynamic(loadPricing);

const AdminPanel = dynamic(loadAdminPanel);

const TradeDetailPage = dynamic(loadTradeDetailPage);

function warm(loader: () => Promise<unknown>) {
  void loader().catch(() => undefined);
}

/** Warm route chunks before navigation so workspace changes feel instant. */
export function preloadWorkspaceRoute(pathname: string) {
  if (pathname === "/accounts") return warm(loadJournalAccounts);
  if (pathname === "/dashboard") return warm(loadJournalStats);
  if (pathname === "/trades") return warm(loadJournalTradeList);
  if (pathname === "/analytics") return warm(loadJournalAnalytics);
  if (pathname.startsWith("/calendar")) return warm(loadJournalCalendar);
  if (pathname === "/settings") return warm(loadAccountSettings);
  if (pathname === "/profile" || /^\/[^/]+$/.test(pathname)) {
    return warm(loadProfilePage);
  }
  if (pathname.startsWith("/community")) return warm(loadCommunityWorkspace);
  if (pathname === "/pricing") return warm(loadPricing);
  if (pathname === "/superadmin" || pathname === "/admin") {
    return warm(loadAdminPanel);
  }
  if (pathname.startsWith("/trades/")) return warm(loadTradeDetailPage);
}

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

export function ProfileRouteContent({
  username,
  seed,
}: {
  username?: string;
  seed?: ProfileSeed;
}) {
  return (
    <Account onLogin={openLogin} profileUsername={username} seed={seed} />
  );
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
