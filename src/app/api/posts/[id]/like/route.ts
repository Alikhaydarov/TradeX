import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id: postId } = await context.params;

  const { data: existing, error: findError } = await auth.supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (findError) return serverError(findError.message);

  const mutation = existing
    ? auth.supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", auth.user.id)
    : auth.supabase.from("post_likes").insert({ post_id: postId, user_id: auth.user.id });
  const { error } = await mutation;
  if (error) return serverError(error.message);

  const { count } = await auth.supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  return Response.json({ liked: !existing, likes: count ?? 0 });
}

