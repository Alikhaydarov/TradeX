import type { Metadata } from "next";

import { CalendarRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Calendar | Tradox",
};

export default function CalendarPage() {
  return <CalendarRoute />;
}
