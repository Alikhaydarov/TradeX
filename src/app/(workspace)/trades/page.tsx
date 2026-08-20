import type { Metadata } from "next";

import { JournalTradeList } from "@/components/journal/journal-trade-list";

export const metadata: Metadata = {
  title: "Trades | Tradoxy",
};

export default function TradesPage() {
  return <JournalTradeList />;
}
