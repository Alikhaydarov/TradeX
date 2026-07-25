"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, ChatMessagesPage, ChatRoomKind } from "../types";

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...current, ...incoming]) {
    const key = message.clientId ? `client:${message.clientId}` : `id:${message.id}`;
    const existing = byId.get(key);
    byId.set(key, existing ? { ...existing, ...message, pending: message.pending ?? existing.pending } : message);
  }
  return [...byId.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
      left.id.localeCompare(right.id),
  );
}

export function useMessagesPagination({
  roomKind,
  roomId,
}: {
  roomKind: ChatRoomKind;
  roomId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");

  const queryString = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set(roomKind === "channel" ? "channelId" : "dmThreadId", roomId);
      if (cursor) params.set("cursor", cursor);
      return params.toString();
    },
    [roomId, roomKind],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/community-chat/messages?${queryString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as
        | (ChatMessagesPage & { error?: string })
        | null;
      if (!response.ok || !payload) throw new Error(payload?.error || "Messages could not be loaded.");
      setMessages(payload.messages);
      setNextCursor(payload.nextCursor);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    void loadInitial();
  }, [loadInitial]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const response = await fetch(
        `/api/community-chat/messages?${queryString(nextCursor)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const payload = (await response.json().catch(() => null)) as
        | (ChatMessagesPage & { error?: string })
        | null;
      if (!response.ok || !payload) throw new Error(payload?.error || "Older messages could not be loaded.");
      setMessages((current) => mergeMessages(payload.messages, current));
      setNextCursor(payload.nextCursor);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Older messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, nextCursor, queryString]);

  const merge = useCallback((incoming: ChatMessage | ChatMessage[]) => {
    const next = Array.isArray(incoming) ? incoming : [incoming];
    setMessages((current) => mergeMessages(current, next));
  }, []);

  const replaceByClientId = useCallback((clientId: string, confirmed: ChatMessage) => {
    setMessages((current) => {
      const withoutOptimistic = current.filter((message) => message.clientId !== clientId);
      return mergeMessages(withoutOptimistic, [confirmed]);
    });
  }, []);

  const markFailed = useCallback((clientId: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.clientId === clientId ? { ...message, pending: false, failed: true } : message,
      ),
    );
  }, []);

  const remove = useCallback((messageId: string) => {
    setMessages((current) => current.filter((message) => message.id !== messageId));
  }, []);

  return {
    messages,
    setMessages,
    loading,
    loadingOlder,
    error,
    hasOlder: Boolean(nextCursor),
    loadOlder,
    reload: loadInitial,
    merge,
    replaceByClientId,
    markFailed,
    remove,
  };
}
