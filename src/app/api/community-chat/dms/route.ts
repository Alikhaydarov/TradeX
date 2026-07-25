import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, profileFrom } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { peerUserId?: string };
  const peerUserId = body.peerUserId ?? "";
  if (!UUID_PATTERN.test(peerUserId) || peerUserId === auth.user.id) {
    return badRequest("Invalid direct-message recipient.");
  }

  try {
    const admin = chatAdmin();
    const peer = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url, is_verified")
      .eq("id", peerUserId)
      .maybeSingle();
    if (peer.error) throw new Error(peer.error.message);
    if (!peer.data) return Response.json({ error: "User not found." }, { status: 404 });

    const existing = await admin
      .from("dm_threads")
      .select("id, user_one_id, user_two_id, created_at")
      .or(
        `and(user_one_id.eq.${auth.user.id},user_two_id.eq.${peerUserId}),and(user_one_id.eq.${peerUserId},user_two_id.eq.${auth.user.id})`,
      )
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    let thread = existing.data;
    if (!thread) {
      const inserted = await admin
        .from("dm_threads")
        .insert({ user_one_id: auth.user.id, user_two_id: peerUserId })
        .select("id, user_one_id, user_two_id, created_at")
        .single();
      if (inserted.error) {
        if (inserted.error.code !== "23505") throw new Error(inserted.error.message);
        const raced = await admin
          .from("dm_threads")
          .select("id, user_one_id, user_two_id, created_at")
          .or(
            `and(user_one_id.eq.${auth.user.id},user_two_id.eq.${peerUserId}),and(user_one_id.eq.${peerUserId},user_two_id.eq.${auth.user.id})`,
          )
          .single();
        if (raced.error) throw new Error(raced.error.message);
        thread = raced.data;
      } else {
        thread = inserted.data;
      }
    }

    return Response.json({
      thread: {
        id: thread.id,
        peer: profileFrom(peer.data, peerUserId),
        createdAt: thread.created_at,
        unreadCount: 0,
      },
    });
  } catch (error) {
    console.error("DM thread create failed", error);
    return serverError("Direct message could not be opened.");
  }
}
