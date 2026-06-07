import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase.rpc("is_admin");
  if (error) return serverError(error.message);

  return Response.json({ isAdmin: Boolean(data) });
}
