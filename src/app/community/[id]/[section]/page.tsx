import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommunityDetailRoute } from "@/components/routes/special-workspace-routes";
import type { CommunitySection } from "@/features/community/components/community-sidebar";

type CommunitySectionPageProps = {
  params: Promise<{ id: string; section: string }>;
};

const TITLES: Record<CommunitySection, string> = {
  overview: "Community Overview",
  analytics: "Community Analytics",
  leaderboard: "Community Leaderboard",
  members: "Community Members",
  chat: "Community Chat",
};

function parseSection(value: string): CommunitySection | null {
  return value in TITLES ? (value as CommunitySection) : null;
}

export async function generateMetadata({
  params,
}: CommunitySectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const parsed = parseSection(section);
  return {
    title: `${parsed ? TITLES[parsed] : "Community"} | Tradox`,
  };
}

export default async function CommunitySectionPage({
  params,
}: CommunitySectionPageProps) {
  const { id, section } = await params;
  const active = parseSection(section);
  if (!active) notFound();

  return (
    <CommunityDetailRoute
      communityId={decodeURIComponent(id)}
      active={active}
    />
  );
}
