import type { Metadata } from "next";

import { JournalAnalytics } from "@/components/journal/journal-analytics";

export const metadata: Metadata = {
  title: "Analytics | Tradoxy",
};

export default function AnalyticsPage() {
  return <JournalAnalytics />;
}
