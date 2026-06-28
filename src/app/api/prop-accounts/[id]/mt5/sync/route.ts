import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { enqueueMt5SyncJob } from "@/lib/backend/mt5-sync-queue";
import { getPostgresPool } from "@/lib/backend/postgres";
import { requirePremium } from "@/lib/backend/premium";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface TradingAccountSyncRow {
  id: string;
  user_id: string;
  broker_server: string | null;
  account_login: string | null;
  encrypted_password: string | null;
  last_synced_at: string | null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;
  const { id } = await context.params;

  const supabase = getSupabaseAdminClient();
  let account: TradingAccountSyncRow | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("trading_accounts")
      .select("id, user_id, broker_server, account_login, encrypted_password, last_synced_at")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", id)
      .eq("platform", "MT5")
      .maybeSingle<TradingAccountSyncRow>();
    if (error) return serverError(error.message);
    account = data;
  } else {
    const pool = getPostgresPool();
    if (!pool) return serverError("DATABASE_URL is not configured.");
    const result = await pool.query<TradingAccountSyncRow>(
      `select id, user_id, broker_server, account_login, encrypted_password, last_synced_at
       from public.trading_accounts
       where user_id = $1 and prop_account_id = $2 and platform = 'MT5'
       limit 1`,
      [auth.user.id, id],
    );
    account = result.rows[0] || null;
  }

  if (!account) {
    return Response.json({ error: "MT5 connection not found. Add credentials in Settings first." }, { status: 404 });
  }
  if (!account.account_login || !account.broker_server || !account.encrypted_password) {
    return Response.json({ error: "MT5 credentials are incomplete." }, { status: 400 });
  }

  const from = account.last_synced_at
    ? new Date(account.last_synced_at)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const to = new Date();

  try {
    const job = await enqueueMt5SyncJob({
      accountId: account.id,
      userId: auth.user.id,
      from: from.toISOString(),
      to: to.toISOString(),
      priority: 10,
    });

    if (!job) return serverError("DATABASE_URL is required to queue MT5 sync.");

    if (supabase) {
      await supabase
        .from("trading_accounts")
        .update({ status: "pending", last_error: null, updated_at: new Date().toISOString() })
        .eq("id", account.id)
        .eq("user_id", auth.user.id);
    } else {
      const pool = getPostgresPool();
      await pool?.query(
        `update public.trading_accounts
         set status = 'pending', last_error = null, updated_at = now()
         where id = $1 and user_id = $2`,
        [account.id, auth.user.id],
      );
    }

    return Response.json({
      queued: true,
      jobId: job.id,
      message: "MT5 sync queued. The local bridge worker will import trades into the journal.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 sync failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
