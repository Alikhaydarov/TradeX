import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const [{ data, error }, { data: profile, error: profileError }] = await Promise.all([
    auth.supabase.from("mt5_connections")
      .select("login, server, platform, status, last_error, last_synced_at, updated_at")
      .eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle(),
    auth.supabase.from("profiles").select("is_verified").eq("id", auth.user.id).maybeSingle(),
  ]);
  if (error) return serverError(error.message);
  if (profileError) return serverError(profileError.message);
  return Response.json({ connection: data, isVerified: Boolean(profile?.is_verified) });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = await request.json() as { login?: string; server?: string };
  const login = String(body.login || "").trim();
  const server = String(body.server || "").trim();
  if (!/^\d+$/.test(login) || !server) return badRequest("Enter a valid MT5 login and broker server.");

  const [{ data: propAccount }, { data: profile, error: profileError }] = await Promise.all([
    auth.supabase.from("prop_accounts").select("id").eq("id", id).eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.from("profiles").select("is_verified").eq("id", auth.user.id).maybeSingle(),
  ]);
  if (!propAccount) return badRequest("Prop account not found.");
  if (profileError) return serverError(profileError.message);
  if (!profile?.is_verified) return badRequest("MT5 auto-sync is available for verified profiles only.");

  const now = new Date().toISOString();
  const { data, error } = await auth.supabase.from("mt5_connections").upsert({
    user_id: auth.user.id,
    prop_account_id: id,
    login,
    server,
    platform: "mt5-python-bridge",
    password_encrypted: null,
    metaapi_account_id: null,
    status: "ready",
    last_error: null,
    updated_at: now,
  }, { onConflict: "user_id,prop_account_id" })
    .select("login, server, platform, status, last_error, last_synced_at, updated_at").single();
  if (error) return serverError(error.message);
  return Response.json({ connection: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { error } = await auth.supabase.from("mt5_connections").delete().eq("user_id", auth.user.id).eq("prop_account_id", id);
  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
