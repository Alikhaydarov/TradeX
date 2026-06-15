import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ProfileRecord {
  full_name: string;
  username: string;
  avatar_url: string | null;
}

function makeUsername(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const rawUsername =
    typeof user.user_metadata?.user_name === "string"
      ? user.user_metadata.user_name
      : typeof user.user_metadata?.preferred_username === "string"
        ? user.user_metadata.preferred_username
        : user.email?.split("@")[0] ?? "trader";

  const clean = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "trader";
  return `${clean}_${user.id.slice(0, 6)}`;
}

function profileFromAuth(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>): ProfileRecord {
  return {
    full_name: String(
      auth.user.user_metadata.full_name ??
      auth.user.user_metadata.name ??
      auth.user.email?.split("@")[0] ??
      "TradeUp Trader",
    ),
    username: makeUsername(auth.user),
    avatar_url: typeof auth.user.user_metadata.avatar_url === "string" ? auth.user.user_metadata.avatar_url : null,
  };
}

async function ensureProfile(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const { data: existing, error: selectError } = await auth.supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle<ProfileRecord>();

  if (selectError) throw new Error(selectError.message);
  if (existing) return existing;

  const nextProfile = profileFromAuth(auth);
  const { data: created } = await auth.supabase
    .from("profiles")
    .insert({
      id: auth.user.id,
      username: nextProfile.username,
      full_name: nextProfile.full_name,
      avatar_url: nextProfile.avatar_url,
      bio: "",
      trading_style: "Price Action",
      location: "",
    })
    .select("full_name, username, avatar_url")
    .single<ProfileRecord>();

  return created ?? nextProfile;
}

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

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    content?: string;
    imageUrl?: string | null;
    symbol?: string;
    side?: "LONG" | "SHORT";
    entryPrice?: string;
    targetPrice?: string;
  };
  const content = body.content?.trim();
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 1000) : null;

  if ((!content && !imageUrl) || (content && content.length > 280)) {
    return badRequest("Post matni 280 belgidan oshmasin yoki rasm yuklang.");
  }

  let profile: ProfileRecord;
  try {
    profile = await ensureProfile(auth);
  } catch {
    profile = profileFromAuth(auth);
  }

  const initials = profile.full_name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2) || "TU";

  const { data, error } = await auth.supabase
    .from("posts")
    .insert({
      user_id: auth.user.id,
      content: content || "",
      image_url: imageUrl || null,
      author_name: profile.full_name,
      author_handle: profile.username,
      author_avatar: profile.avatar_url || initials,
      symbol: body.symbol?.trim().toUpperCase() || null,
      side: body.side || null,
      entry_price: body.entryPrice?.trim() || null,
      target_price: body.targetPrice?.trim() || null,
      views_count: 0,
      is_archived: false,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return Response.json({ post: data }, { status: 201 });
}
