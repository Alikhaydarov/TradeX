import { notFound } from "next/navigation";
import { TradeDetail } from "@/components/trade-detail";
import { loadTradeDetail } from "@/lib/trade-detail-data";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/workspace-bootstrap";

export default async function TradePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getViewer()]);
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await loadTradeDetail(await createClient(), user.id, id);
  if (!data) notFound();
  return <TradeDetail initialTrade={data} />;
}
