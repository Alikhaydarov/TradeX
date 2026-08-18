import type { Metadata } from "next";

import { DashboardRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Dashboard | TradeWay",
};

export default function DashboardPage() {
  return <DashboardRouteContent />;
}
