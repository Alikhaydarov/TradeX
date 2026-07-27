import type { Metadata } from "next";

import { DashboardRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Dashboard | Tradox",
};

export default function DashboardPage() {
  return <DashboardRouteContent />;
}
