import type { Metadata } from "next";

import { AnalyticsRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Analytics | Tradoxy",
};

export default function AnalyticsPage() {
  return <AnalyticsRouteContent />;
}
