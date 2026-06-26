import { authenticateRequest, serverError } from "@/lib/backend/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileInsights } from "@/lib/server/profile-insights";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ username: string }>;
}

async function followCounts(supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>, userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  return {
    followersCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

function premiumVerified(profile: { is_verified?: boolean | null; plan?: string | null; premium_until?: string | null }) {
  return Boolean(profile.is_verified) && profile.plan === "premium" && (!profile.premium_until || new Date(profile.premium_until).getTime() > Date.now());
}

export async function GET(request: Request, context: Params) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { username: rawUsername } = await context.params;
  const username = rawUsername.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 30);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified, plan, premium_until, ai_enabled, auto_sync_enabled")
    .eq("username", username)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!profile) return Response.json({ error: "Profile topilmadi." }, { status: 404 });

  const [counts, postsResult, insights] = await Promise.all([
    followCounts(supabase, profile.id),
    supabase
      .from("posts")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_archived", false)
      .not("symbol", "is", null)
      .not("side", "is", null)
      .not("trade_result", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
    getProfileInsights(supabase, profile.id),
  ]);
  const { data: posts, error: postsError } = postsResult;

  if (postsError) return serverError(postsError.message);

  const auth = await authenticateRequest(request);
  let isFollowing = false;
  if (auth && auth.user.id !== profile.id) {
    const { data: follow } = await auth.supabase
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", auth.user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = Boolean(follow);
  }

  const hydratedPosts = (posts ?? []).map((post) => ({
    ...post,
    author_name: profile.full_name,
    author_handle: profile.username,
    author_avatar: profile.avatar_url || post.author_avatar,
    author_is_verified: premiumVerified(profile),
  }));

  return Response.json({
    profile: {
      ...profile,
      is_verified: premiumVerified(profile),
      ...counts,
      isFollowing,
    },
    posts: hydratedPosts,
    ...insights,
  });
}
