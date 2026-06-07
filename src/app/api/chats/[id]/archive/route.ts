import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await params;

  const { error } = await auth.supabase.rpc("archive_chat", {
    target_group_id: id,
  });

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
