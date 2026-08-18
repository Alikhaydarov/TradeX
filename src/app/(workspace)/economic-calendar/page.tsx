import type { Metadata } from "next";

import { CalendarRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Economic Calendar | TradeWay",
};

export default function EconomicCalendarPage() {
  return <CalendarRouteContent />;
}
