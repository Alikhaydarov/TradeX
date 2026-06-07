import { authenticateRequest, serverError } from "@/lib/backend/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return serverError(error.message);

  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ posts, likedPostIds: [], bookmarkedPostIds: [] });
  }

  const [likes, bookmarks] = await Promise.all([
    auth.supabase.from("post_likes").select("post_id").eq("user_id", auth.user.id),
    auth.supabase.from("post_bookmarks").select("post_id").eq("user_id", auth.user.id),
  ]);

  return Response.json({
    posts,
    likedPostIds: likes.data?.map((item) => item.post_id) ?? [],
    bookmarkedPostIds: bookmarks.data?.map((item) => item.post_id) ?? [],
  });
}
