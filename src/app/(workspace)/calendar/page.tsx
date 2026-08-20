import type { Metadata } from "next";

import { JournalCalendar } from "@/components/journal/journal-calendar";

export const metadata: Metadata = {
  title: "Calendar | Tradoxy",
};

export default function CalendarPage() {
  return <JournalCalendar />;
}
