import type { Metadata } from "next";

import { DashboardRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Dashboard | Tradox",
};

export default function DashboardPage() {
  return <DashboardRoute />;
}
