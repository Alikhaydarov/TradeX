import type { Metadata } from "next";

import { CalendarRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Calendar | Tradox",
};

export default function CalendarPage() {
  return <CalendarRouteContent />;
}
