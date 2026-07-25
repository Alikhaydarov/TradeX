import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, hydrateMessages, requireChannelAccess, requireDmAccess, type RawMessageRow } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    messageId?: string;
    emoji?: string;
  };
  const messageId = body.messageId ?? "";
  const emoji = body.emoji?.trim().slice(0, 24) ?? "";
  if (!UUID_PATTERN.test(messageId) || !emoji) return badRequest("Invalid reaction.");

  try {
    const admin = chatAdmin();
    const messageResult = await admin
      .from("messages")
      .select("id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (messageResult.error) throw new Error(messageResult.error.message);
    const row = messageResult.data as RawMessageRow | null;
    if (!row) return Response.json({ error: "Message not found." }, { status: 404 });

    if (row.channel_id) {
      const access = await requireChannelAccess(auth, row.channel_id);
      if (!access) return Response.json({ error: "Channel access denied." }, { status: 403 });
    } else if (row.dm_thread_id) {
      const thread = await requireDmAccess(admin, row.dm_thread_id, auth.user.id);
      if (!thread) return Response.json({ error: "DM access denied." }, { status: 403 });
    }

    const existing = await admin
      .from("message_reactions")
      .select("message_id")
      .eq("message_id", messageId)
      .eq("user_id", auth.user.id)
      .eq("emoji", emoji)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    let active = false;
    if (existing.data) {
      const removed = await admin
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", auth.user.id)
        .eq("emoji", emoji);
      if (removed.error) throw new Error(removed.error.message);
    } else {
      const inserted = await admin.from("message_reactions").insert({
        message_id: messageId,
        user_id: auth.user.id,
        emoji,
      });
      if (inserted.error) throw new Error(inserted.error.message);
      active = true;
    }

    const [message] = await hydrateMessages(admin, [row], auth.user.id);
    return Response.json({ active, message });
  } catch (error) {
    console.error("Reaction toggle failed", error);
    return serverError("Reaction could not be updated.");
  }
}
