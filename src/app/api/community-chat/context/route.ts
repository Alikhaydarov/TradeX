import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, profileFrom, requireCommunityAccess } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId") ?? "";
  if (!UUID_PATTERN.test(communityId)) return badRequest("Invalid community.");

  try {
    const admin = chatAdmin();
    const access = await requireCommunityAccess(admin, communityId, auth.user.id);
    if (!access) return Response.json({ error: "Community access denied." }, { status: 403 });

    const [channelsResult, readsResult, profileResult, threadsResult] = await Promise.all([
      admin
        .from("channels")
        .select("id, community_id, name, is_premium_only, position, created_at")
        .eq("community_id", communityId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      admin
        .from("message_reads")
        .select("channel_id, dm_thread_id, last_read_at")
        .eq("user_id", auth.user.id),
      admin
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .eq("id", auth.user.id)
        .maybeSingle(),
      admin
        .from("dm_threads")
        .select("id, user_one_id, user_two_id, created_at")
        .or(`user_one_id.eq.${auth.user.id},user_two_id.eq.${auth.user.id}`)
        .order("created_at", { ascending: false }),
    ]);

    for (const result of [channelsResult, readsResult, profileResult, threadsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const readByChannel = new Map(
      (readsResult.data ?? [])
        .filter((row) => row.channel_id)
        .map((row) => [row.channel_id as string, row.last_read_at as string]),
    );
    const readByDm = new Map(
      (readsResult.data ?? [])
        .filter((row) => row.dm_thread_id)
        .map((row) => [row.dm_thread_id as string, row.last_read_at as string]),
    );

    const channels = await Promise.all(
      (channelsResult.data ?? []).map(async (channel) => {
        let countQuery = admin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", channel.id)
          .neq("sender_id", auth.user.id);
        const lastReadAt = readByChannel.get(channel.id);
        if (lastReadAt) countQuery = countQuery.gt("created_at", lastReadAt);
        const count = await countQuery;
        if (count.error) throw new Error(count.error.message);
        return {
          id: channel.id,
          communityId: channel.community_id,
          name: channel.name,
          isPremiumOnly: Boolean(channel.is_premium_only),
          position: Number(channel.position ?? 0),
          createdAt: channel.created_at,
          unreadCount: count.count ?? 0,
        };
      }),
    );

    const peerIds = [
      ...new Set(
        (threadsResult.data ?? []).map((thread) =>
          thread.user_one_id === auth.user.id ? thread.user_two_id : thread.user_one_id,
        ),
      ),
    ];
    const peersResult = peerIds.length
      ? await admin
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_verified")
          .in("id", peerIds)
      : { data: [], error: null };
    if (peersResult.error) throw new Error(peersResult.error.message);
    const peerMap = new Map((peersResult.data ?? []).map((profile) => [profile.id, profile]));

    const dms = await Promise.all(
      (threadsResult.data ?? []).map(async (thread) => {
        const peerId = thread.user_one_id === auth.user.id ? thread.user_two_id : thread.user_one_id;
        let countQuery = admin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("dm_thread_id", thread.id)
          .neq("sender_id", auth.user.id);
        const lastReadAt = readByDm.get(thread.id);
        if (lastReadAt) countQuery = countQuery.gt("created_at", lastReadAt);
        const count = await countQuery;
        if (count.error) throw new Error(count.error.message);
        return {
          id: thread.id,
          peer: profileFrom(peerMap.get(peerId), peerId),
          createdAt: thread.created_at,
          unreadCount: count.count ?? 0,
        };
      }),
    );

    return Response.json(
      {
        community: {
          id: access.community.id,
          name: access.community.name,
          slug: access.community.slug,
          description: access.community.description || "",
          avatarUrl: access.community.avatar_url || null,
          ownerId: access.community.owner_id,
        },
        role: access.role,
        isOwner: access.isOwner,
        channels,
        dms,
        currentUser: profileFrom(profileResult.data, auth.user.id),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Community chat context failed", error);
    return serverError("Community chat could not be loaded.");
  }
}
