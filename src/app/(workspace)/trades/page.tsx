import type { Metadata } from "next";

import { TradesRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Trades | Tradoxy",
};

export default function TradesPage() {
  return <TradesRouteContent />;
}
