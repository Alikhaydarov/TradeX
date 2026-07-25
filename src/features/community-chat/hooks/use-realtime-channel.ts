"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  ChatMessage,
  ChatPresenceMeta,
  ChatProfile,
  ChatReplyPreview,
  ChatRoomKind,
  RealtimeChatEvent,
} from "../types";
import { useMessagesPagination } from "./use-messages-pagination";

function roomName(kind: ChatRoomKind, id: string) {
  return kind === "channel" ? `channel:${id}` : `dm:${id}`;
}

export function useRealtimeChannel({
  roomKind,
  roomId,
  currentUser,
}: {
  roomKind: ChatRoomKind;
  roomId: string;
  currentUser: ChatProfile;
}) {
  const pagination = useMessagesPagination({ roomKind, roomId });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const subscribedOnceRef = useRef(false);
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline">("connecting");
  const [presence, setPresence] = useState<ChatPresenceMeta[]>([]);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

  const broadcast = useCallback(async (event: RealtimeChatEvent) => {
    const channel = channelRef.current;
    if (!channel) return;
    // Writes are committed through Route Handlers first, then broadcast. This avoids
    // broadcasting uncommitted rows. A reconnect reload heals any missed event.
    await channel.send({ type: "broadcast", event: "chat-event", payload: event });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setConnection("offline");
      return;
    }

    setConnection("connecting");
    const room = supabase.channel(roomName(roomKind, roomId), {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: currentUser.id },
      },
    });
    channelRef.current = room;

    room
      .on("broadcast", { event: "chat-event" }, ({ payload }) => {
        const event = payload as RealtimeChatEvent;
        if (event.message) pagination.merge(event.message);
      })
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState<ChatPresenceMeta>();
        const users = Object.values(state)
          .flat()
          .filter((item): item is ChatPresenceMeta => Boolean(item?.userId));
        const unique = new Map(users.map((user) => [user.userId, user]));
        setPresence([...unique.values()]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnection("connected");
          await room.track({
            userId: currentUser.id,
            username: currentUser.username,
            fullName: currentUser.fullName,
            avatarUrl: currentUser.avatarUrl,
            onlineAt: new Date().toISOString(),
            typing: false,
          } satisfies ChatPresenceMeta);
          if (subscribedOnceRef.current) void pagination.reload();
          subscribedOnceRef.current = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnection("offline");
        }
      });

    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      void room.untrack();
      void supabase.removeChannel(room);
      channelRef.current = null;
      setPresence([]);
    };
  }, [currentUser, pagination.merge, pagination.reload, roomId, roomKind]);

  const updateTyping = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current;
      if (!channel) return;
      void channel.track({
        userId: currentUser.id,
        username: currentUser.username,
        fullName: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl,
        onlineAt: new Date().toISOString(),
        typing,
      } satisfies ChatPresenceMeta);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (typing) {
        typingTimerRef.current = window.setTimeout(() => updateTyping(false), 1300);
      }
    },
    [currentUser],
  );

  const markRead = useCallback(
    async (lastReadMessageId: string | null) => {
      await fetch("/api/community-chat/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: roomKind === "channel" ? roomId : null,
          dmThreadId: roomKind === "dm" ? roomId : null,
          lastReadMessageId,
        }),
      });
    },
    [roomId, roomKind],
  );

  const sendMessage = useCallback(
    async (content: string, reply: ChatReplyPreview | null = null) => {
      const trimmed = content.trim();
      if (!trimmed || Date.now() < rateLimitedUntil) return null;
      const clientId = crypto.randomUUID();
      const optimistic: ChatMessage = {
        id: `temp-${clientId}`,
        channelId: roomKind === "channel" ? roomId : null,
        dmThreadId: roomKind === "dm" ? roomId : null,
        senderId: currentUser.id,
        sender: currentUser,
        content: trimmed,
        clientId,
        replyToMessageId: reply?.id ?? null,
        reply,
        reactions: [],
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      pagination.merge(optimistic);
      updateTyping(false);

      try {
        const response = await fetch("/api/community-chat/messages", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: roomKind === "channel" ? roomId : null,
            dmThreadId: roomKind === "dm" ? roomId : null,
            content: trimmed,
            clientId,
            replyToMessageId: reply?.id ?? null,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { message?: ChatMessage; error?: string; retryAfter?: number }
          | null;
        if (!response.ok || !payload?.message) {
          if (response.status === 429) {
            setRateLimitedUntil(Date.now() + Number(payload?.retryAfter ?? 10) * 1000);
          }
          throw new Error(payload?.error || "Message could not be sent.");
        }
        const confirmed = { ...payload.message, pending: false, failed: false };
        pagination.replaceByClientId(clientId, confirmed);
        await broadcast({
          type: "message.created",
          message: confirmed,
          actorId: currentUser.id,
          sentAt: new Date().toISOString(),
        });
        void markRead(confirmed.id);
        return confirmed;
      } catch {
        pagination.markFailed(clientId);
        return null;
      }
    },
    [broadcast, currentUser, markRead, pagination, rateLimitedUntil, roomId, roomKind, updateTyping],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const response = await fetch(`/api/community-chat/messages/${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: ChatMessage; error?: string } | null;
      if (!response.ok || !payload?.message) throw new Error(payload?.error || "Message could not be edited.");
      pagination.merge(payload.message);
      await broadcast({
        type: "message.updated",
        message: payload.message,
        actorId: currentUser.id,
        sentAt: new Date().toISOString(),
      });
      return payload.message;
    },
    [broadcast, currentUser.id, pagination],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const response = await fetch(`/api/community-chat/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as { message?: ChatMessage; error?: string } | null;
      if (!response.ok || !payload?.message) throw new Error(payload?.error || "Message could not be deleted.");
      pagination.merge(payload.message);
      await broadcast({
        type: "message.deleted",
        message: payload.message,
        actorId: currentUser.id,
        sentAt: new Date().toISOString(),
      });
    },
    [broadcast, currentUser.id, pagination],
  );

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      const response = await fetch("/api/community-chat/reactions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: ChatMessage; error?: string } | null;
      if (!response.ok || !payload?.message) throw new Error(payload?.error || "Reaction could not be updated.");
      pagination.merge(payload.message);
      await broadcast({
        type: "reaction.changed",
        message: payload.message,
        actorId: currentUser.id,
        sentAt: new Date().toISOString(),
      });
    },
    [broadcast, currentUser.id, pagination],
  );

  const onlineUsers = useMemo(() => presence, [presence]);
  const typingUsers = useMemo(
    () => presence.filter((user) => user.typing && user.userId !== currentUser.id),
    [currentUser.id, presence],
  );

  return {
    ...pagination,
    connection,
    onlineUsers,
    typingUsers,
    rateLimitedUntil,
    setTyping: updateTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    react,
    markRead,
  };
}
