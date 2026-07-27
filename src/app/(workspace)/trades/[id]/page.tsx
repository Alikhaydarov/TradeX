import type { Metadata } from "next";

import { TradeDetailRouteContent } from "@/components/routes/workspace-route-content";

type TradeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Trade Detail | Tradox",
};

export default async function TradeDetailPage({ params }: TradeDetailPageProps) {
  const { id } = await params;
  return <TradeDetailRouteContent tradeId={decodeURIComponent(id)} />;
}
