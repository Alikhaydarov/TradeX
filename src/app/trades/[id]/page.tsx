import type { Metadata } from "next";

import { TradeDetailRoute } from "@/components/routes/special-workspace-routes";

type TradeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Trade Review | Tradox",
};

export default async function TradeDetailPage({
  params,
}: TradeDetailPageProps) {
  const { id } = await params;
  return <TradeDetailRoute tradeId={decodeURIComponent(id)} />;
}
