"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { WorkspaceSectionSkeleton } from "../workspace-section-skeleton";

const AccountSettings = dynamic(
  () => import("../account-settings").then((module) => module.AccountSettings),
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

export function SettingsRouteContent() {
  return <AccountSettings onLogin={openLogin} />;
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
