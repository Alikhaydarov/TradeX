import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { createMt5Token, hashMt5Token } from "@/lib/server/mt5-token";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("mt5_connections")
    .select("status, token_prefix, last_seen_at, last_synced_at, last_error, updated_at")
    .eq("user_id", auth.user.id).eq("prop_account_id", id).maybeSingle();
  if (error) return serverError(error.message);
  return Response.json({ connection: data });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const token = createMt5Token();
  const { data, error } = await auth.supabase.from("mt5_connections").upsert({
    user_id: auth.user.id,
    prop_account_id: id,
    token_hash: hashMt5Token(token),
    token_prefix: token.slice(0, 16),
    status: "waiting",
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,prop_account_id" })
    .select("status, token_prefix, last_seen_at, last_synced_at, last_error, updated_at").single();
  if (error) return serverError(error.message);
  return Response.json({ connection: data, token });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const { error } = await auth.supabase.from("mt5_connections").delete().eq("user_id", auth.user.id).eq("prop_account_id", id);
  if (error) return serverError(error.message);
  return Response.json({ success: true });
}

