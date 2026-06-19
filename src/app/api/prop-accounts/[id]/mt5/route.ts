import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptCredential } from "@/lib/server/credential-vault";
import { testMt5BridgeLogin } from "@/lib/server/mt5-bridge";

export const runtime = "nodejs";
export const maxDuration = 300;

async function requireVerified(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("is_verified")
    .eq("id", auth.user.id)
    .single();

  if (error) throw new Error(error.message);
  return Boolean(data?.is_verified);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("mt5_connections")
    .select("login, server, platform, metaapi_account_id, status, last_error, last_synced_at, updated_at")
    .eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle();
  if (error) return serverError(error.message);
  return Response.json({ connection: data, isVerified: await requireVerified(auth) });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = await request.json() as { login?: string; password?: string; server?: string };
  const login = String(body.login || "").trim();
  const password = String(body.password || "");
  const server = String(body.server || "").trim();
  if (!/^\d+$/.test(login) || !password || !server) return badRequest("Enter a valid MT5 login, investor password and broker server.");

  let isVerified = false;
  try {
    isVerified = await requireVerified(auth);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
  if (!isVerified) return Response.json({ error: "MT5 auto-sync is a verified premium feature." }, { status: 403 });

  try {
    const { data: propAccount } = await auth.supabase.from("prop_accounts").select("name").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (!propAccount) return badRequest("Prop account not found.");

    await testMt5BridgeLogin({ login, password, server });

    const { data, error } = await auth.supabase.from("mt5_connections").upsert({
      user_id: auth.user.id, prop_account_id: id, login, server, platform: "mt5",
      password_encrypted: encryptCredential(password), metaapi_account_id: `python:${login}`,
      status: "connected", last_error: null, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,prop_account_id" })
      .select("login, server, platform, metaapi_account_id, status, last_error, last_synced_at, updated_at").single();
    if (error) return serverError(error.message);
    return Response.json({ connection: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MT5 connection failed.";
    console.error("MT5 bridge connection failed", { userId: auth.user.id, propAccountId: id, login, server, message });
    try {
      await auth.supabase.from("mt5_connections").upsert({
        user_id: auth.user.id, prop_account_id: id, login, server, platform: "mt5",
        password_encrypted: encryptCredential(password), metaapi_account_id: null,
        status: "error", last_error: message, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,prop_account_id" });
    } catch {
      // Preserve the original MT5 bridge error when status persistence also fails.
    }
    return badRequest(message);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { error } = await auth.supabase.from("mt5_connections").delete().eq("user_id", auth.user.id).eq("prop_account_id", id);
  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
