import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

async function getFollowCounts(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>, userId: string) {
  const [followers, following] = await Promise.all([
    auth.supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    auth.supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  return {
    followersCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified")
    .eq("id", auth.user.id)
    .single();

  if (error) return serverError(error.message);

  const counts = await getFollowCounts(auth, auth.user.id);
  return Response.json({ profile: { ...data, ...counts } });
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    fullName?: string;
    username?: string;
    avatarUrl?: string | null;
    bio?: string;
    tradingStyle?: string;
    location?: string;
  };
  const fullName = body.fullName?.trim();
  const username = body.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 1000) : null;

  if (!fullName || fullName.length > 80 || !username || username.length < 3 || username.length > 30) {
    return badRequest("Ism va username qiymatlarini tekshiring.");
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      username,
      avatar_url: avatarUrl || null,
      bio: body.bio?.trim().slice(0, 160) ?? "",
      trading_style: body.tradingStyle?.trim().slice(0, 50) || "Price Action",
      location: body.location?.trim().slice(0, 80) ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id)
    .select("id, username, full_name, avatar_url, bio, trading_style, location, is_verified")
    .single();

  if (error) {
    if (error.code === "23505") return badRequest("Bu username band.");
    return serverError(error.message);
  }

  await Promise.all([
    auth.supabase
      .from("posts")
      .update({
        author_name: data.full_name,
        author_handle: data.username,
        author_avatar: data.avatar_url || fullName.slice(0, 2).toUpperCase(),
      })
      .eq("user_id", auth.user.id),
    auth.supabase
      .from("group_messages")
      .update({
        name: data.full_name,
        avatar: data.avatar_url || fullName.slice(0, 2).toUpperCase(),
      })
      .eq("user_id", auth.user.id),
  ]);

  const counts = await getFollowCounts(auth, auth.user.id);
  return Response.json({ profile: { ...data, ...counts } });
}
