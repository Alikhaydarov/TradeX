import type { Metadata } from "next";

import { TradesRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Trades | Tradox",
};

export default function TradesPage() {
  return <TradesRoute />;
}
