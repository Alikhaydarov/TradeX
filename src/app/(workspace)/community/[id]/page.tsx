import type { Metadata } from "next";

import { CommunityRouteContent } from "@/components/routes/community-route-content";

export const metadata: Metadata = {
  title: "Community Overview | Tradoxy",
};

export default function CommunityDetailRoute() {
  return <CommunityRouteContent />;
}
