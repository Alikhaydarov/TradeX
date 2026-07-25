import type { Metadata } from "next";

type CommunitySectionPageProps = {
  params: Promise<{ section: string }>;
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
    title: `${TITLES[section] ?? "Community"} | Tradox`,
  };
}

export default function CommunitySectionRoute() {
  return null;
}
