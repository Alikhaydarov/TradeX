import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { renewTradovateAccessToken } from "@/lib/backend/tradovate-renew";
import {
  decryptTradovateToken,
  encryptTradovateToken,
  loadTradovateJournalRows,
  refreshTradovateToken,
  tokenExpiresAt,
  type TradovateConnection,
} from "@/lib/backend/tradovate";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const [{ data: account, error: accountError }, { data: connection, error: connectionError }] =
    await Promise.all([
      auth.supabase
        .from("prop_accounts")
        .select("id, name, market_type, account_size, profit_target, max_drawdown")
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      auth.supabase
        .from("tradovate_connections")
        .select("*")
        .eq("prop_account_id", id)
        .eq("user_id", auth.user.id)
        .maybeSingle(),
    ]);

  if (accountError) return serverError(accountError.message);
  if (connectionError) return serverError(connectionError.message);
  if (!account) return badRequest("Account not found.");
  if (!connection) return badRequest("Connect Tradovate before syncing trades.");

  const savedConnection = connection as TradovateConnection;
  if (!savedConnection.tradovate_account_id) {
    return badRequest("No Tradovate futures account is selected.");
  }

  try {
    let accessToken = decryptTradovateToken(savedConnection.access_token_encrypted);
    let refreshToken = savedConnection.refresh_token_encrypted
      ? decryptTradovateToken(savedConnection.refresh_token_encrypted)
      : "";

    const expiresAt = savedConnection.expires_at
      ? new Date(savedConnection.expires_at).getTime()
      : 0;
    const shouldRenew = !expiresAt || expiresAt <= Date.now() + 15 * 60 * 1000;

    if (shouldRenew) {
      let nextExpiresAt = "";

      try {
        const renewed = await renewTradovateAccessToken(accessToken);
        accessToken = String(renewed.accessToken || accessToken);
        nextExpiresAt = renewed.expirationTime || tokenExpiresAt(90 * 60);
      } catch (renewError) {
        if (!refreshToken) throw renewError;
        const refreshed = await refreshTradovateToken(refreshToken);
        accessToken = String(refreshed.access_token || accessToken);
        refreshToken = String(refreshed.refresh_token || refreshToken);
        nextExpiresAt = tokenExpiresAt(refreshed.expires_in);
      }

      const { error: refreshSaveError } = await auth.supabase
        .from("tradovate_connections")
        .update({
          access_token_encrypted: encryptTradovateToken(accessToken),
          refresh_token_encrypted: refreshToken
            ? encryptTradovateToken(refreshToken)
            : savedConnection.refresh_token_encrypted,
          expires_at: nextExpiresAt,
          status: "connected",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("prop_account_id", id)
        .eq("user_id", auth.user.id);
      if (refreshSaveError) throw new Error(refreshSaveError.message);
    }

    const rows = await loadTradovateJournalRows({
      accessToken,
      externalAccountId: savedConnection.tradovate_account_id,
      userId: auth.user.id,
      account,
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
      if (error) throw new Error(error.message);
      imported = data?.length || 0;
    }

    const syncedAt = new Date().toISOString();
    const { error: saveError } = await auth.supabase
      .from("tradovate_connections")
      .update({
        status: "connected",
        last_synced_at: syncedAt,
        last_error: null,
        updated_at: syncedAt,
      })
      .eq("prop_account_id", id)
      .eq("user_id", auth.user.id);
    if (saveError) throw new Error(saveError.message);

    await auth.supabase
      .from("prop_accounts")
      .update({ status: "Active", updated_at: syncedAt })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    return Response.json({ imported, scanned: rows.length, syncedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tradovate sync failed.";
    await auth.supabase
      .from("tradovate_connections")
      .update({
        status: "error",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("prop_account_id", id)
      .eq("user_id", auth.user.id);
    return serverError(message);
  }
}
