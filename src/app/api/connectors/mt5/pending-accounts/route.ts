import { decryptSecret } from "@/lib/backend/crypto";
import { getPostgresPool } from "@/lib/backend/postgres";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface TradingAccountCredentialRow {
  id: string;
  user_id: string;
  prop_account_id: string | null;
  account_login: string | null;
  broker_server: string | null;
  encrypted_password: string | null;
  status: string | null;
  auto_sync_enabled: boolean | null;
  last_synced_at: string | null;
}

function hasConnectorSecret(request: Request) {
  const expected = process.env.MT5_CONNECTOR_SECRET;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: Request) {
  if (!hasConnectorSecret(request)) {
    return Response.json({ error: "Unauthorized connector request." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 50)));

  const supabase = getSupabaseAdminClient();
  let data: TradingAccountCredentialRow[] = [];

  if (supabase) {
    const result = await supabase
      .from("trading_accounts")
      .select("id, user_id, prop_account_id, account_login, broker_server, encrypted_password, status, auto_sync_enabled, last_synced_at")
      .eq("platform", "MT5")
      .eq("auto_sync_enabled", true)
      .order("updated_at", { ascending: false })
      .limit(limit)
      .returns<TradingAccountCredentialRow[]>();

    if (result.error) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }
    data = result.data || [];
  } else {
    const pool = getPostgresPool();
    if (!pool) {
      return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL is required." }, { status: 500 });
    }

    const result = await pool.query<TradingAccountCredentialRow>(
      `select id, user_id, prop_account_id, account_login, broker_server,
              encrypted_password, status, auto_sync_enabled, last_synced_at
       from public.trading_accounts
       where platform = 'MT5' and auto_sync_enabled is true
       order by updated_at desc
       limit $1`,
      [limit],
    );
    data = result.rows;
  }

  const accounts = [];
  const failed: Array<{ accountId: string; error: string }> = [];

  for (const account of data) {
    if (!account.account_login || !account.broker_server || !account.encrypted_password) continue;

    try {
      accounts.push({
        accountId: account.id,
        userId: account.user_id,
        propAccountId: account.prop_account_id,
        login: account.account_login,
        password: decryptSecret(account.encrypted_password),
        server: account.broker_server,
        status: account.status || "pending",
        lastSyncedAt: account.last_synced_at,
      });
    } catch (errorValue) {
      failed.push({
        accountId: account.id,
        error: errorValue instanceof Error ? errorValue.message : "Could not decrypt credentials.",
      });
    }
  }

  return Response.json({ accounts, failed });
}
