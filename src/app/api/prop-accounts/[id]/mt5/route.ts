import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { encryptCredential } from "@/lib/server/credential-vault";
import { getMt5AccountInformation } from "@/lib/server/metaapi";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { data, error } = await auth.supabase
    .from("mt5_connections")
    .select("login, server, metaapi_account_id, status, last_error, last_synced_at, updated_at")
    .eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle();
  if (error) return serverError(error.message);
  return Response.json({ connection: data });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = await request.json() as { login?: string; password?: string; server?: string; metaApiAccountId?: string };
  const login = String(body.login || "").trim();
  const password = String(body.password || "");
  const server = String(body.server || "").trim();
  const metaApiAccountId = String(body.metaApiAccountId || "").trim();
  if (!login || !password || !server || !metaApiAccountId) return badRequest("Login, password, server and MetaApi account ID are required.");

  try {
    await getMt5AccountInformation(metaApiAccountId);
    const { data, error } = await auth.supabase.from("mt5_connections").upsert({
      user_id: auth.user.id,
      prop_account_id: id,
      login,
      server,
      password_encrypted: encryptCredential(password),
      metaapi_account_id: metaApiAccountId,
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,prop_account_id" }).select("login, server, metaapi_account_id, status, last_error, last_synced_at, updated_at").single();
    if (error) return serverError(error.message);
    return Response.json({ connection: data });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "MT5 connection failed.");
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

