import type { SupabaseClient } from "@supabase/supabase-js";
import { getPostgresPool } from "@/lib/backend/postgres";
import { buildTraderoxReport } from "@/lib/traderox/report";
import type { TraderoxTrade } from "@/lib/traderox/types";

interface TraderoxAccountRow {
  id: string;
  user_id: string;
  prop_account_id: string | null;
}

interface TraderoxTradeRow {
  id: string;
  account_id: string;
  symbol: string;
  side: string | null;
  net_pnl: number | string | null;
  gross_pnl: number | string | null;
  risk_amount: number | string | null;
  risk_percent: number | string | null;
  rr: number | string | null;
  setup_name: string | null;
  session_name: string | null;
  opened_at: string | null;
  closed_at: string | null;
}

function toNumber(value: number | string | null | undefined) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

export function toTraderoxTrade(row: TraderoxTradeRow): TraderoxTrade {
  return {
    id: row.id,
    accountId: row.account_id,
    symbol: row.symbol,
    side: row.side,
    netPnl: toNumber(row.net_pnl),
    grossPnl: toNumber(row.gross_pnl),
    riskAmount: row.risk_amount == null ? null : toNumber(row.risk_amount),
    riskPercent: row.risk_percent == null ? null : toNumber(row.risk_percent),
    rr: row.rr == null ? null : toNumber(row.rr),
    setupName: row.setup_name,
    sessionName: row.session_name || "unknown",
    openedAt: row.opened_at,
    closedAt: row.closed_at,
  };
}

export async function persistTraderoxAnalysis(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data: account, error: accountError } = await supabase
    .from("trading_accounts")
    .select("id, user_id, prop_account_id")
    .eq("id", accountId)
    .single<TraderoxAccountRow>();
  if (accountError) throw new Error(accountError.message);
  if (!account) throw new Error("Trading account not found.");

  const { data: rows, error: tradesError } = await supabase
    .from("trades")
    .select("id, account_id, symbol, side, net_pnl, gross_pnl, risk_amount, risk_percent, rr, setup_name, session_name, opened_at, closed_at")
    .eq("account_id", accountId)
    .order("closed_at", { ascending: false })
    .limit(300)
    .returns<TraderoxTradeRow[]>();
  if (tradesError) throw new Error(tradesError.message);

  const report = buildTraderoxReport((rows || []).map(toTraderoxTrade));

  await supabase.from("traderox_reports").insert({
    user_id: account.user_id,
    account_id: account.id,
    report_type: "import",
    discipline_score: report.disciplineScore,
    stats: report.stats,
    findings: report.findings,
  });

  if (report.alerts.length) {
    await supabase.from("traderox_alerts").insert(report.alerts.map((alert) => ({
      user_id: account.user_id,
      account_id: account.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata || {},
    })));
  }

  return report;
}

export async function persistTraderoxAnalysisViaPostgres(accountId: string) {
  const pool = getPostgresPool();
  if (!pool) throw new Error("DATABASE_URL or SUPABASE_DB_URL is not configured.");

  const client = await pool.connect();
  try {
    const accountResult = await client.query<TraderoxAccountRow>(
      `select id, user_id, prop_account_id from public.trading_accounts where id = $1 limit 1`,
      [accountId],
    );
    const account = accountResult.rows[0];
    if (!account) throw new Error("Trading account not found.");

    const tradesResult = await client.query<TraderoxTradeRow>(
      `select id, account_id, symbol, side, net_pnl, gross_pnl, risk_amount, risk_percent, rr, setup_name, session_name, opened_at, closed_at
       from public.trades
       where account_id = $1
       order by closed_at desc nulls last
       limit 300`,
      [accountId],
    );
    const report = buildTraderoxReport(tradesResult.rows.map(toTraderoxTrade));

    await client.query(
      `insert into public.traderox_reports (user_id, account_id, report_type, discipline_score, stats, findings)
       values ($1, $2, 'import', $3, $4::jsonb, $5::jsonb)`,
      [account.user_id, account.id, report.disciplineScore, JSON.stringify(report.stats), JSON.stringify(report.findings)],
    );

    for (const alert of report.alerts) {
      await client.query(
        `insert into public.traderox_alerts (user_id, account_id, type, severity, title, message, metadata)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          account.user_id,
          account.id,
          alert.type,
          alert.severity,
          alert.title,
          alert.message,
          JSON.stringify(alert.metadata || {}),
        ],
      );
    }

    return report;
  } finally {
    client.release();
  }
}
