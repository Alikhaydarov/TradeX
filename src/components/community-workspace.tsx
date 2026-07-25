"use client";

import { usePathname } from "next/navigation";

import {
  CommunityDetail,
  CommunityHub,
} from "@/features/community/components/community-experience";
import type { CommunitySection } from "@/features/community/components/community-sidebar";

const VALID_TABS = new Set<CommunitySection>([
  "overview",
  "analytics",
  "leaderboard",
  "members",
]);

function communityRoute(pathname: string) {
  const match = pathname.match(
    /^\/community\/([^/]+)(?:\/(overview|analytics|leaderboard|members))?\/?$/,
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

  if (!route) return <CommunityHub />;

  return (
    <CommunityDetail
      communityId={route.communityId}
      activeTab={route.tab}
    />
  );
}
