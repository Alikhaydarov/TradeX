"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import type { CommunitySection } from "@/features/community/components/community-sidebar";

const CommunityHubPremium = dynamic(
  () =>
    import("@/features/community/components/community-hub-premium").then(
      (module) => module.CommunityHubPremium,
    ),
  { ssr: false, loading: () => <CommunityRouteSkeleton compact /> },
);

const CommunityDetailPremium = dynamic(
  () =>
    import("@/features/community/components/community-detail-premium").then(
      (module) => module.CommunityDetailPremium,
    ),
  { ssr: false, loading: () => <CommunityRouteSkeleton /> },
);

const ChatPage = dynamic(
  () => import("@/components/chat/chat-page").then((module) => module.ChatPage),
  { ssr: false, loading: () => <CommunityRouteSkeleton /> },
);

const VALID_TABS = new Set<CommunitySection>([
  "overview",
  "analytics",
  "leaderboard",
  "members",
  "chat",
]);

function communityRoute(pathname: string) {
  const match = pathname.match(
    /^\/community\/([^/]+)(?:\/(overview|analytics|leaderboard|members|chat))?\/?$/,
  );
  if (!match?.[1]) return null;
  const tab = (match[2] || "overview") as CommunitySection;
  return {
    communityId: decodeURIComponent(match[1]),
    tab: VALID_TABS.has(tab) ? tab : "overview",
  };
}

function CommunityRouteSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-3 p-3 pb-24 sm:p-4 lg:p-5" role="status" aria-label="Loading community">
      <div className="h-20 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: compact ? 3 : 6 }, (_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-2xl border border-xborder bg-xpanel"
          />
        ))}
      </div>
    </div>
  );
}

export function CommunityWorkspace() {
  const pathname = usePathname();
  const route = communityRoute(pathname);

  if (!route) return <CommunityHubPremium />;
  if (route.tab === "chat") return <ChatPage communityId={route.communityId} />;

  return (
    <CommunityDetailPremium
      communityId={route.communityId}
      activeTab={route.tab}
    />
  );
}
