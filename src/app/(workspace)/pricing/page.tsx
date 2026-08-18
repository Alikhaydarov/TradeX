import type { Metadata } from "next";

import { PricingRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Pricing | TradeWay",
};

export default function PricingPage() {
  return <PricingRouteContent />;
}
