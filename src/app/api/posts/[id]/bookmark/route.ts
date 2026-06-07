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
    .from("post_bookmarks")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (findError) return serverError(findError.message);

  const mutation = existing
    ? auth.supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", auth.user.id)
    : auth.supabase.from("post_bookmarks").insert({ post_id: postId, user_id: auth.user.id });
  const { error } = await mutation;
  if (error) return serverError(error.message);

  return Response.json({ bookmarked: !existing });
}

