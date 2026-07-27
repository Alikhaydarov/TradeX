import type { Metadata } from "next";

import { SettingsRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Settings | Tradox",
};

export default function SettingsPage() {
  return <SettingsRoute />;
}
