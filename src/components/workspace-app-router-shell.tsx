"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { apiRequest } from "@/lib/api-client";
import {
  CommunitySidebar,
  type CommunitySection,
} from "@/features/community/components/community-sidebar";
import { ActiveAccountProvider } from "./active-account-context";
import { AuthModal } from "./auth-modal";
import { useAuth } from "./auth-context";
import { FreeUserStart } from "./free-user-start";
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
import {
  pathFromSection,
  sectionFromPath,
  usernameFromPath,
} from "./section-config";
import { Sidebar } from "./sidebar";
import type { Section } from "./types";
import { Spinner } from "./ui/spinner";
import { WorkspaceBootLoader } from "./workspace-boot-loader";
import { WorkspacePreferencesProvider } from "./workspace-preferences-context";
import { WorkspaceSectionSkeleton } from "./workspace-section-skeleton";
import { WorkspaceTopbar } from "./workspace-topbar";
import { TradeWayLoginLanding } from "./tradeway-login-landing";
import type { WorkspaceTab } from "./journal-v2";

const APP_ROUTER_CONTENT_PATHS = new Set([
  "/",
  "/accounts",
  "/dashboard",
  "/trades",
  "/analytics",
  "/calendar",
]);

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
    import("./community-workspace").then(
      (module) => module.CommunityWorkspace,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);
const TradeDetailPage = dynamic(
  () =>
    import("@/features/trades/components/trade-detail-page").then(
      (module) => module.TradeDetailPage,
    ),
  { ssr: false, loading: () => <WorkspaceSectionSkeleton /> },
);

function tradeIdFromPath(pathname: string) {
  const match = pathname.match(/^\/trades\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function communityRouteFromPath(pathname: string) {
  const match = pathname.match(
    /^\/community\/([^/]+)(?:\/(overview|analytics|leaderboard|members|chat))?\/?$/,
  );
  if (!match?.[1]) return null;
  return {
    communityId: decodeURIComponent(match[1]),
    tab: (match[2] || "overview") as CommunitySection,
  };
}

function AuthGate({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return <TradeWayLoginLanding onLogin={onLogin} onRegister={onRegister} />;
}

export function WorkspaceAppRouterShell({ children }: { children: ReactNode }) {
  return (
    <WorkspacePreferencesProvider>
      <WorkspaceAppRouterShellInner>{children}</WorkspaceAppRouterShellInner>
    </WorkspacePreferencesProvider>
  );
}

function WorkspaceAppRouterShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionFromPath(pathname);
  const profileUsername = usernameFromPath(pathname);
  const tradeId = tradeIdFromPath(pathname);
  const communityRoute = communityRouteFromPath(pathname);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notificationsMounted, setNotificationsMounted] = useState(false);
  const [profileOpening, setProfileOpening] = useState(false);
  const workspaceMainRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  const openLogin = () => {
    setAuthMode("login");
    setAuthOpen(true);
  };
  const openRegister = () => {
    setAuthMode("register");
    setAuthOpen(true);
  };

  useEffect(() => {
    const handleOpenProfile = () => setProfileOpening(true);
    const handleProfileReady = () => {
      window.setTimeout(() => setProfileOpening(false), 40);
    };
    const handleOpenAuth = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "login" | "register" }>)
        .detail;
      if (detail?.mode === "register") openRegister();
      else openLogin();
    };

    window.addEventListener("tradeup:open-profile", handleOpenProfile);
    window.addEventListener("tradeup:profile-ready", handleProfileReady);
    window.addEventListener("tradeup:open-auth", handleOpenAuth);
    return () => {
      window.removeEventListener("tradeup:open-profile", handleOpenProfile);
      window.removeEventListener("tradeup:profile-ready", handleProfileReady);
      window.removeEventListener("tradeup:open-auth", handleOpenAuth);
    };
  }, []);

  useEffect(() => {
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

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
      router.replace("/");
    }
  }, [isAdmin, router, section, user]);

  const changeSection = (nextSection: Section) => {
    if (nextSection === "admin" && isAdmin !== true) return;
    if (
      nextSection === section &&
      nextSection !== "account" &&
      nextSection !== "calendar"
    )
      return;
    router.push(pathFromSection(nextSection));
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const closeTradeDetail = () => {
    router.push("/trades");
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const openCommunitySection = (next: CommunitySection) => {
    if (!communityRoute) return;
    router.push(`/community/${communityRoute.communityId}/${next}`);
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const closeCommunityWorkspace = () => {
    router.push("/community");
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const renderLegacySection = (item: Section) => {
    if (item === "accounts")
      return <Journal onLogin={openLogin} mode="accounts" />;
    if (item === "calendar") return <CalendarWorkspaceV2 />;
    if (item === "trades" && tradeId) {
      return <TradeDetailPage tradeId={tradeId} onBack={closeTradeDetail} />;
    }
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

  const routeOwnsContent = APP_ROUTER_CONTENT_PATHS.has(pathname);
  const routeContent = routeOwnsContent ? children : renderLegacySection(section);

  if (!user && section === "pricing") {
    return (
      <>
        {routeOwnsContent ? children : <Pricing onLogin={openLogin} />}
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode={authMode}
        />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGate onLogin={openLogin} onRegister={openRegister} />
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode={authMode}
        />
      </>
    );
  }

  return (
    <>
      <ActiveAccountProvider>
        <WorkspaceBootLoader />
        <div className="workspace-shell flex h-[100dvh] w-full overflow-hidden bg-black p-0 text-foreground">
          {communityRoute ? (
            <CommunitySidebar
              communityId={communityRoute.communityId}
              active={communityRoute.tab}
              onNavigate={openCommunitySection}
              onBack={closeCommunityWorkspace}
            />
          ) : (
            <Sidebar
              active={section}
              onChange={changeSection}
              onLogin={openLogin}
              user={user}
            />
          )}
          <div
            className="hidden w-[236px] shrink-0 lg:block"
            aria-hidden="true"
          />
          <main
            ref={workspaceMainRef}
            data-workspace-main
            className="workspace-main h-[100dvh] min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden bg-black pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:pb-0"
          >
            {!communityRoute ? <WorkspaceTopbar section={section} /> : null}
            <section className="min-h-full">{routeContent}</section>
          </main>
        </div>
        {communityRoute && communityRoute.tab !== "chat" ? (
          <button
            type="button"
            onClick={() => openCommunitySection("chat")}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-[90] inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white px-3 text-[11px] font-bold text-black shadow-2xl lg:hidden"
            aria-label="Open community chat"
          >
            <MessageCircle size={15} /> Chat
          </button>
        ) : null}
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
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
