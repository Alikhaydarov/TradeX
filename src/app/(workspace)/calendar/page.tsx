import type { Metadata } from "next";

import { CalendarRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Calendar | Tradoxy",
};

export default function CalendarPage() {
  return <CalendarRouteContent />;
}
