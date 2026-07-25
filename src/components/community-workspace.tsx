"use client";

import { usePathname } from "next/navigation";
import { ChatLayout } from "@/components/chat/chat-layout";
import { CommunityDetailV2 } from "@/features/community/components/community-detail-v2";
import { CommunityHubV2 } from "@/features/community/components/community-hub-v2";
import type { CommunitySection } from "@/features/community/components/community-sidebar";

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

export function CommunityWorkspace() {
  const pathname = usePathname();
  const route = communityRoute(pathname);

  if (!route) return <CommunityHubV2 />;
  if (route.tab === "chat") return <ChatLayout communityId={route.communityId} />;

  return <CommunityDetailV2 communityId={route.communityId} activeTab={route.tab} />;
}
