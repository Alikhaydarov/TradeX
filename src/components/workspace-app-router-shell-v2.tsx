"use client";

import { MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { CommunitySection } from "@/features/community/components/community-sidebar";
import { apiRequest } from "@/lib/api-client";
import { ActiveAccountProvider } from "./active-account-context";
import { useAuth } from "./auth-context";
import { TradeComposerProvider } from "./journal/trade-composer-context";
import { WorkspaceJournalPrefetch } from "./journal/workspace-journal-prefetch";
import { WorkspaceProfilePrefetch } from "./profile/workspace-profile-prefetch";
import { pathFromSection, sectionFromPath } from "./section-config";
import { Sidebar } from "./sidebar";
import { WORKSPACE_TAILWIND_CLASS } from "./tailwind/app-tailwind-classes";
import { TradoxyLoginLanding } from "./tradeway-login-landing";
import type { Section } from "./types";
import {
  useWorkspacePreferences,
  WorkspacePreferencesProvider,
} from "./workspace-preferences-context";
import { WorkspaceTopbar } from "./workspace-topbar";

const AuthModal = dynamic(
  () => import("./auth-modal").then((module) => module.AuthModal),
  { ssr: false },
);

const CommunitySidebar = dynamic(
  () =>
    import("@/features/community/components/community-sidebar").then(
      (module) => module.CommunitySidebar,
    ),
  { ssr: false },
);

const NotificationListener = dynamic(
  () =>
    import("./notification-listener").then(
      (module) => module.NotificationListener,
    ),
  { ssr: false },
);

const PremiumUpsellDialog = dynamic(
  () =>
    import("./premium-upsell-dialog").then(
      (module) => module.PremiumUpsellDialog,
    ),
  { ssr: false },
);

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
  "/settings",
  "/community",
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
}: {
  children: ReactNode;
}) {
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
  const communityRoute = communityRouteFromPath(pathname);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notificationsMounted, setNotificationsMounted] = useState(false);
  const [upsellMounted, setUpsellMounted] = useState(false);
  const workspaceMainRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const { settingsOpen } = useWorkspacePreferences();

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
      const detail = (event as CustomEvent<{ mode?: "login" | "register" }>).detail;
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
    const notificationTimer = window.setTimeout(
      () => setNotificationsMounted(true),
      800,
    );
    const upsellTimer = window.setTimeout(() => setUpsellMounted(true), 1600);
    return () => {
      window.clearTimeout(notificationTimer);
      window.clearTimeout(upsellTimer);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const prefetch = () => {
      CORE_WORKSPACE_ROUTES.forEach((route) => router.prefetch(route));
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleHandle = idleWindow.requestIdleCallback?.(prefetch, {
      timeout: 1200,
    });
    const timeoutHandle =
      idleHandle === undefined ? window.setTimeout(prefetch, 350) : undefined;

    return () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    };
  }, [router, user]);

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
    ) {
      return;
    }
    const target = pathFromSection(nextSection);
    router.prefetch(target);
    router.push(target);
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const openCommunitySection = (next: CommunitySection) => {
    if (!communityRoute) return;
    const target = `/community/${communityRoute.communityId}/${next}`;
    router.prefetch(target);
    router.push(target);
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const closeCommunityWorkspace = () => {
    router.push("/community");
    workspaceMainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const authDialog = authOpen ? (
    <AuthModal
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      initialMode={authMode}
    />
  ) : null;

  if (!user && section === "pricing") {
    return (
      <>
        {children}
        {authDialog}
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGate onLogin={openLogin} onRegister={openRegister} />
        {authDialog}
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
      <ActiveAccountProvider>
        <TradeComposerProvider>
          <WorkspaceJournalPrefetch />
          <WorkspaceProfilePrefetch />
          <div
            className={`${WORKSPACE_TAILWIND_CLASS} workspace-shell flex h-dvh w-full overflow-hidden bg-xcanvas p-0 text-foreground`}
          >
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
              className="workspace-main h-dvh min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden bg-xcanvas pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:pb-0"
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
        </TradeComposerProvider>
      </ActiveAccountProvider>
      {notificationsMounted ? <NotificationListener /> : null}
      {upsellMounted ? <PremiumUpsellDialog /> : null}
      {settingsOpen ? <UserSettingsDialog /> : null}
      {authDialog}
    </>
  );
}
