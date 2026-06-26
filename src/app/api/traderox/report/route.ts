import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { requirePremium } from "@/lib/backend/premium";
import { buildTraderoxReport } from "@/lib/traderox/report";
import type { TraderoxTrade } from "@/lib/traderox/types";

export const runtime = "nodejs";

interface AccountRow {
  id: string;
}

interface TradeRow {
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
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function mapTrade(row: TradeRow): TraderoxTrade {
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

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");

  try {
    let accountIds: string[] = [];
    if (accountId) {
      const { data, error } = await auth.supabase
        .from("trading_accounts")
        .select("id")
        .eq("id", accountId)
        .eq("user_id", auth.user.id)
        .returns<AccountRow[]>();
      if (error) return serverError(error.message);
      accountIds = (data || []).map((account) => account.id);
    } else {
      const { data, error } = await auth.supabase
        .from("trading_accounts")
        .select("id")
        .eq("user_id", auth.user.id)
        .returns<AccountRow[]>();
      if (error) return serverError(error.message);
      accountIds = (data || []).map((account) => account.id);
    }

    if (!accountIds.length) {
      return Response.json(buildTraderoxReport([]));
    }

    const { data: trades, error } = await auth.supabase
      .from("trades")
      .select("id, account_id, symbol, side, net_pnl, gross_pnl, risk_amount, risk_percent, rr, setup_name, session_name, opened_at, closed_at")
      .in("account_id", accountIds)
      .order("closed_at", { ascending: false })
      .limit(500)
      .returns<TradeRow[]>();
    if (error) return serverError(error.message);

    return Response.json(buildTraderoxReport((trades || []).map(mapTrade)));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
