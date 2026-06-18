import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = await request.json() as { content?: string };
  const content = String(body.content || "").trim();
  if (!content || content.length > 280) return badRequest("Post must contain between 1 and 280 characters.");

  const { data, error } = await auth.supabase.from("posts")
    .update({ content })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return badRequest("You can only edit your own post.");
  return Response.json({ post: data });
}
