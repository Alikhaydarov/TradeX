"use client";

import { useRouter } from "next/navigation";

import { TradeDetailPage } from "@/features/trades/components/trade-detail-page";

export function TradeDetailRouteContent({ tradeId }: { tradeId: string }) {
  const router = useRouter();

  return (
    <TradeDetailPage
      tradeId={tradeId}
      onBack={() => router.push("/trades")}
    />
  );
}
