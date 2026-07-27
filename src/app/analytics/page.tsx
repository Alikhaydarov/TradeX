import type { Metadata } from "next";

import { AnalyticsRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Analytics | Tradox",
};

export default function AnalyticsPage() {
  return <AnalyticsRouteContent />;
}
