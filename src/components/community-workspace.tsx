"use client";
import { usePathname } from "next/navigation";

import { ChatPage } from "@/components/chat/chat-page";
import { CommunityDetailPremium } from "@/features/community/components/community-detail-premium";
import { CommunityHubPremium } from "@/features/community/components/community-hub-premium";
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

  if (!route) return <CommunityHubPremium />;
  if (route.tab === "chat") return <ChatPage communityId={route.communityId} />;

  return (
    <CommunityDetailPremium
      communityId={route.communityId}
      activeTab={route.tab}
    />
  );
}
