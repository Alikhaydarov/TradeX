import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptSecret } from "@/lib/backend/crypto";
import { enqueueMt5SyncJob } from "@/lib/backend/mt5-sync-queue";
import { getPremiumStatus, requirePremium } from "@/lib/backend/premium";
import { connectMt5Api, getMt5ApiStatus, isMt5ApiConfigured } from "@/lib/server/mt5-api";

export const runtime = "nodejs";

const legacyBridgeBaseUrl = (process.env.MT5_BRIDGE_BASE_URL || process.env.MT5_BRIDGE_URL || "").replace(/\/$/, "");
const legacyBridgeToken = process.env.MT5_BRIDGE_TOKEN || "";

async function getConnectorStatus() {
  if (isMt5ApiConfigured()) {
    try {
      const status = await getMt5ApiStatus() as Record<string, unknown> | null;
      return {
        configured: true,
        reachable: true,
        mode: "mt5_api" as const,
        serviceOk: true,
        syncIntervalSeconds: typeof status?.syncIntervalSeconds === "number" ? status.syncIntervalSeconds : null,
        accountFetch: status?.accountFetch ?? null,
        error: null,
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        mode: "mt5_api" as const,
        serviceOk: false,
        syncIntervalSeconds: null,
        accountFetch: null,
        error: error instanceof Error ? error.message : "MT5 API status check failed.",
      };
    }
  }

  if (!legacyBridgeBaseUrl || !legacyBridgeToken) {
    return {
      configured: false,
      reachable: false,
      mode: "mt5_bridge" as const,
      serviceOk: false,
      syncIntervalSeconds: null,
      accountFetch: null,
      error: "MT5 bridge is not configured.",
    };
  }

  try {
    const response = await fetch(`${legacyBridgeBaseUrl}/status`, {
      headers: { Authorization: `Bearer ${legacyBridgeToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    return {
      configured: true,
      reachable: response.ok,
      mode: "mt5_bridge" as const,
      serviceOk: response.ok && Boolean(payload?.ok),
      syncIntervalSeconds: null,
      accountFetch: null,
      error: response.ok ? null : (typeof payload?.detail === "string" ? payload.detail : "MT5 bridge is unreachable."),
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      mode: "mt5_bridge" as const,
      serviceOk: false,
      syncIntervalSeconds: null,
      accountFetch: null,
      error: error instanceof Error ? error.message : "MT5 bridge status check failed.",
    };
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const [{ data: conn }, premium, connectorStatus] = await Promise.all([
    auth.supabase
      .from("trading_accounts")
      .select("id, account_login, broker_server, platform, status, last_error, last_synced_at, auto_sync_enabled, updated_at")
      .eq("user_id", auth.user.id)
      .eq("prop_account_id", id)
      .eq("platform", "MT5")
      .maybeSingle(),
    getPremiumStatus(auth),
    getConnectorStatus(),
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
    bridgeConfigured: connectorStatus.configured,
    connector: connectorStatus.mode,
    connectorStatus,
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
  if (isMt5ApiConfigured()) {
    try {
      await connectMt5Api({
        login,
        password,
        server,
        userId: auth.user.id,
        accountId: conn.id,
        propAccountId: id,
      });
      await auth.supabase
        .from("trading_accounts")
        .update({
          status: "connected",
          last_error: null,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id)
        .eq("user_id", auth.user.id);
    } catch (mt5ApiError) {
      const message = mt5ApiError instanceof Error ? mt5ApiError.message : "MT5 API connect failed.";
      await auth.supabase
        .from("trading_accounts")
        .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
        .eq("id", conn.id)
        .eq("user_id", auth.user.id);
      return Response.json({ error: message }, { status: 502 });
    }
  }
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
      status: isMt5ApiConfigured() ? "connected" : conn.status,
      last_error: null,
      last_synced_at: isMt5ApiConfigured() ? new Date().toISOString() : conn.last_synced_at,
      auto_sync: Boolean(conn.auto_sync_enabled),
    } : null,
    bridgeConfigured: isMt5ApiConfigured() || Boolean(legacyBridgeBaseUrl && legacyBridgeToken),
    connector: isMt5ApiConfigured() ? "mt5_api" : "mt5_bridge",
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
