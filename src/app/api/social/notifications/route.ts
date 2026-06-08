import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface NotificationRow {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(request.url);
  if (searchParams.get("mode") === "count") {
    const { count, error } = await auth.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("is_read", false);

    if (error) return serverError(error.message);
    return Response.json({ unreadCount: count ?? 0 });
  }

  const { data, error } = await auth.supabase
    .from("notifications")
    .select("id, type, message, is_read, created_at, actor_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return serverError(error.message);

  const actorIds = Array.from(new Set((data ?? []).map((item: NotificationRow) => item.actor_id).filter(Boolean))) as string[];
  const profiles = actorIds.length
    ? await auth.supabase.from("profiles").select("id, username, full_name, avatar_url, is_verified").in("id", actorIds)
    : { data: [], error: null };

  if (profiles.error) return serverError(profiles.error.message);

  const actorMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));

  return Response.json({
    notifications: (data ?? []).map((item: NotificationRow) => {
      const actor = item.actor_id ? actorMap.get(item.actor_id) : null;
      return {
        id: item.id,
        type: item.type,
        message: item.message,
        isRead: item.is_read,
        createdAt: item.created_at,
        actor: actor ? {
          id: actor.id,
          username: actor.username,
          fullName: actor.full_name,
          avatarUrl: actor.avatar_url,
          isVerified: Boolean(actor.is_verified),
        } : null,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { error } = await auth.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", auth.user.id)
    .eq("is_read", false);

  if (error) return serverError(error.message);
  return Response.json({ success: true });
}
