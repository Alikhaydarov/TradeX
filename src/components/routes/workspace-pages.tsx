"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { AppLoader } from "@/components/app-loader";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/components/auth-context";
import { WorkspaceRouteShell } from "@/components/workspace-route-shell";
import { WorkspaceSectionSkeleton } from "@/components/workspace-section-skeleton";

const Journal = dynamic(
  () => import("@/components/journal").then((module) => module.Journal),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const FeedV3 = dynamic(
  () => import("@/components/feed-v3").then((module) => module.FeedV3),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const CalendarWorkspace = dynamic(
  () =>
    import("@/components/calendar-workspace-v2").then(
      (module) => module.CalendarWorkspaceV2,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const AccountSettings = dynamic(
  () =>
    import("@/components/account-settings").then(
      (module) => module.AccountSettings,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const CommunityWorkspace = dynamic(
  () =>
    import("@/components/community-workspace").then(
      (module) => module.CommunityWorkspace,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const Account = dynamic(
  () => import("@/components/account").then((module) => module.Account),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const Pricing = dynamic(
  () => import("@/components/pricing").then((module) => module.Pricing),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const AdminPanel = dynamic(
  () =>
    import("@/components/admin-panel").then((module) => module.AdminPanel),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

function useLoginAction() {
  const router = useRouter();
  return () => router.push("/");
}

export function FeedRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="feed">
      <FeedV3 onLogin={onLogin} />
    </WorkspaceRouteShell>
  );
}

export function AccountsRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="accounts">
      <Journal onLogin={onLogin} mode="accounts" />
    </WorkspaceRouteShell>
  );
}

export function JournalRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="accounts">
      <Journal onLogin={onLogin} mode="accounts" />
    </WorkspaceRouteShell>
  );
}

export function DashboardRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="dashboard">
      <Journal onLogin={onLogin} mode="workspace" forcedTab="overview" />
    </WorkspaceRouteShell>
  );
}

export function TradesRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="trades">
      <Journal onLogin={onLogin} mode="workspace" forcedTab="trades" />
    </WorkspaceRouteShell>
  );
}

export function AnalyticsRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="analytics">
      <Journal onLogin={onLogin} mode="workspace" forcedTab="analytics" />
    </WorkspaceRouteShell>
  );
}

export function CalendarRoute() {
  return (
    <WorkspaceRouteShell section="calendar">
      <CalendarWorkspace />
    </WorkspaceRouteShell>
  );
}

export function SettingsRoute() {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="settings">
      <AccountSettings onLogin={onLogin} />
    </WorkspaceRouteShell>
  );
}

export function CommunityHubRoute() {
  return (
    <WorkspaceRouteShell section="community">
      <CommunityWorkspace />
    </WorkspaceRouteShell>
  );
}

export function ProfileRoute({ username }: { username?: string }) {
  const onLogin = useLoginAction();
  return (
    <WorkspaceRouteShell section="account">
      <Account onLogin={onLogin} profileUsername={username} />
    </WorkspaceRouteShell>
  );
}

export function PricingRoute() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (!user) {
    return (
      <>
        <Pricing onLogin={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <WorkspaceRouteShell section="pricing">
      <Pricing />
    </WorkspaceRouteShell>
  );
}

export function AdminRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void apiRequest<{ isAdmin: boolean }>("/api/admin/me")
      .then((response) => {
        if (!active) return;
        setIsAdmin(response.isAdmin);
        if (!response.isAdmin) router.replace("/");
      })
      .catch(() => {
        if (!active) return;
        setIsAdmin(false);
        router.replace("/");
      });
    return () => {
      active = false;
    };
  }, [router, user]);

  return (
    <WorkspaceRouteShell section="admin">
      {isAdmin === true ? (
        <AdminPanel onLogin={() => router.push("/")} />
      ) : (
        <AppLoader label="Checking admin access" />
      )}
    </WorkspaceRouteShell>
  );
}
