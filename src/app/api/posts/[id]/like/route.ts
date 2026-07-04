import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { sendSocialNotification } from "@/lib/backend/social-notifications";

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

  if (!existing) {
    const [{ data: post }, { data: actor }] = await Promise.all([
      auth.supabase.from("posts").select("user_id, content").eq("id", postId).maybeSingle(),
      auth.supabase.from("profiles").select("full_name, username").eq("id", auth.user.id).maybeSingle(),
    ]);

    if (post?.user_id && post.user_id !== auth.user.id) {
      const actorName = actor?.full_name || actor?.username || "A trader";
      const preview = String(post.content || "").trim().slice(0, 80);
      await sendSocialNotification(auth.supabase, {
        userId: post.user_id,
        actorId: auth.user.id,
        type: "post_like",
        message: `${actorName} liked your trade post${preview ? `: ${preview}` : "."}`,
        entityId: postId,
        entityType: "post",
        dedupe: true,
      });
    }
  }

  const { count } = await auth.supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  return Response.json({ liked: !existing, likes: count ?? 0 });
}
