import { TradeJournal } from "@/components/trade-journal";
import { getSelectedAccountId } from "@/lib/selected-account";
import { createClient } from "@/lib/supabase/server";
import { loadTradeList } from "@/lib/trade-list-data";
import { getViewer } from "@/lib/workspace-bootstrap";

export default async function TradesPage() {
  const [selectedAccountId, user] = await Promise.all([
    getSelectedAccountId(),
    getViewer(),
  ]);
  let initialData;
  if (user) {
    try {
      initialData = await loadTradeList(
        await createClient(),
        user.id,
        selectedAccountId,
      );
    } catch {
      // The client query retains its retry path when the server read fails.
    }
  }
  return (
    <TradeJournal
      key={selectedAccountId ?? "all"}
      selectedAccountId={selectedAccountId}
      {...(initialData ? { initialData } : {})}
    />
  );
}
