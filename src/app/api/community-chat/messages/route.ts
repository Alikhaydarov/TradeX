import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import {
  CHAT_PAGE_SIZE,
  chatAdmin,
  decodeCursor,
  encodeCursor,
  enforceMessageRateLimit,
  hydrateMessages,
  requireChannelAccess,
  requireDmAccess,
  type RawMessageRow,
} from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function destinationFrom(url: URL) {
  const channelId = url.searchParams.get("channelId");
  const dmThreadId = url.searchParams.get("dmThreadId");
  if (Boolean(channelId) === Boolean(dmThreadId)) return null;
  if (channelId && !UUID_PATTERN.test(channelId)) return null;
  if (dmThreadId && !UUID_PATTERN.test(dmThreadId)) return null;
  return { channelId, dmThreadId };
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const destination = destinationFrom(url);
  if (!destination) return badRequest("Choose one chat destination.");

  try {
    const admin = chatAdmin();
    if (destination.channelId) {
      const access = await requireChannelAccess(auth, destination.channelId);
      if (!access) return Response.json({ error: "Channel access denied." }, { status: 403 });
    } else if (destination.dmThreadId) {
      const thread = await requireDmAccess(admin, destination.dmThreadId, auth.user.id);
      if (!thread) return Response.json({ error: "Direct message access denied." }, { status: 403 });
    }

    const cursor = decodeCursor(url.searchParams.get("cursor"));
    let query = admin
      .from("messages")
      .select(
        "id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CHAT_PAGE_SIZE + 1);

    query = destination.channelId
      ? query.eq("channel_id", destination.channelId)
      : query.eq("dm_thread_id", destination.dmThreadId!);

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const result = await query;
    if (result.error) throw new Error(result.error.message);
    const rows = (result.data ?? []) as RawMessageRow[];
    const hasMore = rows.length > CHAT_PAGE_SIZE;
    const pageRows = rows.slice(0, CHAT_PAGE_SIZE);
    const messages = await hydrateMessages(admin, [...pageRows].reverse(), auth.user.id);

    return Response.json(
      {
        messages,
        nextCursor: hasMore && pageRows.length ? encodeCursor(pageRows.at(-1)!) : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Chat messages fetch failed", error);
    return serverError("Messages could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    channelId?: string | null;
    dmThreadId?: string | null;
    content?: string;
    clientId?: string;
    replyToMessageId?: string | null;
  };
  const channelId = body.channelId || null;
  const dmThreadId = body.dmThreadId || null;
  if (Boolean(channelId) === Boolean(dmThreadId)) return badRequest("Choose one chat destination.");
  if (channelId && !UUID_PATTERN.test(channelId)) return badRequest("Invalid channel.");
  if (dmThreadId && !UUID_PATTERN.test(dmThreadId)) return badRequest("Invalid DM thread.");

  const content = body.content?.trim().slice(0, 4000) ?? "";
  const clientId = body.clientId?.trim().slice(0, 100) || null;
  const replyToMessageId = body.replyToMessageId || null;
  if (!content) return badRequest("Message cannot be empty.");
  if (replyToMessageId && !UUID_PATTERN.test(replyToMessageId)) return badRequest("Invalid reply target.");

  try {
    const admin = chatAdmin();
    if (channelId) {
      const access = await requireChannelAccess(auth, channelId, { write: true });
      if (!access) return Response.json({ error: "Channel access denied." }, { status: 403 });
      if (access.muted) {
        return Response.json({ error: "You are muted in this community." }, { status: 403 });
      }
    } else if (dmThreadId) {
      const thread = await requireDmAccess(admin, dmThreadId, auth.user.id);
      if (!thread) return Response.json({ error: "Direct message access denied." }, { status: 403 });
    }

    if (!(await enforceMessageRateLimit(admin, auth.user.id))) {
      return Response.json(
        { error: "You are sending messages too quickly.", retryAfter: 10 },
        { status: 429, headers: { "Retry-After": "10" } },
      );
    }

    if (replyToMessageId) {
      const reply = await admin
        .from("messages")
        .select("id, channel_id, dm_thread_id")
        .eq("id", replyToMessageId)
        .maybeSingle();
      if (reply.error) throw new Error(reply.error.message);
      if (
        !reply.data ||
        reply.data.channel_id !== channelId ||
        reply.data.dm_thread_id !== dmThreadId
      ) {
        return badRequest("Reply target is not in this conversation.");
      }
    }

    const insertPayload = {
      channel_id: channelId,
      dm_thread_id: dmThreadId,
      sender_id: auth.user.id,
      content,
      client_id: clientId,
      reply_to_message_id: replyToMessageId,
    };
    const inserted = await admin
      .from("messages")
      .insert(insertPayload)
      .select(
        "id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at",
      )
      .single();

    let row = inserted.data as RawMessageRow | null;
    if (inserted.error) {
      if (inserted.error.code === "23505" && clientId) {
        const existing = await admin
          .from("messages")
          .select(
            "id, channel_id, dm_thread_id, sender_id, content, client_id, reply_to_message_id, edited_at, deleted_at, created_at",
          )
          .eq("sender_id", auth.user.id)
          .eq("client_id", clientId)
          .maybeSingle();
        if (existing.error) throw new Error(existing.error.message);
        row = existing.data as RawMessageRow | null;
      } else {
        throw new Error(inserted.error.message);
      }
    }
    if (!row) throw new Error("Message insert returned no row.");

    const [message] = await hydrateMessages(admin, [row], auth.user.id);
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Chat message send failed", error);
    return serverError("Message could not be sent.");
  }
}
