import type { Metadata } from "next";

import { JournalStats } from "@/components/journal/journal-stats";

export const metadata: Metadata = {
  title: "Dashboard | Tradoxy",
};

export default function DashboardPage() {
  return <JournalStats />;
}
