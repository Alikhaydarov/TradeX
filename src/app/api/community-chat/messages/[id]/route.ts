import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, hydrateMessages, requireChannelAccess, requireDmAccess, type RawMessageRow } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

async function loadMessage(id: string) {
  const admin = chatAdmin();
  const result = await admin
    .from("messages")
    .select("id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return { admin, row: result.data as RawMessageRow | null };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return badRequest("Invalid message.");

  const body = (await request.json().catch(() => ({}))) as { content?: string };
  const content = body.content?.trim().slice(0, 4000) ?? "";
  if (!content) return badRequest("Message cannot be empty.");

  try {
    const { admin, row } = await loadMessage(id);
    if (!row) return Response.json({ error: "Message not found." }, { status: 404 });
    if (row.sender_id !== auth.user.id) {
      return Response.json({ error: "Only the sender can edit this message." }, { status: 403 });
    }
    if (row.deleted_at) return Response.json({ error: "Deleted messages cannot be edited." }, { status: 409 });

    if (row.channel_id) {
      const access = await requireChannelAccess(auth, row.channel_id, { write: true });
      if (!access || access.muted) return Response.json({ error: "Channel access denied." }, { status: 403 });
    } else if (row.dm_thread_id) {
      const thread = await requireDmAccess(admin, row.dm_thread_id, auth.user.id);
      if (!thread) return Response.json({ error: "DM access denied." }, { status: 403 });
    }

    const updated = await admin
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at")
      .single();
    if (updated.error) throw new Error(updated.error.message);
    const [message] = await hydrateMessages(admin, [updated.data as RawMessageRow], auth.user.id);
    return Response.json({ message });
  } catch (error) {
    console.error("Message edit failed", error);
    return serverError("Message could not be edited.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return badRequest("Invalid message.");

  try {
    const { admin, row } = await loadMessage(id);
    if (!row) return Response.json({ error: "Message not found." }, { status: 404 });

    let allowed = row.sender_id === auth.user.id;
    if (row.channel_id) {
      const access = await requireChannelAccess(auth, row.channel_id);
      if (!access) return Response.json({ error: "Channel access denied." }, { status: 403 });
      allowed = allowed || access.isOwner || access.role === "admin";
    } else if (row.dm_thread_id) {
      const thread = await requireDmAccess(admin, row.dm_thread_id, auth.user.id);
      if (!thread) return Response.json({ error: "DM access denied." }, { status: 403 });
    }
    if (!allowed) return Response.json({ error: "You cannot delete this message." }, { status: 403 });

    const updated = await admin
      .from("messages")
      .update({ content: "", deleted_at: new Date().toISOString(), edited_at: null })
      .eq("id", id)
      .select("id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at")
      .single();
    if (updated.error) throw new Error(updated.error.message);
    const [message] = await hydrateMessages(admin, [updated.data as RawMessageRow], auth.user.id);
    return Response.json({ message });
  } catch (error) {
    console.error("Message delete failed", error);
    return serverError("Message could not be deleted.");
  }
}
