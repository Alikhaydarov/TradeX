"use client";

import dynamic from "next/dynamic";

import type { WorkspaceTab } from "../journal-v2";
import { WorkspaceSectionSkeleton } from "../workspace-section-skeleton";

const Journal = dynamic(
  () => import("../journal").then((module) => module.Journal),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const CalendarWorkspaceV2 = dynamic(
  () =>
    import("../calendar-workspace-v2").then(
      (module) => module.CalendarWorkspaceV2,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const AccountSettings = dynamic(
  () =>
    import("../account-settings").then((module) => module.AccountSettings),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

const Account = dynamic(
  () => import("../account").then((module) => module.Account),
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

function openLogin() {
  window.dispatchEvent(
    new CustomEvent("tradeup:open-auth", { detail: { mode: "login" } }),
  );
}

function JournalWorkspaceRoute({ forcedTab }: { forcedTab: WorkspaceTab }) {
  return (
    <Journal onLogin={openLogin} mode="workspace" forcedTab={forcedTab} />
  );
}

export function AccountsRouteContent() {
  return <Journal onLogin={openLogin} mode="accounts" />;
}

export function DashboardRouteContent() {
  return <JournalWorkspaceRoute forcedTab="overview" />;
}

export function TradesRouteContent() {
  return <JournalWorkspaceRoute forcedTab="trades" />;
}

export function AnalyticsRouteContent() {
  return <JournalWorkspaceRoute forcedTab="analytics" />;
}

export function CalendarRouteContent() {
  return <CalendarWorkspaceV2 />;
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
