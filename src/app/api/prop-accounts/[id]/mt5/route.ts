import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptPassword } from "@/lib/backend/encrypt";
import { createMetaApiAccount, getMetaApiToken } from "@/lib/backend/metaapi";
import { getPremiumStatus, requirePremium } from "@/lib/backend/premium";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const [{ data: conn }, premium] = await Promise.all([
    auth.supabase
      .from("mt5_connections")
      .select("login, server, platform, status, last_error, last_synced_at, updated_at")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", id)
      .maybeSingle(),
    getPremiumStatus(auth),
  ]);

  return Response.json({
    connection: conn ? { ...conn, auto_sync: true } : null,
    isVerified: premium.isVerified,
    isPremium: premium.isPremium,
    autoSyncEnabled: premium.autoSyncEnabled,
    metaApiConfigured: Boolean(getMetaApiToken()),
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

  // Encrypt password
  let passwordEncrypted: string;
  try {
    passwordEncrypted = encryptPassword(password);
  } catch {
    return serverError("Parolni shifrlashda xato.");
  }

  // Try to register with MetaAPI (if configured)
  let metaapiAccountId: string | null = null;
  let status = "ready";
  let lastError: string | null = null;

  const metaToken = getMetaApiToken();
  if (metaToken) {
    try {
      // Check if we already have a MetaAPI account
      const { data: existing } = await auth.supabase
        .from("mt5_connections")
        .select("metaapi_account_id")
        .eq("user_id", auth.user.id)
        .eq("prop_account_id", id)
        .maybeSingle();

      if (existing?.metaapi_account_id) {
        metaapiAccountId = existing.metaapi_account_id;
        status = "connected";
      } else {
        metaapiAccountId = await createMetaApiAccount({
          login, password, server, name: propAccount.name,
        });
        status = "connected";
      }
    } catch (err) {
      // Don't fail the whole request - just store creds, sync will retry
      lastError = err instanceof Error ? err.message : "MetaAPI xato";
      status = "error";
    }
  }

  const now = new Date().toISOString();
  const { data: conn, error } = await auth.supabase
    .from("mt5_connections")
    .upsert({
      user_id: auth.user.id,
      prop_account_id: id,
      login,
      server,
      password_encrypted: passwordEncrypted,
      platform: metaToken ? "metaapi" : "mt5",
      metaapi_account_id: metaapiAccountId,
      status,
      last_error: lastError,
      updated_at: now,
    }, { onConflict: "user_id,prop_account_id" })
    .select("login, server, platform, status, last_error, last_synced_at")
    .single();

  if (error) return serverError(error.message);
  return Response.json({ connection: conn ? { ...conn, auto_sync: true } : null, metaApiConfigured: Boolean(metaToken) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const { error } = await auth.supabase
    .from("mt5_connections")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("prop_account_id", id);

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
