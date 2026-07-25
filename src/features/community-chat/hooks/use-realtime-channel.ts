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
  const {
    merge,
    replaceByClientId,
    markFailed,
    removeByClientId,
    reload,
  } = pagination;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const typingStateRef = useRef(false);
  const readTimerRef = useRef<number | null>(null);
  const lastReadMessageRef = useRef<string | null>(null);
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline">("connecting");
  const [presence, setPresence] = useState<ChatPresenceMeta[]>([]);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

  const broadcast = useCallback(async (event: RealtimeChatEvent) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: "broadcast", event: "chat-event", payload: event });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setConnection("offline");
      return;
    }

    let alive = true;
    let room: RealtimeChannel | null = null;
    let subscribedBefore = false;
    setConnection("connecting");
    typingStateRef.current = false;

    const connect = async () => {
      await supabase.realtime.setAuth();
      if (!alive) return;

      room = supabase.channel(roomName(roomKind, roomId), {
        config: {
          private: true,
          broadcast: { self: false, ack: false },
          presence: { key: currentUser.id },
        },
      });
      channelRef.current = room;

      room
        .on("broadcast", { event: "chat-event" }, ({ payload }) => {
          const event = payload as RealtimeChatEvent;
          if (event.type === "message.rejected" && event.clientId) {
            removeByClientId(event.clientId);
            return;
          }
          if (event.message) merge(event.message);
        })
        .on("presence", { event: "sync" }, () => {
          if (!room) return;
          const state = room.presenceState<ChatPresenceMeta>();
          const users: ChatPresenceMeta[] = Object.values(state)
            .flat()
            .filter((item) => Boolean(item.userId))
            .map((item) => ({
              userId: item.userId,
              username: item.username,
              fullName: item.fullName,
              avatarUrl: item.avatarUrl,
              onlineAt: item.onlineAt,
              typing: item.typing,
            }));
          const unique = new Map(users.map((user) => [user.userId, user]));
          setPresence([...unique.values()]);
        })
        .subscribe(async (status) => {
          if (!room) return;
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
            if (subscribedBefore) void reload();
            subscribedBefore = true;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnection("offline");
          }
        });
    };

    void connect().catch(() => {
      if (alive) setConnection("offline");
    });

    return () => {
      alive = false;
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
      if (room) {
        void room.untrack();
        void supabase.removeChannel(room);
      }
      channelRef.current = null;
      typingStateRef.current = false;
      setPresence([]);
    };
  }, [currentUser, merge, reload, removeByClientId, roomId, roomKind]);

  const updateTyping = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current;
      if (!channel) return;

      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (typing !== typingStateRef.current) {
        typingStateRef.current = typing;
        void channel.track({
          userId: currentUser.id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl,
          onlineAt: new Date().toISOString(),
          typing,
        } satisfies ChatPresenceMeta);
      }

      if (typing) {
        typingTimerRef.current = window.setTimeout(() => updateTyping(false), 1100);
      }
    },
    [currentUser],
  );

  useEffect(() => {
    lastReadMessageRef.current = null;
  }, [roomId, roomKind]);

  const markRead = useCallback(
    async (lastReadMessageId: string | null) => {
      if (lastReadMessageRef.current === lastReadMessageId) return;
      lastReadMessageRef.current = lastReadMessageId;
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
      readTimerRef.current = window.setTimeout(() => {
        void fetch("/api/community-chat/read", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: roomKind === "channel" ? roomId : null,
            dmThreadId: roomKind === "dm" ? roomId : null,
            lastReadMessageId,
          }),
        }).catch(() => undefined);
      }, 160);
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
        failed: false,
      };

      merge(optimistic);
      updateTyping(false);
      void broadcast({
        type: "message.optimistic",
        message: optimistic,
        clientId,
        actorId: currentUser.id,
        sentAt: optimistic.createdAt,
      }).catch(() => undefined);

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
        replaceByClientId(clientId, confirmed);
        void broadcast({
          type: "message.created",
          message: confirmed,
          clientId,
          actorId: currentUser.id,
          sentAt: new Date().toISOString(),
        }).catch(() => undefined);
        void markRead(confirmed.id);
        return confirmed;
      } catch {
        markFailed(clientId);
        void broadcast({
          type: "message.rejected",
          clientId,
          actorId: currentUser.id,
          sentAt: new Date().toISOString(),
        }).catch(() => undefined);
        return null;
      }
    },
    [broadcast, currentUser, markFailed, markRead, merge, rateLimitedUntil, replaceByClientId, roomId, roomKind, updateTyping],
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
      merge(payload.message);
      void broadcast({
        type: "message.updated",
        message: payload.message,
        actorId: currentUser.id,
        sentAt: new Date().toISOString(),
      }).catch(() => undefined);
      return payload.message;
    },
    [broadcast, currentUser.id, merge],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const response = await fetch(`/api/community-chat/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as { message?: ChatMessage; error?: string } | null;
      if (!response.ok || !payload?.message) throw new Error(payload?.error || "Message could not be deleted.");
      merge(payload.message);
      void broadcast({
        type: "message.deleted",
        message: payload.message,
        actorId: currentUser.id,
        sentAt: new Date().toISOString(),
      }).catch(() => undefined);
    },
    [broadcast, currentUser.id, merge],
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
      merge(payload.message);
      void broadcast({
        type: "reaction.changed",
        message: payload.message,
        actorId: currentUser.id,
        sentAt: new Date().toISOString(),
      }).catch(() => undefined);
    },
    [broadcast, currentUser.id, merge],
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
