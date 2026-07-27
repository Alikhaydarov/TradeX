import type { Metadata } from "next";

import { SettingsRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Settings | Tradox",
};

export default function SettingsPage() {
  return <SettingsRouteContent />;
}
