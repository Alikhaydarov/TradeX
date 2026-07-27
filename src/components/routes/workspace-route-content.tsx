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
