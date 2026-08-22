import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toFiniteViewCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function canFallbackFromViewRpc(message: string) {
  return /record_unique_post_view|post_views|schema cache|could not find the function|permission denied|does not exist/i.test(
    message,
  );
}

async function recordUniqueViewFallback(postId: string, viewerId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { data: null, error: "SUPABASE_SERVICE_ROLE_KEY is required." };

  const { data: post, error: postError } = await admin
    .from("posts")
    .select("id, user_id, views_count, is_archived")
    .eq("id", postId)
    .maybeSingle();

  if (postError) return { data: null, error: postError.message };
  if (!post || post.is_archived) return { data: null, error: "Post topilmadi." };
  if (post.user_id === viewerId) {
    return {
      data: { counted: false, current_views: toFiniteViewCount(post.views_count) ?? 0 },
      error: null,
    };
  }

  const { data: existing, error: existingError } = await admin
    .from("post_views")
    .select("post_id")
    .eq("post_id", postId)
    .eq("viewer_id", viewerId)
    .maybeSingle();

  if (existingError) return { data: null, error: existingError.message };

  let counted = false;
  if (!existing) {
    const { error: insertError } = await admin
      .from("post_views")
      .insert({ post_id: postId, viewer_id: viewerId });
    if (insertError && insertError.code !== "23505") {
      return { data: null, error: insertError.message };
    }
    counted = !insertError;
  }

  const { count, error: countError } = await admin
    .from("post_views")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) return { data: null, error: countError.message };
  const currentViews = count ?? 0;
  const { error: updateError } = await admin
    .from("posts")
    .update({ views_count: currentViews })
    .eq("id", postId);

  if (updateError) return { data: null, error: updateError.message };
  return {
    data: { counted, current_views: currentViews },
    error: null,
  };
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
    const rpcResult = await auth.supabase.rpc("record_unique_post_view", {
      target_post_id: body.postId,
    });
    let data = rpcResult.data;

    if (rpcResult.error && canFallbackFromViewRpc(rpcResult.error.message)) {
      const fallback = await recordUniqueViewFallback(body.postId, auth.user.id);
      if (fallback.error) return serverError(fallback.error);
      data = fallback.data;
    } else if (rpcResult.error) {
      return serverError(rpcResult.error.message);
    }
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
