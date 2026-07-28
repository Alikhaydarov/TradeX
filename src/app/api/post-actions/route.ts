import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

function toFiniteViewCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    action?: "view" | "archive";
    postId?: string;
  };

  if (!body.postId || !body.action) return badRequest("Post va amal tanlanmadi.");

  if (body.action === "view") {
    const { data, error } = await auth.supabase.rpc("record_unique_post_view", {
      target_post_id: body.postId,
    });

    if (error) return serverError(error.message);
    const result = Array.isArray(data) ? data[0] : data;
    const rpcViews = toFiniteViewCount(
      typeof result === "object" && result !== null
        ? (result as { current_views?: unknown }).current_views
        : result,
    );

    let views = rpcViews;
    if (views === null) {
      const { data: post, error: postError } = await auth.supabase
        .from("posts")
        .select("views_count")
        .eq("id", body.postId)
        .maybeSingle();

      if (postError) return serverError(postError.message);
      views = toFiniteViewCount(post?.views_count);
    }

    return Response.json({
      success: true,
      counted:
        typeof result === "object" && result !== null
          ? Boolean((result as { counted?: unknown }).counted)
          : true,
      views,
    });
  }

  if (body.action === "archive") {
    const { error } = await auth.supabase.rpc("archive_post", {
      target_post_id: body.postId,
    });

    if (error) return serverError(error.message);
    return Response.json({ success: true });
  }

  return badRequest("Noto'g'ri amal.");
}
