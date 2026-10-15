import { TradeJournal } from "@/components/trade-journal";
import { getSelectedAccountId } from "@/lib/selected-account";

export default async function TradesPage() {
  const selectedAccountId = await getSelectedAccountId();
  return <TradeJournal key={selectedAccountId ?? "all"} selectedAccountId={selectedAccountId}/>;
}
