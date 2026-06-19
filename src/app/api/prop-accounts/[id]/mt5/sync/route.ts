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

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    const isVerified = await requireVerified(auth);
    if (!isVerified) return Response.json({ error: "This is a verified premium feature." }, { status: 403 });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }

  return Response.json({ error: "Auto-sync is not enabled yet. Use CSV import for now." }, { status: 501 });
}
