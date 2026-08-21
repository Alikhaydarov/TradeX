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
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
import { preloadWorkspaceRoute } from "./routes/workspace-route-content";
import { pathFromSection, sectionFromPath } from "./section-config";
import { Sidebar } from "./sidebar";
import type { WorkspaceBootstrap } from "@/lib/server/workspace-bootstrap";
import type { Section } from "./types";
import { JournalSeedProvider } from "./journal/journal-seed-context";
import { NavigationProgressProvider, useNavigation } from "./navigation-progress";
import { WorkspaceBootLoader } from "./workspace-boot-loader";
import { WorkspacePreferencesProvider } from "./workspace-preferences-context";
import { WorkspaceTopbar } from "./workspace-topbar";
import { TradoxyLoginLanding } from "./tradeway-login-landing";

const UserSettingsDialog = dynamic(
  () =>
    import("./user-settings-dialog").then(
      (module) => module.UserSettingsDialog,
    ),
  { ssr: false },
);

const CORE_WORKSPACE_ROUTES = [
  "/",
  "/dashboard",
  "/calendar",
  "/trades",
  "/analytics",
  "/accounts",
  "/profile",
];

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
  return <TradoxyLoginLanding onLogin={onLogin} onRegister={onRegister} />;
}

function CommunityRail({
  communityId,
  active,
  onNavigate,
  onBack,
}: {
  communityId: string;
  active: CommunitySection;
  onNavigate: (section: CommunitySection) => void;
  onBack: () => void;
}) {
  const [collapsed, setCollapsed] = useState(active === "chat");

  useEffect(() => {
    if (active === "chat") setCollapsed(true);
  }, [active]);

  return (
    <div className="contents [&>aside]:!left-[252px]">
      <CommunitySidebar
        communityId={communityId}
        active={active}
        onNavigate={onNavigate}
        onBack={onBack}
        onCollapsedChange={setCollapsed}
      />
      <div
        className={`hidden shrink-0 transition-[width] duration-200 ease-out xl:block ${
          collapsed ? "w-[72px]" : "w-[236px]"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}

export function WorkspaceAppRouterShellV2({
  children,
  bootstrap,
}: {
  children: ReactNode;
  bootstrap?: WorkspaceBootstrap;
}) {
  return (
    <WorkspacePreferencesProvider>
      <NavigationProgressProvider>
        <WorkspaceAppRouterShellInner bootstrap={bootstrap}>
          {children}
        </WorkspaceAppRouterShellInner>
      </NavigationProgressProvider>
    </WorkspacePreferencesProvider>
  );
}

function WorkspaceAppRouterShellInner({
  children,
  bootstrap,
}: {
  children: ReactNode;
  bootstrap?: WorkspaceBootstrap;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { navigate } = useNavigation();
  const section = sectionFromPath(pathname);
  const communityRoute = communityRouteFromPath(pathname);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(
    () => bootstrap?.isAdmin ?? null,
  );
  const [notificationsMounted, setNotificationsMounted] = useState(false);
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
    const handleOpenAuth = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "login" | "register" }>)
        .detail;
      if (detail?.mode === "register") openRegister();
      else openLogin();
    };

    window.addEventListener("tradeup:open-auth", handleOpenAuth);
    return () => {
      window.removeEventListener("tradeup:open-auth", handleOpenAuth);
    };
  }, []);

  useEffect(() => {
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNotificationsMounted(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const prefetch = () => {
      CORE_WORKSPACE_ROUTES.forEach((route) => {
        router.prefetch(route);
        preloadWorkspaceRoute(route);
      });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleHandle = idleWindow.requestIdleCallback?.(prefetch, { timeout: 1200 });
    const timeoutHandle = idleHandle === undefined
      ? window.setTimeout(prefetch, 350)
      : undefined;

    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, [router, user]);

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setIsAdmin(false), 0);
      return () => window.clearTimeout(timer);
    }

    // The server bootstrap already ran `is_admin` for this user, so asking
    // /api/admin/me on mount would repeat the same RPC over HTTP - and until it
    // came back the admin route rendered a "Checking admin access..." card.
    if (bootstrap) return;

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
  }, [bootstrap, user]);

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
    ) {
      return;
    }
    const target = pathFromSection(nextSection);
    router.prefetch(target);
    preloadWorkspaceRoute(target);
    navigate(target);
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const openCommunitySection = (next: CommunitySection) => {
    if (!communityRoute) return;
    const target = `/community/${communityRoute.communityId}/${next}`;
    router.prefetch(target);
    preloadWorkspaceRoute(target);
    navigate(target);
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const closeCommunityWorkspace = () => {
    navigate("/community");
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  if (!user && section === "pricing") {
    return (
      <>
        {children}
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

  const routeContent =
    section === "admin" && isAdmin !== true ? (
      <div className="grid min-h-[60vh] place-items-center text-sm font-semibold text-zinc-400">
        Checking admin access...
      </div>
    ) : (
      children
    );

  return (
    <>
      <ActiveAccountProvider initialAccounts={bootstrap?.accounts}>
        <JournalSeedProvider entries={bootstrap?.journalEntries}>
          <WorkspaceBootLoader bootstrapped={Boolean(bootstrap)} />
          <div className="workspace-shell flex h-dvh w-full overflow-hidden bg-black p-0 text-foreground">
            <Sidebar
              active={section}
              onChange={changeSection}
              onLogin={openLogin}
              user={user}
            />
            <div
              className="hidden w-[252px] shrink-0 lg:block"
              aria-hidden="true"
            />
            {communityRoute ? (
              <CommunityRail
                communityId={communityRoute.communityId}
                active={communityRoute.tab}
                onNavigate={openCommunitySection}
                onBack={closeCommunityWorkspace}
              />
            ) : null}
            <main
              ref={workspaceMainRef}
              data-workspace-main
              className="workspace-main h-dvh min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden bg-black pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:pb-0"
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
        </JournalSeedProvider>
      </ActiveAccountProvider>
      {notificationsMounted ? <NotificationListener /> : null}
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
