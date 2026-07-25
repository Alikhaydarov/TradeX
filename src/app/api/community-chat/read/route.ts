import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, requireChannelAccess, requireDmAccess } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    channelId?: string | null;
    dmThreadId?: string | null;
    lastReadMessageId?: string | null;
  };
  const channelId = body.channelId || null;
  const dmThreadId = body.dmThreadId || null;
  const lastReadMessageId = body.lastReadMessageId || null;
  if (Boolean(channelId) === Boolean(dmThreadId)) return badRequest("Choose one chat destination.");
  if (channelId && !UUID_PATTERN.test(channelId)) return badRequest("Invalid channel.");
  if (dmThreadId && !UUID_PATTERN.test(dmThreadId)) return badRequest("Invalid DM thread.");
  if (lastReadMessageId && !UUID_PATTERN.test(lastReadMessageId)) return badRequest("Invalid message.");

  try {
    const admin = chatAdmin();
    if (channelId) {
      const access = await requireChannelAccess(auth, channelId);
      if (!access) return Response.json({ error: "Channel access denied." }, { status: 403 });
    } else if (dmThreadId) {
      const thread = await requireDmAccess(admin, dmThreadId, auth.user.id);
      if (!thread) return Response.json({ error: "DM access denied." }, { status: 403 });
    }

    if (lastReadMessageId) {
      const message = await admin
        .from("messages")
        .select("id, channel_id, dm_thread_id")
        .eq("id", lastReadMessageId)
        .maybeSingle();
      if (message.error) throw new Error(message.error.message);
      if (!message.data || message.data.channel_id !== channelId || message.data.dm_thread_id !== dmThreadId) {
        return badRequest("Message is not in this conversation.");
      }
    }

    let existingQuery = admin
      .from("message_reads")
      .select("id")
      .eq("user_id", auth.user.id);
    existingQuery = channelId
      ? existingQuery.eq("channel_id", channelId)
      : existingQuery.eq("dm_thread_id", dmThreadId!);
    const existing = await existingQuery.maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    const payload = {
      channel_id: channelId,
      dm_thread_id: dmThreadId,
      user_id: auth.user.id,
      last_read_message_id: lastReadMessageId,
      last_read_at: new Date().toISOString(),
    };
    const result = existing.data
      ? await admin.from("message_reads").update(payload).eq("id", existing.data.id)
      : await admin.from("message_reads").insert(payload);
    if (result.error) throw new Error(result.error.message);

    return Response.json({ ok: true, readAt: payload.last_read_at });
  } catch (error) {
    console.error("Mark chat read failed", error);
    return serverError("Read status could not be updated.");
  }
}
