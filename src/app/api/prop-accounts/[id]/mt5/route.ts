import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptSecret } from "@/lib/backend/crypto";
import { enqueueMt5SyncJob } from "@/lib/backend/mt5-sync-queue";
import { getPremiumStatus, requirePremium } from "@/lib/backend/premium";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const [{ data: conn }, premium] = await Promise.all([
    auth.supabase
      .from("trading_accounts")
      .select("id, account_login, broker_server, platform, status, last_error, last_synced_at, auto_sync_enabled, updated_at")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", id)
      .eq("platform", "MT5")
      .maybeSingle(),
    getPremiumStatus(auth),
  ]);

  return Response.json({
    connection: conn ? {
      id: conn.id,
      login: conn.account_login,
      server: conn.broker_server,
      platform: "mt5",
      status: conn.status,
      last_error: conn.last_error,
      last_synced_at: conn.last_synced_at,
      auto_sync: Boolean(conn.auto_sync_enabled),
    } : null,
    isVerified: premium.isVerified,
    isPremium: premium.isPremium,
    autoSyncEnabled: premium.autoSyncEnabled,
    bridgeConfigured: true,
    connector: "mtapi",
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;
  const { id } = await context.params;

  const body = await request.json() as {
    login?: string; password?: string; server?: string; autoSync?: boolean;
  };
  const login    = String(body.login    ?? "").trim();
  const password = String(body.password ?? "").trim();
  const server   = String(body.server   ?? "").trim();

  if (!/^\d+$/.test(login) || !server) return badRequest("MT5 login (raqam) va server nomi kerak.");
  if (!password) return badRequest("MT5 parol kerak.");

  // Ensure prop account belongs to user
  const { data: propAccount } = await auth.supabase
    .from("prop_accounts")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!propAccount) return badRequest("Prop account topilmadi.");

  let passwordEncrypted: string;
  try {
    passwordEncrypted = encryptSecret(password);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Parolni shifrlashda xato.");
  }

  const now = new Date().toISOString();
  const { data: conn, error } = await auth.supabase
    .from("trading_accounts")
    .upsert({
      user_id: auth.user.id,
      prop_account_id: id,
      account_login: login,
      broker_server: server,
      encrypted_password: passwordEncrypted,
      platform: "MT5",
      password_type: "investor",
      status: "pending",
      sync_mode: "normal",
      auto_sync_enabled: true,
      last_error: null,
      updated_at: now,
    }, { onConflict: "user_id,platform,broker_server,account_login" })
    .select("id, account_login, broker_server, platform, status, last_error, last_synced_at, auto_sync_enabled")
    .single();

  if (error) return serverError(error.message);
  if (conn) {
    await enqueueMt5SyncJob({
      accountId: conn.id,
      userId: auth.user.id,
      priority: 25,
    });
  }
  return Response.json({
    connection: conn ? {
      id: conn.id,
      login: conn.account_login,
      server: conn.broker_server,
      platform: "mt5",
      status: conn.status,
      last_error: conn.last_error,
      last_synced_at: conn.last_synced_at,
      auto_sync: Boolean(conn.auto_sync_enabled),
    } : null,
    bridgeConfigured: true,
    connector: "mtapi",
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const { error } = await auth.supabase
    .from("trading_accounts")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("prop_account_id", id)
    .eq("platform", "MT5");

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
