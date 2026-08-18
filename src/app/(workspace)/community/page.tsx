import type { Metadata } from "next";

import { CommunityRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Community | TradeWay",
};

export default function CommunityPage() {
  return <CommunityRouteContent />;
}
