import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { fetchDeals, getMetaApiToken, reconstructTrades } from "@/lib/backend/metaapi";
import { requirePremium } from "@/lib/backend/premium";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;
  const { id } = await context.params;

  if (!getMetaApiToken()) {
    return Response.json({ error: "METAAPI_TOKEN .env ga qo'shilmagan." }, { status: 501 });
  }

  // Get connection
  const { data: conn, error: connErr } = await auth.supabase
    .from("mt5_connections")
    .select("metaapi_account_id, password_encrypted, last_synced_at")
    .eq("user_id", auth.user.id)
    .eq("prop_account_id", id)
    .maybeSingle();

  if (connErr) return serverError(connErr.message);
  if (!conn) return Response.json({ error: "MT5 ulanishi topilmadi. Avval login/parol kiriting." }, { status: 404 });
  if (!conn.metaapi_account_id) {
    return Response.json({ error: "MetaAPI account ID yo'q. Login ma'lumotlarini qayta saqlang." }, { status: 400 });
  }

  // Determine sync window
  const from = conn.last_synced_at
    ? new Date(conn.last_synced_at)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // last 90 days
  const to = new Date();

  // Fetch deals from MetaAPI
  let deals;
  try {
    deals = await fetchDeals(conn.metaapi_account_id, from, to);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "MetaAPI xato";
    await auth.supabase.from("mt5_connections").update({ last_error: msg, status: "error", updated_at: new Date().toISOString() })
      .eq("user_id", auth.user.id).eq("prop_account_id", id);
    return Response.json({ error: msg }, { status: 502 });
  }

  // Reconstruct completed trades from deals
  const trades = reconstructTrades(deals);

  if (trades.length === 0) {
    await auth.supabase.from("mt5_connections")
      .update({ last_synced_at: to.toISOString(), last_error: null, status: "connected", updated_at: new Date().toISOString() })
      .eq("user_id", auth.user.id).eq("prop_account_id", id);
    return Response.json({ imported: 0, message: "Yangi tradelar topilmadi." });
  }

  // Get prop account details for journal entry defaults
  const { data: propAcc } = await auth.supabase
    .from("prop_accounts")
    .select("id, market_type")
    .eq("id", id)
    .maybeSingle();

  // Insert new trades (skip duplicates via external_id unique index)
  let imported = 0;
  let skipped  = 0;

  for (const t of trades) {
    const pnl = t.pnl;
    const riskAmount = Math.abs(pnl) * 0.01; // placeholder

    const { error: insertErr } = await auth.supabase.from("journal_entries").insert({
      user_id: auth.user.id,
      prop_account_id: id,
      symbol: t.symbol,
      side: t.side,
      entry_price: String(t.entryPrice),
      exit_price: String(t.exitPrice),
      quantity: String(t.volume),
      fees: String(t.commission),
      pnl: String(pnl),
      note: t.comment || "",
      traded_at: t.closedAt,
      market_type: propAcc?.market_type ?? "CFD",
      result_r: "0",
      risk_amount: String(riskAmount),
      external_source: "metaapi",
      external_id: t.externalId,
      tags: [],
    });

    if (insertErr) {
      // Duplicate → skip (unique index on external_source + external_id)
      if (insertErr.code === "23505") { skipped++; }
      else { return serverError(insertErr.message); }
    } else {
      imported++;
    }
  }

  // Update last_synced_at
  await auth.supabase.from("mt5_connections")
    .update({
      last_synced_at: to.toISOString(),
      last_error: null,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.user.id).eq("prop_account_id", id);

  return Response.json({ imported, skipped, total: trades.length });
}
