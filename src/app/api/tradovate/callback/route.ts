import { authenticateRequest } from "@/lib/backend/auth";
import {
  encryptTradovateToken,
  exchangeTradovateCode,
  getTradovateConfig,
  listTradovateAccounts,
  loadTradovateJournalRows,
  tokenExpiresAt,
  verifyTradovateOAuthState,
} from "@/lib/backend/tradovate";

export const runtime = "nodejs";

function accountRedirect(request: Request, status: "connected" | "error", accountId?: string) {
  const url = new URL("/account", request.url);
  url.searchParams.set("tradovate", status);
  if (accountId) url.searchParams.set("accountId", accountId);
  return url;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/account");
    return Response.redirect(login);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return Response.redirect(accountRedirect(request, "error"));
  }

  let accountId = "";

  try {
    const statePayload = verifyTradovateOAuthState(state);
    accountId = statePayload.accountId;
    if (statePayload.userId !== auth.user.id) {
      throw new Error("Tradovate OAuth user does not match the signed-in user.");
    }

    const { data: account, error: accountError } = await auth.supabase
      .from("prop_accounts")
      .select("id, name, prop_login, market_type, account_size, profit_target, max_drawdown")
      .eq("id", accountId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (accountError) throw new Error(accountError.message);
    if (!account) throw new Error("Account not found.");

    const token = await exchangeTradovateCode(code);
    const accessToken = String(token.access_token || "");
    const tradovateAccounts = await listTradovateAccounts(accessToken);
    const preferred = String(account.prop_login || "").trim().toLowerCase();
    const selected =
      tradovateAccounts.find(
        (item) =>
          preferred &&
          (String(item.id) === preferred || String(item.name || "").trim().toLowerCase() === preferred),
      ) ||
      tradovateAccounts.find((item) => item.active !== false) ||
      tradovateAccounts[0];

    if (!selected) throw new Error("No Tradovate account is available for this login.");

    const config = getTradovateConfig();
    const connectionPayload = {
      user_id: auth.user.id,
      prop_account_id: accountId,
      tradovate_user_id: selected.userId || null,
      tradovate_account_id: selected.id,
      tradovate_account_name: selected.name,
      access_token_encrypted: encryptTradovateToken(accessToken),
      refresh_token_encrypted: token.refresh_token
        ? encryptTradovateToken(String(token.refresh_token))
        : null,
      expires_at: tokenExpiresAt(token.expires_in),
      environment: config.environment,
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    };

    const { error: connectionError } = await auth.supabase
      .from("tradovate_connections")
      .upsert(connectionPayload, { onConflict: "prop_account_id" });
    if (connectionError) throw new Error(connectionError.message);

    const { error: updateError } = await auth.supabase
      .from("prop_accounts")
      .update({
        platform: "tradovate",
        import_source: "tradovate",
        market_type: "Futures",
        prop_login: selected.name || String(selected.id),
        status: "Active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", auth.user.id);
    if (updateError) throw new Error(updateError.message);

    try {
      const rows = await loadTradovateJournalRows({
        accessToken,
        externalAccountId: selected.id,
        userId: auth.user.id,
        account,
      });

      if (rows.length) {
        const { error: journalError } = await auth.supabase
          .from("journal_entries")
          .upsert(rows, {
            onConflict: "user_id,external_source,external_id",
            ignoreDuplicates: true,
          });
        if (journalError) throw new Error(journalError.message);
      }

      await auth.supabase
        .from("tradovate_connections")
        .update({
          last_synced_at: new Date().toISOString(),
          last_error: null,
          status: "connected",
          updated_at: new Date().toISOString(),
        })
        .eq("prop_account_id", accountId)
        .eq("user_id", auth.user.id);
    } catch (syncError) {
      await auth.supabase
        .from("tradovate_connections")
        .update({
          last_error: syncError instanceof Error ? syncError.message : "Initial Tradovate sync failed.",
          status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("prop_account_id", accountId)
        .eq("user_id", auth.user.id);
    }

    return Response.redirect(accountRedirect(request, "connected", accountId));
  } catch (error) {
    console.error("Tradovate callback failed", error);
    return Response.redirect(accountRedirect(request, "error", accountId || undefined));
  }
}
