import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";

export const runtime = "nodejs";

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
  followers_count?: number | null;
  following_count?: number | null;
  is_following?: boolean | null;
}

const premiumVerified = hasVerifiedPremiumAccess;

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const cleanQuery = query.replace(/[%_]/g, "").slice(0, 40);
  const like = `%${cleanQuery}%`;

  const { data: searchRows, error: searchError } = await auth.supabase.rpc("search_traders", {
    search_query: cleanQuery,
    result_limit: 20,
  });

  if (!searchError) {
    const users = ((searchRows ?? []) as ProfileRow[]).map((profile) => ({
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio ?? "",
      tradingStyle: profile.trading_style ?? "Trader",
      location: profile.location ?? "",
      isVerified: premiumVerified(profile),
      followersCount: Number(profile.followers_count ?? 0),
      followingCount: Number(profile.following_count ?? 0),
      isFollowing: Boolean(profile.is_following),
    }));

    return Response.json({ users });
  }

  const profilesQuery = auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified, plan, premium_until")
    .neq("id", auth.user.id)
    .limit(20);

  const { data: profiles, error } = query
    ? await profilesQuery.or(`username.ilike.${like},full_name.ilike.${like}`)
    : await profilesQuery.order("created_at", { ascending: false });

  if (error) return serverError(error.message);

  const ids = (profiles ?? []).map((profile: ProfileRow) => profile.id);

  const [followers, following, mine] = await Promise.all([
    ids.length ? auth.supabase.from("user_follows").select("following_id").in("following_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? auth.supabase.from("user_follows").select("follower_id").in("follower_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? auth.supabase.from("user_follows").select("following_id").eq("follower_id", auth.user.id).in("following_id", ids) : Promise.resolve({ data: [] }),
  ]);

  const followingSet = new Set((mine.data ?? []).map((item: { following_id: string }) => item.following_id));
  const followerCounts = new Map<string, number>();
  const followingCounts = new Map<string, number>();

  for (const item of followers.data ?? []) {
    const id = (item as { following_id: string }).following_id;
    followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1);
  }

  for (const item of following.data ?? []) {
    const id = (item as { follower_id: string }).follower_id;
    followingCounts.set(id, (followingCounts.get(id) ?? 0) + 1);
  }

  const users = (profiles ?? []).map((profile: ProfileRow) => ({
    id: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio ?? "",
    tradingStyle: profile.trading_style ?? "Trader",
    location: profile.location ?? "",
    isVerified: premiumVerified(profile),
    followersCount: followerCounts.get(profile.id) ?? 0,
    followingCount: followingCounts.get(profile.id) ?? 0,
    isFollowing: followingSet.has(profile.id),
  }));

  return Response.json({ users });
}
