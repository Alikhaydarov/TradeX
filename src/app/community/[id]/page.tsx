import type { Metadata } from "next";

import { CommunityDetailRoute } from "@/components/routes/special-workspace-routes";

type CommunityDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Community Overview | Tradox",
};

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { id } = await params;
  return (
    <CommunityDetailRoute
      communityId={decodeURIComponent(id)}
      active="overview"
    />
  );
}
