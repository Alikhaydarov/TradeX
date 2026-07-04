import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { sendSocialNotification } from "@/lib/backend/social-notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as { targetUserId?: string };
  const targetUserId = body.targetUserId?.trim();

  if (!targetUserId || targetUserId === auth.user.id) {
    return badRequest("Invalid follow target.");
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("user_follows")
    .select("follower_id, following_id")
    .eq("follower_id", auth.user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existingError) return serverError(existingError.message);

  if (existing) {
    const { error } = await auth.supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", auth.user.id)
      .eq("following_id", targetUserId);

    if (error) return serverError(error.message);

    const { count } = await auth.supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId);

    return Response.json({ following: false, followersCount: count ?? 0 });
  }

  const { error: insertError } = await auth.supabase
    .from("user_follows")
    .insert({ follower_id: auth.user.id, following_id: targetUserId });

  if (insertError) return serverError(insertError.message);

  const { data: actor } = await auth.supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", auth.user.id)
    .maybeSingle();

  const actorName = actor?.full_name || actor?.username || "A trader";

  await sendSocialNotification(auth.supabase, {
    userId: targetUserId,
    actorId: auth.user.id,
    type: "follow",
    message: `${actorName} started following your profile.`,
    entityId: targetUserId,
    entityType: "profile",
    dedupe: true,
  });

  const { count } = await auth.supabase
    .from("user_follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", targetUserId);

  return Response.json({ following: true, followersCount: count ?? 0 });
}
