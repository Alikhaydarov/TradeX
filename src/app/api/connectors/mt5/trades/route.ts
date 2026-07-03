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

type ClosedPositionUpdate = {
  externalPositionId: string;
  exitPrice: number | null;
  netPnl: number | null;
  closedAt: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asDate(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isMissingPositionsTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("mt5_positions") && message.includes("does not exist");
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

function collectClosedPositionUpdates(trades: IncomingMt5Trade[]) {
  const map = new Map<string, ClosedPositionUpdate>();
  for (const trade of trades) {
    const externalPositionId = asString(trade.externalPositionId);
    if (!externalPositionId) continue;
    map.set(externalPositionId, {
      externalPositionId,
      exitPrice: asNumber(trade.exitPrice),
      netPnl: asNumber(trade.netPnl) ?? asNumber(trade.grossPnl),
      closedAt: asDate(trade.closedAt),
    });
  }
  return [...map.values()];
}

async function closeOpenPositionsFromSupabase(accountId: string, updates: ClosedPositionUpdate[]) {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !updates.length) return;

  for (const item of updates) {
    const { error } = await supabase
      .from("mt5_positions")
      .update({
        status: "closed",
        current_price: item.exitPrice,
        realized_pnl: item.netPnl,
        unrealized_pnl: 0,
        closed_at: item.closedAt,
        updated_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq("account_id", accountId)
      .eq("external_position_id", item.externalPositionId);
    if (error) throw new Error(error.message);
  }
}

async function closeOpenPositionsFromPostgres(accountId: string, updates: ClosedPositionUpdate[]) {
  const pool = getPostgresPool();
  if (!pool || !updates.length) return;

  for (const item of updates) {
    await pool.query(
      `update public.mt5_positions
       set status = 'closed',
           current_price = coalesce($3, current_price),
           realized_pnl = $4,
           unrealized_pnl = 0,
           closed_at = coalesce($5::timestamptz, closed_at),
           last_seen_at = now(),
           updated_at = now()
       where account_id = $1
       and external_position_id = $2`,
      [accountId, item.externalPositionId, item.exitPrice, item.netPnl, item.closedAt],
    );
  }
}

export async function POST(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized connector request." }, { status: 401 });
  }

  const body = await request.json() as { accountId?: unknown; trades?: unknown; finalize?: unknown };
  const accountId = asString(body.accountId);
  const trades = Array.isArray(body.trades) ? body.trades as IncomingMt5Trade[] : [];
  const finalize = body.finalize !== false;
  if (!accountId || !trades.length) {
    return Response.json({ error: "accountId and trades are required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const closedPositionUpdates = collectClosedPositionUpdates(trades);
    const result = supabase
      ? await importMt5TradesToJournal(supabase, accountId, trades)
      : await importMt5TradesToJournalViaPostgres(accountId, trades);

    if (closedPositionUpdates.length) {
      try {
        if (supabase) {
          await closeOpenPositionsFromSupabase(accountId, closedPositionUpdates);
        } else {
          await closeOpenPositionsFromPostgres(accountId, closedPositionUpdates);
        }
      } catch (error) {
        if (!isMissingPositionsTableError(error)) {
          throw error;
        }
      }
    }

    if (finalize && (result.journalImported > 0 || result.imported > 0)) {
      if (supabase) {
        await activatePropAccountFromSupabase(accountId);
      } else {
        await activatePropAccountFromPostgres(accountId);
      }
    }

    const traderox = finalize
      ? supabase
        ? await persistTraderoxAnalysis(supabase, accountId)
        : await persistTraderoxAnalysisViaPostgres(accountId)
      : null;
    return Response.json({
      ...result,
      finalized: finalize,
      traderox: traderox ? {
        disciplineScore: traderox.disciplineScore,
        alerts: traderox.alerts.length,
        findings: traderox.findings.length,
        coach: traderox.coach,
        recommendations: traderox.recommendations,
      } : null,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "MT5 import failed." }, { status: 500 });
  }
}
