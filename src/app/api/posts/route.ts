import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
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

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    content?: string;
    symbol?: string;
    side?: "LONG" | "SHORT";
    entryPrice?: string;
    targetPrice?: string;
  };
  const content = body.content?.trim();
  if (!content || content.length > 280) {
    return badRequest("Post 1 dan 280 tagacha belgi bo'lishi kerak.");
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", auth.user.id)
    .single();

  if (profileError || !profile) return serverError(profileError?.message);

  const initials = profile.full_name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2);
  const { data, error } = await auth.supabase
    .from("posts")
    .insert({
      user_id: auth.user.id,
      content,
      author_name: profile.full_name,
      author_handle: profile.username,
      author_avatar: profile.avatar_url || initials,
      symbol: body.symbol?.trim().toUpperCase() || null,
      side: body.side || null,
      entry_price: body.entryPrice?.trim() || null,
      target_price: body.targetPrice?.trim() || null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return Response.json({ post: data }, { status: 201 });
}

