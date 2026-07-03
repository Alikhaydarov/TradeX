import { getPostgresPool } from "@/lib/backend/postgres";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type IncomingPosition = {
  externalPositionId?: unknown;
  symbol?: unknown;
  side?: unknown;
  volume?: unknown;
  entryPrice?: unknown;
  currentPrice?: unknown;
  stopLoss?: unknown;
  takeProfit?: unknown;
  unrealizedPnl?: unknown;
  openedAt?: unknown;
  status?: unknown;
  rawPayload?: unknown;
};

type TradingAccountRow = {
  id: string;
  user_id: string;
  prop_account_id: string | null;
};

type PositionRow = {
  account_id: string;
  user_id: string;
  prop_account_id: string | null;
  platform: string;
  external_position_id: string;
  symbol: string;
  side: string | null;
  volume: number | null;
  entry_price: number | null;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  unrealized_pnl: number | null;
  opened_at: string | null;
  status: string;
  last_seen_at: string;
  raw_payload: Record<string, unknown>;
  updated_at: string;
};

function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return "";
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

async function getAccount(accountId: string) {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("trading_accounts")
      .select("id, user_id, prop_account_id")
      .eq("id", accountId)
      .single<TradingAccountRow>();
    if (error) throw new Error(error.message);
    return data;
  }

  const pool = getPostgresPool();
  if (!pool) throw new Error("SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL is required.");
  const result = await pool.query<TradingAccountRow>(
    `select id, user_id, prop_account_id
     from public.trading_accounts
     where id = $1
     limit 1`,
    [accountId],
  );
  return result.rows[0] || null;
}

async function upsertViaSupabase(account: TradingAccountRow, positions: IncomingPosition[]) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  const rows = positions.reduce<PositionRow[]>((acc, position) => {
      const externalPositionId = asString(position.externalPositionId);
      const symbol = asString(position.symbol).toUpperCase();
      if (!externalPositionId || !symbol) return acc;
      acc.push({
        account_id: account.id,
        user_id: account.user_id,
        prop_account_id: account.prop_account_id,
        platform: "MT5",
        external_position_id: externalPositionId,
        symbol,
        side: asString(position.side) || null,
        volume: asNumber(position.volume),
        entry_price: asNumber(position.entryPrice),
        current_price: asNumber(position.currentPrice),
        stop_loss: asNumber(position.stopLoss),
        take_profit: asNumber(position.takeProfit),
        unrealized_pnl: asNumber(position.unrealizedPnl),
        opened_at: asDate(position.openedAt),
        status: "open",
        last_seen_at: new Date().toISOString(),
        raw_payload: typeof position.rawPayload === "object" && position.rawPayload !== null
          ? position.rawPayload as Record<string, unknown>
          : {},
        updated_at: new Date().toISOString(),
      });
      return acc;
    }, []);

  if (!rows.length) return 0;
  const { error } = await supabase
    .from("mt5_positions")
    .upsert(rows, { onConflict: "account_id,external_position_id" });
  if (error) throw new Error(error.message);
  return rows.length;
}

async function upsertViaPostgres(account: TradingAccountRow, positions: IncomingPosition[]) {
  const pool = getPostgresPool();
  if (!pool) throw new Error("DATABASE_URL or SUPABASE_DB_URL is not configured.");
  let count = 0;
  for (const position of positions) {
    const externalPositionId = asString(position.externalPositionId);
    const symbol = asString(position.symbol).toUpperCase();
    if (!externalPositionId || !symbol) continue;
    await pool.query(
      `insert into public.mt5_positions (
        account_id, user_id, prop_account_id, platform, external_position_id, symbol, side,
        volume, entry_price, current_price, stop_loss, take_profit, unrealized_pnl,
        opened_at, status, last_seen_at, raw_payload, updated_at
      )
      values (
        $1, $2, $3, 'MT5', $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, 'open', now(), $14::jsonb, now()
      )
      on conflict (account_id, external_position_id) do update set
        symbol = excluded.symbol,
        side = excluded.side,
        volume = excluded.volume,
        entry_price = excluded.entry_price,
        current_price = excluded.current_price,
        stop_loss = excluded.stop_loss,
        take_profit = excluded.take_profit,
        unrealized_pnl = excluded.unrealized_pnl,
        opened_at = excluded.opened_at,
        status = 'open',
        last_seen_at = now(),
        raw_payload = excluded.raw_payload,
        updated_at = now()`,
      [
        account.id,
        account.user_id,
        account.prop_account_id,
        externalPositionId,
        symbol,
        asString(position.side) || null,
        asNumber(position.volume),
        asNumber(position.entryPrice),
        asNumber(position.currentPrice),
        asNumber(position.stopLoss),
        asNumber(position.takeProfit),
        asNumber(position.unrealizedPnl),
        asDate(position.openedAt),
        JSON.stringify(position.rawPayload ?? {}),
      ],
    );
    count += 1;
  }
  return count;
}

export async function POST(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized connector request." }, { status: 401 });
  }

  const body = await request.json() as { accountId?: unknown; positions?: unknown };
  const accountId = asString(body.accountId);
  const positions = Array.isArray(body.positions) ? body.positions as IncomingPosition[] : [];
  if (!accountId) {
    return Response.json({ error: "accountId is required." }, { status: 400 });
  }

  try {
    const account = await getAccount(accountId);
    if (!account) {
      return Response.json({ error: "Trading account not found." }, { status: 404 });
    }

    const supabase = getSupabaseAdminClient();
    const synced = supabase
      ? await upsertViaSupabase(account, positions)
      : await upsertViaPostgres(account, positions);

    return Response.json({ ok: true, positions: synced });
  } catch (error) {
    if (isMissingPositionsTableError(error)) {
      return Response.json({ ok: true, positions: 0, skipped: "mt5_positions table is not deployed yet." });
    }
    return Response.json({ error: error instanceof Error ? error.message : "MT5 positions import failed." }, { status: 500 });
  }
}
