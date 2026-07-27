"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import {
  CommunitySidebar,
  type CommunitySection,
} from "@/features/community/components/community-sidebar";
import { ActiveAccountProvider } from "./active-account-context";
import { useAuth } from "./auth-context";
import { NotificationListener } from "./notification-listener";
import { PremiumUpsellDialog } from "./premium-upsell-dialog";
import { pathFromSection } from "./section-config";
import { Sidebar } from "./sidebar";
import type { Section } from "./types";
import { WorkspaceBootLoader } from "./workspace-boot-loader";
import { WorkspacePreferencesProvider } from "./workspace-preferences-context";
import { WorkspaceSectionSkeleton } from "./workspace-section-skeleton";
import { WorkspaceTopbar } from "./workspace-topbar";

const UserSettingsDialog = dynamic(
  () =>
    import("./user-settings-dialog").then(
      (module) => module.UserSettingsDialog,
    ),
  { ssr: false },
);

type CommunityShellConfig = {
  communityId: string;
  active: CommunitySection;
};

function workspaceContentClass(
  section: Section,
  community?: CommunityShellConfig,
) {
  if (community || section === "community") return "min-h-full";

  const maxWidth =
    section === "account"
      ? "lg:max-w-3xl"
      : section === "feed"
        ? "lg:max-w-4xl"
        : "lg:max-w-[1320px]";

  return `mx-auto min-h-full w-full lg:w-[calc(100%_-_11rem)] ${maxWidth}`;
}

export function WorkspaceRouteShell({
  section,
  children,
  community,
}: {
  section: Section;
  children: ReactNode;
  community?: CommunityShellConfig;
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
          {community ? (
            <CommunitySidebar
              communityId={community.communityId}
              active={community.active}
              onNavigate={(next) =>
                router.push(`/community/${community.communityId}/${next}`)
              }
              onBack={() => router.push("/community")}
            />
          ) : (
            <Sidebar
              active={section}
              onChange={changeSection}
              onLogin={() => router.push("/")}
              user={user}
            />
          )}
          <div
            data-workspace-spacer
            className={`hidden shrink-0 lg:block ${community ? "w-[236px]" : "w-[238px]"}`}
            aria-hidden="true"
          />
          <main
            data-workspace-main
            className="workspace-main h-[100dvh] min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden bg-black pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:pb-0"
          >
            {!community ? <WorkspaceTopbar section={section} /> : null}
            <section className={workspaceContentClass(section, community)}>
              <Suspense fallback={<WorkspaceSectionSkeleton />}>
                {children}
              </Suspense>
            </section>
          </main>
        </div>
        {notificationsMounted ? <NotificationListener /> : null}
        <PremiumUpsellDialog />
        <UserSettingsDialog />
      </ActiveAccountProvider>
    </WorkspacePreferencesProvider>
  );
}
