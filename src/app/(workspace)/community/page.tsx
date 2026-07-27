import type { Metadata } from "next";

import { CommunityHubRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Community | Tradox",
};

export default function CommunityPage() {
  return <CommunityHubRoute />;
}
