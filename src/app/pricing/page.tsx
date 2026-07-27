import type { Metadata } from "next";

import { PricingRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Pricing | Tradox",
};

export default function PricingPage() {
  return <PricingRoute />;
}
