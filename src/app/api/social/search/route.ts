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
}

const premiumVerified = hasVerifiedPremiumAccess;

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const like = `%${query.replace(/[%_]/g, "").slice(0, 40)}%`;

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

  const users = (profiles ?? []).map((profile: ProfileRow) => ({
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
  }));

  return Response.json({ users });
}
