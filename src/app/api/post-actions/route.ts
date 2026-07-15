import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

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
    return Response.json({
      success: true,
      counted: Boolean(result?.counted),
      views: typeof result?.current_views === "number" ? result.current_views : null,
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
