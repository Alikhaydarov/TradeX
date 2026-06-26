import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface FollowRow {
  follower_id: string;
  following_id: string;
}

interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  trading_style: string | null;
  location: string | null;
  is_verified?: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
}

function premiumVerified(profile: Pick<ProfileRow, "is_verified" | "plan" | "premium_until">) {
  return Boolean(profile.is_verified) && profile.plan === "premium" && (!profile.premium_until || new Date(profile.premium_until).getTime() > Date.now());
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  const type = searchParams.get("type") === "following" ? "following" : "followers";

  if (!userId) return badRequest("userId kerak.");

  const relationColumn = type === "followers" ? "following_id" : "follower_id";
  const profileColumn = type === "followers" ? "follower_id" : "following_id";

  const { data: follows, error: followsError } = await auth.supabase
    .from("user_follows")
    .select("follower_id, following_id")
    .eq(relationColumn, userId)
    .limit(100);

  if (followsError) return serverError(followsError.message);

  const ids = ((follows ?? []) as FollowRow[]).map((item) => item[profileColumn]);
  if (!ids.length) return Response.json({ users: [] });

  const { data: profiles, error: profilesError } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified, plan, premium_until")
    .in("id", ids);

  if (profilesError) return serverError(profilesError.message);

  const [followers, following, mine] = await Promise.all([
    auth.supabase.from("user_follows").select("following_id").in("following_id", ids),
    auth.supabase.from("user_follows").select("follower_id").in("follower_id", ids),
    auth.supabase.from("user_follows").select("following_id").eq("follower_id", auth.user.id).in("following_id", ids),
  ]);

  const followingSet = new Set((mine.data ?? []).map((item: { following_id: string }) => item.following_id));
  const order = new Map(ids.map((id, index) => [id, index]));

  const users = ((profiles ?? []) as ProfileRow[])
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((profile) => ({
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio ?? "",
      tradingStyle: profile.trading_style ?? "Trader",
      location: profile.location ?? "",
      isVerified: premiumVerified(profile),
      followersCount: (followers.data ?? []).filter((item: { following_id: string }) => item.following_id === profile.id).length,
      followingCount: (following.data ?? []).filter((item: { follower_id: string }) => item.follower_id === profile.id).length,
      isFollowing: followingSet.has(profile.id),
      isSelf: profile.id === auth.user.id,
    }));

  return Response.json({ users });
}
