import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommunityRouteContent } from "@/components/routes/workspace-route-content";

type CommunitySectionPageProps = {
  params: Promise<{ id: string; section: string }>;
};

const TITLES: Record<string, string> = {
  overview: "Community Overview",
  analytics: "Community Analytics",
  leaderboard: "Community Leaderboard",
  members: "Community Members",
  chat: "Community Chat",
};

export async function generateMetadata({
  params,
}: CommunitySectionPageProps): Promise<Metadata> {
  const { section } = await params;
  return {
    title: `${TITLES[section] ?? "Community"} | Tradoxy`,
  };
}

export default async function CommunitySectionRoute({
  params,
}: CommunitySectionPageProps) {
  const { section } = await params;
  if (!TITLES[section]) notFound();
  return <CommunityRouteContent />;
}
