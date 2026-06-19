import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

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

export async function PUT(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const isVerified = await requireVerified(auth);
  if (!isVerified) return Response.json({ error: "MT5 auto-sync is a verified premium feature." }, { status: 403 });
  return Response.json({ error: "MT5 Python bridge setup is not enabled yet. Use CSV import while the bridge server is configured." }, { status: 501 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { error } = await auth.supabase.from("mt5_connections").delete().eq("user_id", auth.user.id).eq("prop_account_id", id);
  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
