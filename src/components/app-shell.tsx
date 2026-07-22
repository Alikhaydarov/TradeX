"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AuthModal } from "./auth-modal";
import { ActiveAccountProvider } from "./active-account-context";
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
import { Sidebar } from "./sidebar";
import { WorkspaceTopbar } from "./workspace-topbar";
import { WorkspacePreferencesProvider } from "./workspace-preferences-context";
import { TradeWayLoginLanding } from "./tradeway-login-landing";
import type { WorkspaceTab } from "./journal-v2";
import { useAuth } from "./auth-context";
import {
  getCurrentProfileUsername,
  getCurrentSection,
  pathFromSection,
} from "./section-config";
import { apiRequest } from "@/lib/api-client";
import type { Section } from "./types";
import { Spinner } from "./ui/spinner";
import { WorkspaceSectionSkeleton } from "./workspace-section-skeleton";
import { FreeUserStart } from "./free-user-start";

const UserSettingsDialog = dynamic(
  () =>
    import("./user-settings-dialog").then(
      (module) => module.UserSettingsDialog,
    ),
  { ssr: false },
);
const FeedV3 = dynamic(
  () => import("./feed-v3").then((module) => module.FeedV3),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const Account = dynamic(
  () => import("./account").then((module) => module.Account),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const AdminPanel = dynamic(
  () => import("./admin-panel").then((module) => module.AdminPanel),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const Pricing = dynamic(
  () => import("./pricing").then((module) => module.Pricing),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const AccountSettings = dynamic(
  () => import("./account-settings").then((module) => module.AccountSettings),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const Journal = dynamic(
  () => import("./journal").then((module) => module.Journal),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const CalendarWorkspaceV2 = dynamic(
  () =>
    import("./calendar-workspace-v2").then(
      (module) => module.CalendarWorkspaceV2,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const CommunityWorkspace = dynamic(
  () =>
    import("./community-workspace").then((module) => module.CommunityWorkspace),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
function AuthGate({ onLogin }: { onLogin: () => void }) {
  return <TradeWayLoginLanding onLogin={onLogin} />;
}

export function AppShell() {
  return (
    <WorkspacePreferencesProvider>
      <AppShellInner />
    </WorkspacePreferencesProvider>
  );
}

function AppShellInner() {
  const [section, setSection] = useState<Section>(getCurrentSection);
  const [profileUsername, setProfileUsername] = useState(
    getCurrentProfileUsername,
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notificationsMounted, setNotificationsMounted] = useState(false);
  const [profileOpening, setProfileOpening] = useState(false);
  const workspaceMainRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const openLogin = () => setAuthOpen(true);

  useEffect(() => {
    const syncFromPath = () => {
      const nextSection = getCurrentSection();
      setSection(nextSection);
      setProfileUsername(getCurrentProfileUsername());
    };
    const handleOpenProfile = () => {
      setProfileOpening(true);
      syncFromPath();
    };
    const handleProfileReady = () => {
      window.setTimeout(() => setProfileOpening(false), 40);
    };
    window.addEventListener("popstate", syncFromPath);
    window.addEventListener("tradeup:open-profile", handleOpenProfile);
    window.addEventListener("tradeup:profile-ready", handleProfileReady);
    return () => {
      window.removeEventListener("popstate", syncFromPath);
      window.removeEventListener("tradeup:open-profile", handleOpenProfile);
      window.removeEventListener("tradeup:profile-ready", handleProfileReady);
    };
  }, []);

  useEffect(() => {
    if (!profileOpening) return;
    const timer = window.setTimeout(() => setProfileOpening(false), 180);
    return () => window.clearTimeout(timer);
  }, [profileOpening]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNotificationsMounted(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setIsAdmin(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    const pendingTimer = window.setTimeout(() => setIsAdmin(null), 0);
    const timer = window.setTimeout(() => {
      void apiRequest<{ isAdmin: boolean }>("/api/admin/me")
        .then((response) => {
          if (active) setIsAdmin(response.isAdmin);
        })
        .catch(() => {
          if (active) setIsAdmin(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(pendingTimer);
      window.clearTimeout(timer);
    };
  }, [user]);

  useEffect(() => {
    if (section === "admin" && user && isAdmin === false) {
      const timer = window.setTimeout(() => {
        window.history.replaceState(null, "", "/");
        setSection("feed");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [section, user, isAdmin]);

  const changeSection = (nextSection: Section) => {
    if (nextSection === "admin" && isAdmin !== true) return;
    if (
      nextSection === section &&
      nextSection !== "account" &&
      nextSection !== "calendar"
    )
      return;
    setProfileUsername("");
    setSection(nextSection);
    window.history.pushState(null, "", pathFromSection(nextSection));
    window.dispatchEvent(new Event("popstate"));
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const renderSection = (item: Section) => {
    if (item === "accounts")
      return <Journal onLogin={openLogin} mode="accounts" />;
    if (item === "calendar") return <CalendarWorkspaceV2 />;
    const workspaceTabs: Partial<Record<Section, WorkspaceTab>> = {
      dashboard: "overview",
      trades: "trades",
      analytics: "analytics",
    };
    const workspaceTab = workspaceTabs[item];
    if (workspaceTab)
      return (
        <Journal
          onLogin={openLogin}
          mode="workspace"
          forcedTab={workspaceTab}
        />
      );
    if (item === "settings") return <AccountSettings onLogin={openLogin} />;
    if (item === "community") return <CommunityWorkspace />;
    if (item === "account")
      return (
        <Account
          onLogin={openLogin}
          profileUsername={profileUsername || undefined}
        />
      );
    if (item === "pricing") return <Pricing />;
    if (item === "admin" && isAdmin === null) {
      return (
        <div className="grid min-h-[60vh] place-items-center text-sm font-semibold text-zinc-400">
          Checking admin access...
        </div>
      );
    }
    if (item === "admin" && isAdmin)
      return <AdminPanel onLogin={openLogin} />;
    return (
      <FreeUserStart>
        <FeedV3 onLogin={openLogin} />
      </FreeUserStart>
    );
  };

  if (!user && section === "pricing") {
    return (
      <>
        <Pricing onLogin={openLogin} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGate onLogin={openLogin} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <>
      <ActiveAccountProvider>
        <div
          className="workspace-shell mx-auto flex h-[100dvh] w-full max-w-[1920px] gap-0 overflow-hidden bg-[#000000] p-0 text-foreground lg:gap-3 lg:p-3"
        >
          <Sidebar
            active={section}
            onChange={changeSection}
            onLogin={openLogin}
            user={user}
          />
          <div
            className="hidden w-[286px] shrink-0 lg:block"
            aria-hidden="true"
          />
          <main
            ref={workspaceMainRef}
            data-workspace-main
            className="workspace-main h-[100dvh] min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden bg-[#000000] pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:h-[calc(100dvh-2rem)] lg:rounded-[1rem] lg:border lg:border-white/8 lg:pb-0"
          >
            <WorkspaceTopbar section={section} />
            <section className="min-h-full">{renderSection(section)}</section>
          </main>
        </div>
      </ActiveAccountProvider>
      {profileOpening ? (
        <div
          className="pointer-events-none fixed right-3 top-3 z-[2147483646] flex items-center gap-2 rounded-lg border border-white/10 bg-[#111]/95 px-3 py-2 text-xs font-semibold text-zinc-200 shadow-xl"
          role="status"
          aria-live="polite"
        >
          <Spinner className="size-3.5" /> Opening profile
        </div>
      ) : null}
      {notificationsMounted && <NotificationListener />}
      <PremiumUpsellDialog />
      <UserSettingsDialog />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
