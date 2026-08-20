import type { Metadata } from "next";

import { JournalCalendar } from "@/components/journal/journal-calendar";

export const metadata: Metadata = {
  title: "Economic Calendar | Tradoxy",
};

export default function EconomicCalendarPage() {
  return <JournalCalendar />;
}
