import type { Metadata } from "next";

import { AnalyticsRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Analytics | Tradox",
};

export default function AnalyticsPage() {
  return <AnalyticsRoute />;
}
