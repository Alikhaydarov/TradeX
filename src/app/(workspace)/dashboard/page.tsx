import type { Metadata } from "next";

import { DashboardRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Dashboard | Tradoxy",
};

export default function DashboardPage() {
  return <DashboardRouteContent />;
}
