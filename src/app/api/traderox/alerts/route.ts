import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { requirePremium } from "@/lib/backend/premium";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";

  let query = auth.supabase
    .from("traderox_alerts")
    .select("id, account_id, trade_id, type, severity, title, message, metadata, is_read, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return Response.json({ alerts: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const premiumError = await requirePremium(auth);
  if (premiumError) return premiumError;

  const body = await request.json().catch(() => ({})) as { ids?: unknown; read?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  if (!ids.length) return badRequest("ids are required.");

  const { data, error } = await auth.supabase
    .from("traderox_alerts")
    .update({ is_read: body.read !== false })
    .eq("user_id", auth.user.id)
    .in("id", ids)
    .select("id, is_read");

  if (error) return serverError(error.message);
  return Response.json({ alerts: data || [] });
}
