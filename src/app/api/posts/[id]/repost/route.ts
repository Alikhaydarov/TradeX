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
    .from("post_reposts")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (findError) return serverError(findError.message);

  const mutation = existing
    ? auth.supabase
        .from("post_reposts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", auth.user.id)
    : auth.supabase.from("post_reposts").insert({
        post_id: postId,
        user_id: auth.user.id,
      });

  const { error } = await mutation;
  if (error) return serverError(error.message);

  if (!existing) {
    const [{ data: post }, { data: actor }] = await Promise.all([
      auth.supabase.from("posts").select("user_id, content").eq("id", postId).maybeSingle(),
      auth.supabase.from("profiles").select("full_name, username").eq("id", auth.user.id).maybeSingle(),
    ]);
    if (post?.user_id && post.user_id !== auth.user.id) {
      const actorName = actor?.full_name || actor?.username || "A trader";
      await auth.supabase.from("notifications").insert({
        user_id: post.user_id,
        actor_id: auth.user.id,
        type: "post_repost",
        message: `${actorName} reposted your post.`,
        is_read: false,
      });
    }
  }

  const { count } = await auth.supabase
    .from("post_reposts")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  return Response.json({ reposted: !existing, reposts: count ?? 0 });
}
