import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptCredential } from "@/lib/server/credential-vault";
import { createMetaApiAccount, deployMetaApiAccount, removeMetaApiAccount } from "@/lib/server/metaapi";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("mt5_connections")
    .select("login, server, platform, metaapi_account_id, status, last_error, last_synced_at, updated_at")
    .eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle();
  if (error) return serverError(error.message);
  return Response.json({ connection: data });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = await request.json() as { login?: string; password?: string; server?: string };
  const login = String(body.login || "").trim();
  const password = String(body.password || "");
  const server = String(body.server || "").trim();
  if (!/^\d+$/.test(login) || !password || !server) return badRequest("Enter a valid MT5 login, password and broker server.");

  let metaApiAccountId: string | null = null;
  try {
    const { data: propAccount } = await auth.supabase.from("prop_accounts").select("name").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (!propAccount) return badRequest("Prop account not found.");
    const { data: current } = await auth.supabase.from("mt5_connections").select("login, metaapi_account_id").eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle();
    if (current?.metaapi_account_id) {
      try { await removeMetaApiAccount(current.metaapi_account_id); } catch {
        // A missing previous remote account does not block reconnecting.
      }
    }
    const created = await createMetaApiAccount({
      name: `TradeWay - ${propAccount.name}`, login, password, server, propAccountId: id,
    });
    metaApiAccountId = created.id;
    await deployMetaApiAccount(metaApiAccountId);

    const { data, error } = await auth.supabase.from("mt5_connections").upsert({
      user_id: auth.user.id, prop_account_id: id, login, server, platform: "mt5",
      password_encrypted: encryptCredential(password), metaapi_account_id: metaApiAccountId,
      status: "pending", last_error: null, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,prop_account_id" })
      .select("login, server, platform, metaapi_account_id, status, last_error, last_synced_at, updated_at").single();
    if (error) return serverError(error.message);
    return Response.json({ connection: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 connection failed.";
    console.error("MT5 connection failed", { userId: auth.user.id, propAccountId: id, login, server, message });
    try {
      await auth.supabase.from("mt5_connections").upsert({
        user_id: auth.user.id, prop_account_id: id, login, server, platform: "mt5",
        password_encrypted: encryptCredential(password), metaapi_account_id: metaApiAccountId,
        status: "error", last_error: message, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,prop_account_id" });
    } catch {
      // Preserve the original MetaApi error when status persistence also fails.
    }
    return badRequest(message);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { data: connection } = await auth.supabase.from("mt5_connections").select("metaapi_account_id").eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle();
  try {
    if (connection?.metaapi_account_id) {
      await removeMetaApiAccount(connection.metaapi_account_id);
    }
  } catch {
    // Local connection is still removed when the remote account no longer exists.
  }
  const { error } = await auth.supabase.from("mt5_connections").delete().eq("user_id", auth.user.id).eq("prop_account_id", id);
  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
