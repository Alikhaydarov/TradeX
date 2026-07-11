"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "./auth-modal";
import { FeedV3 } from "./feed-v3";
import { Account } from "./account";
import { AdminPanel } from "./admin-panel";
import { ActiveAccountProvider } from "./active-account-context";
import { Pricing } from "./pricing";
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
import { Sidebar } from "./sidebar";
import { UserSettingsDialog } from "./user-settings-dialog";
import { WorkspaceTopbar } from "./workspace-topbar";
import { WorkspacePreferencesProvider, useWorkspacePreferences } from "./workspace-preferences-context";
import { TradeWayLoginLanding } from "./tradeway-login-landing";
import {
  AccountsSection,
  AnalyticsSection,
  CalendarSection,
  DashboardSection,
  TradesSection,
  WorkspaceSettingsSection,
} from "./workspace-sections";
import { useAuth } from "./auth-context";
import { getCurrentProfileUsername, getCurrentSection, pathFromSection } from "./section-config";
import { apiRequest } from "@/lib/api-client";
import type { Section } from "./types";
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
  const [profileUsername, setProfileUsername] = useState(getCurrentProfileUsername);
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsMounted, setNotificationsMounted] = useState(false);
  const [profileOpening, setProfileOpening] = useState(false);
  const { user } = useAuth();
  const { fontFamily } = useWorkspacePreferences();
  const resolvedFontFamily =
    fontFamily === "Geist"
      ? "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif"
      : fontFamily === "System UI"
        ? "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        : "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif";
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
      window.clearTimeout(timer);
    };
  }, [user]);

  useEffect(() => {
    if (section === "admin" && user && !isAdmin) {
      const timer = window.setTimeout(() => {
        window.history.replaceState(null, "", "/");
        setSection("feed");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [section, user, isAdmin]);

  const changeSection = (nextSection: Section) => {
    if (nextSection === "admin" && !isAdmin) return;
    if (nextSection === section && nextSection !== "account") return;
    setProfileUsername("");
    setSection(nextSection);
    window.history.pushState(null, "", pathFromSection(nextSection));
  };

  const renderSection = (item: Section) => {
    if (item === "accounts") return <AccountsSection onLogin={openLogin} />;
    if (item === "dashboard") return <DashboardSection onLogin={openLogin} />;
    if (item === "calendar") return <CalendarSection onLogin={openLogin} />;
    if (item === "trades") return <TradesSection onLogin={openLogin} />;
    if (item === "analytics") return <AnalyticsSection onLogin={openLogin} />;
    if (item === "settings") return <WorkspaceSettingsSection onLogin={openLogin} />;
    if (item === "account") return <Account onLogin={openLogin} profileUsername={profileUsername || undefined} />;
    if (item === "pricing") return <Pricing />;
    if (item === "admin" && isAdmin) return <AdminPanel onLogin={openLogin} />;
    return <FeedV3 onLogin={openLogin} />;
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
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1920px] gap-4 overflow-hidden bg-[#000000] p-0 text-foreground lg:p-4" style={{ fontFamily: resolvedFontFamily }}>
        <Sidebar
          active={section}
          onChange={changeSection}
          onLogin={openLogin}
          user={user}
          isAdmin={isAdmin}
        />
        <div className="hidden w-[248px] shrink-0 lg:block" aria-hidden="true" />
        <main className="h-[100dvh] min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#000000] lg:h-[calc(100dvh-2rem)] lg:rounded-[1rem] lg:border lg:border-white/8">
          <WorkspaceTopbar section={section} />
          <section key={section} className="min-h-full">
            {renderSection(section)}
          </section>
        </main>
      </div>
      </ActiveAccountProvider>
      {profileOpening ? <div className="pointer-events-none fixed inset-0 z-[2147483646] grid place-items-center bg-black/92"><div className="flex items-center gap-3 rounded-full border border-white/8 bg-[#050505] px-4 py-2 text-sm font-semibold text-zinc-200 shadow-[0_18px_48px_rgba(0,0,0,.34)]"><span className="inline-flex size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> Opening profile</div></div> : null}
      {notificationsMounted && <NotificationListener />}
      <PremiumUpsellDialog />
      <UserSettingsDialog />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
