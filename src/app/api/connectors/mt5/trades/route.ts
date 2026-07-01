import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPostgresPool } from "@/lib/backend/postgres";
import {
  importMt5TradesToJournal,
  importMt5TradesToJournalViaPostgres,
  type IncomingMt5Trade,
} from "@/lib/backend/mt5-import";
import {
  persistTraderoxAnalysis,
  persistTraderoxAnalysisViaPostgres,
} from "@/lib/backend/traderox-persist";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function activatePropAccountFromSupabase(accountId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const { data } = await supabase
    .from("trading_accounts")
    .select("prop_account_id")
    .eq("id", accountId)
    .maybeSingle<{ prop_account_id: string | null }>();

  if (!data?.prop_account_id) return;

  await supabase
    .from("prop_accounts")
    .update({ status: "Active", updated_at: new Date().toISOString() })
    .eq("id", data.prop_account_id);
}

async function activatePropAccountFromPostgres(accountId: string) {
  const pool = getPostgresPool();
  if (!pool) return;
  await pool.query(
    `update public.prop_accounts p
     set status = 'Active', updated_at = now()
     from public.trading_accounts t
     where t.id = $1 and t.prop_account_id = p.id`,
    [accountId],
  );
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

    if (result.journalImported > 0 || result.imported > 0) {
      if (supabase) {
        await activatePropAccountFromSupabase(accountId);
      } else {
        await activatePropAccountFromPostgres(accountId);
      }
    }

    const traderox = supabase
      ? await persistTraderoxAnalysis(supabase, accountId)
      : await persistTraderoxAnalysisViaPostgres(accountId);
    return Response.json({
      ...result,
      traderox: {
        disciplineScore: traderox.disciplineScore,
        alerts: traderox.alerts.length,
        findings: traderox.findings.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "MT5 import failed." }, { status: 500 });
  }
}
