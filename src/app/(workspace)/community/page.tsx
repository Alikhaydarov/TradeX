import type { Metadata } from "next";

import { CommunityRouteContent } from "@/components/routes/community-route-content";

export const metadata: Metadata = {
  title: "Community | Tradoxy",
};

export default function CommunityPage() {
  return <CommunityRouteContent />;
}
