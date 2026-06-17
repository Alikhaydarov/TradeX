import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as { token?: string; platform?: string };
  const token = body.token?.trim();
  if (!token) return badRequest("Push token kerak.");

  const { error } = await auth.supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: auth.user.id,
        token,
        platform: body.platform?.trim() || "expo",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    );

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as { token?: string };
  const token = body.token?.trim();
  if (!token) return badRequest("Push token kerak.");

  const { error } = await auth.supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("token", token);

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
