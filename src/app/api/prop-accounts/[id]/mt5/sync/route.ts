import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getMt5ClosedTrades, type Mt5BridgeClosedTrade } from "@/lib/server/mt5-bridge";

export const runtime = "nodejs";
export const maxDuration = 300;

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function sideFrom(trade: Mt5BridgeClosedTrade): "Long" | "Short" {
  const side = stringFrom(trade.side, trade.type).toUpperCase();
  return side.includes("SELL") || side.includes("SHORT") ? "Short" : "Long";
}

function externalIdFrom(trade: Mt5BridgeClosedTrade) {
  return stringFrom(trade.positionId, trade.position_id, trade.ticket, trade.id);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { password?: string };
  const password = String(body.password || "");

  if (!password) {
    return badRequest("Enter your MT5 password for this one-time sync request.");
  }

  const [{ data: account }, { data: connection }, { data: profile, error: profileError }] = await Promise.all([
    auth.supabase
      .from("prop_accounts")
      .select("name, market_type, account_size, profit_target, max_drawdown")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),

    auth.supabase
      .from("mt5_connections")
      .select("id, login, server, last_synced_at")
      .eq("prop_account_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),

    auth.supabase
      .from("profiles")
      .select("is_verified")
      .eq("id", auth.user.id)
      .maybeSingle(),
  ]);

  if (profileError) return serverError(profileError.message);

  if (!profile?.is_verified) {
    return badRequest("MT5 auto-sync is available for verified profiles only.");
  }

  if (!account || !connection?.login || !connection.server) {
    return badRequest("Save your MT5 login and broker server in Settings first.");
  }

  try {
    const end = new Date();
    const start = connection.last_synced_at
      ? new Date(connection.last_synced_at)
      : new Date(Date.now() - 365 * 86400000);

    const trades = await getMt5ClosedTrades({
      login: connection.login,
      password,
      server: connection.server,
      from: start.toISOString(),
      to: end.toISOString(),
    });

    const rows = trades.flatMap((trade) => {
      const externalId = externalIdFrom(trade);
      const symbol = stringFrom(trade.symbol).toUpperCase();
      const entry = numberFrom(trade.entryPrice, trade.entry_price, trade.openPrice, trade.open_price);
      const exit = numberFrom(trade.exitPrice, trade.exit_price, trade.closePrice, trade.close_price);
      const quantity = numberFrom(trade.volume, trade.lots, trade.quantity) || 1;
      const fees = Math.abs(numberFrom(trade.fees, trade.commission) + numberFrom(trade.swap));
      const pnl = numberFrom(trade.pnl, trade.profit) + numberFrom(trade.commission) + numberFrom(trade.swap);
      const closedAt = stringFrom(trade.closeTime, trade.close_time, trade.time);

      if (!externalId || !symbol || entry <= 0 || exit <= 0 || !closedAt) return [];

      return [{
        user_id: auth.user.id,
        prop_account_id: id,
        symbol,
        side: sideFrom(trade),
        entry_price: entry,
        exit_price: exit,
        quantity,
        fees,
        pnl: Number(pnl.toFixed(2)),
        note: "Imported from MT5 Python bridge",
        traded_at: new Date(closedAt).toISOString().slice(0, 10),
        account_name: account.name,
        market_type: account.market_type,
        setup: "MT5 import",
        risk_amount: 0,
        result_r: 0,
        account_size: account.account_size,
        profit_target: account.profit_target,
        max_drawdown: account.max_drawdown,
        external_source: "mt5-python-bridge",
        external_id: externalId,
      }];
    });

    let imported = 0;

    if (rows.length) {
      const { data, error } = await auth.supabase
        .from("journal_entries")
        .upsert(rows, {
          onConflict: "user_id,external_source,external_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) return serverError(error.message);
      imported = data?.length || 0;
    }

    await auth.supabase
      .from("mt5_connections")
      .update({
        status: "connected",
        last_error: null,
        last_synced_at: end.toISOString(),
        updated_at: end.toISOString(),
      })
      .eq("id", connection.id);

    return Response.json({
      imported,
      scanned: trades.length,
      lastSyncedAt: end.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 sync failed.";

    await auth.supabase
      .from("mt5_connections")
      .update({
        status: "error",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return badRequest(message);
  }
      }
