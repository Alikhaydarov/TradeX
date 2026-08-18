import type { Metadata } from "next";

import { SettingsRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Settings | Tradoxy",
};

export default function SettingsPage() {
  return <SettingsRouteContent />;
}
