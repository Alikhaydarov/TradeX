"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ActiveAccountProvider } from "./active-account-context";
import { useAuth } from "./auth-context";
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
import { pathFromSection } from "./section-config";
import { Sidebar } from "./sidebar";
import type { Section } from "./types";
import { WorkspaceBootLoader } from "./workspace-boot-loader";
import { WorkspacePreferencesProvider } from "./workspace-preferences-context";
import { WorkspaceTopbar } from "./workspace-topbar";

const UserSettingsDialog = dynamic(
  () =>
    import("./user-settings-dialog").then(
      (module) => module.UserSettingsDialog,
    ),
  { ssr: false },
);

export function WorkspaceRouteShell({
  section,
  children,
}: {
  section: Section;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [notificationsMounted, setNotificationsMounted] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/");
  }, [router, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNotificationsMounted(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!user) return null;

  const changeSection = (nextSection: Section) => {
    router.push(pathFromSection(nextSection));
  };

  return (
    <WorkspacePreferencesProvider>
      <ActiveAccountProvider>
        <WorkspaceBootLoader />
        <div className="workspace-shell flex h-[100dvh] w-full overflow-hidden bg-black p-0 text-foreground">
          <Sidebar
            active={section}
            onChange={changeSection}
            onLogin={() => router.push("/")}
            user={user}
          />
          <div
            className="hidden w-[236px] shrink-0 lg:block"
            aria-hidden="true"
          />
          <main
            data-workspace-main
            className="workspace-main h-[100dvh] min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden bg-black pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:pb-0"
          >
            <WorkspaceTopbar section={section} />
            <section className="min-h-full">{children}</section>
          </main>
        </div>
        {notificationsMounted ? <NotificationListener /> : null}
        <PremiumUpsellDialog />
        <UserSettingsDialog />
      </ActiveAccountProvider>
    </WorkspacePreferencesProvider>
  );
}
