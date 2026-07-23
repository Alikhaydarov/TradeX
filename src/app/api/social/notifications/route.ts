import {
  authenticateRequest,
  serverError,
  unauthorized,
} from "@/lib/backend/auth";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";

export const runtime = "nodejs";

interface NotificationRow {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  entity_id?: string | null;
  entity_type?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ActorProfileRow {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean | null;
  plan: string | null;
  premium_until: string | null;
}

type NotificationSelectResult = {
  data: NotificationRow[] | null;
  error: { message: string } | null;
};

const premiumVerified = hasVerifiedPremiumAccess;

function isMissingSmartColumn(message: string) {
  return /notifications\.(entity_id|entity_type|metadata)|column\s+(entity_id|entity_type|metadata)\s+does\s+not\s+exist|schema cache/i.test(
    message,
  );
}

async function selectNotifications(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
) {
  const query = () =>
    auth.supabase
      .from("notifications")
      .select(
        "id, type, message, is_read, created_at, actor_id, entity_id, entity_type, metadata",
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<NotificationRow[]>();

  const result = (await query()) as NotificationSelectResult;
  if (!result.error || !isMissingSmartColumn(result.error.message))
    return result;

  const fallback = await auth.supabase
    .from("notifications")
    .select("id, type, message, is_read, created_at, actor_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<NotificationRow[]>();

  return fallback as NotificationSelectResult;
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

  const { data, error } = await selectNotifications(auth);

  if (error) return serverError(error.message);

  const actorIds = Array.from(
    new Set(
      (data ?? [])
        .map((item: NotificationRow) => item.actor_id)
        .filter(Boolean),
    ),
  ) as string[];
  const profiles = actorIds.length
    ? await auth.supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, is_verified, plan, premium_until",
        )
        .in("id", actorIds)
        .returns<ActorProfileRow[]>()
    : { data: [], error: null };

  if (profiles.error) return serverError(profiles.error.message);

  const actorMap = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile]),
  );

  return Response.json({
    notifications: (data ?? []).map((item: NotificationRow) => {
      const actor = item.actor_id ? actorMap.get(item.actor_id) : null;
      return {
        id: item.id,
        type: item.type,
        message: item.message,
        isRead: item.is_read,
        createdAt: item.created_at,
        entityId: item.entity_id ?? null,
        entityType: item.entity_type ?? null,
        metadata: item.metadata ?? {},
        actor: actor
          ? {
              id: actor.id,
              username: actor.username,
              fullName: actor.full_name,
              avatarUrl: actor.avatar_url,
              isVerified: premiumVerified(actor),
            }
          : null,
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
