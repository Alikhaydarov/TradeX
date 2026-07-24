import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getTradovateConfig } from "@/lib/backend/tradovate";

export const runtime = "nodejs";

function isConfigured() {
  try {
    getTradovateConfig();
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const { data, error } = await auth.supabase
    .from("tradovate_connections")
    .select(
      "tradovate_account_id, tradovate_account_name, environment, status, last_synced_at, last_error, expires_at, updated_at",
    )
    .eq("prop_account_id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return serverError(error.message);
  return Response.json({
    configured: isConfigured(),
    connected: Boolean(data),
    connection: data || null,
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  const { data: account, error: accountError } = await auth.supabase
    .from("prop_accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (accountError) return serverError(accountError.message);
  if (!account) return badRequest("Account not found.");

  const { error } = await auth.supabase
    .from("tradovate_connections")
    .delete()
    .eq("prop_account_id", id)
    .eq("user_id", auth.user.id);
  if (error) return serverError(error.message);

  await auth.supabase
    .from("prop_accounts")
    .update({ status: "Paused", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  return Response.json({ disconnected: true });
}
