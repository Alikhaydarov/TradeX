import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  importMt5TradesToJournal,
  importMt5TradesToJournalViaPostgres,
  type IncomingMt5Trade,
} from "@/lib/backend/mt5-import";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized connector request." }, { status: 401 });
  }

  const body = await request.json() as { accountId?: unknown; trades?: unknown };
  const accountId = asString(body.accountId);
  const trades = Array.isArray(body.trades) ? body.trades as IncomingMt5Trade[] : [];
  if (!accountId || !trades.length) {
    return Response.json({ error: "accountId and trades are required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const result = supabase
      ? await importMt5TradesToJournal(supabase, accountId, trades)
      : await importMt5TradesToJournalViaPostgres(accountId, trades);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "MT5 import failed." }, { status: 500 });
  }
}
