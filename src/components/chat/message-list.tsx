"use client";

import { ArrowDown, Hash, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ChatPresenceMeta, ChatReplyPreview } from "@/features/community-chat/types";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";

function dayKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

function dayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (value === today.toISOString().slice(0, 10)) return "Today";
  if (value === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function MessageList({
  messages,
  currentUserId,
  canModerate,
  loading,
  loadingOlder,
  hasOlder,
  typingUsers,
  onLoadOlder,
  onRead,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  canModerate: boolean;
  loading: boolean;
  loadingOlder: boolean;
  hasOlder: boolean;
  typingUsers: ChatPresenceMeta[];
  onLoadOlder: () => Promise<void>;
  onRead: (messageId: string | null) => Promise<void>;
  onReply: (reply: ChatReplyPreview) => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const lastMessageId = messages.at(-1)?.id ?? null;

  const grouped = useMemo(() => {
    const groups: Array<{ day: string; messages: ChatMessage[] }> = [];
    for (const message of messages) {
      const day = dayKey(message.createdAt);
      const group = groups.at(-1);
      if (!group || group.day !== day) groups.push({ day, messages: [message] });
      else group.messages.push(message);
    }
    return groups;
  }, [messages]);

  const scrollToLatest = (behavior: ScrollBehavior = "auto") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
  };

  useEffect(() => {
    if (loading || initialScrollDone || !messages.length) return;
    requestAnimationFrame(() => scrollToLatest("auto"));
    setInitialScrollDone(true);
  }, [initialScrollDone, loading, messages.length]);

  useEffect(() => {
    if (!lastMessageId) return;
    if (nearBottom) {
      requestAnimationFrame(() => scrollToLatest("auto"));
      void onRead(lastMessageId);
    }
  }, [lastMessageId, nearBottom, onRead]);

  const handleScroll = async () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const nextNearBottom = distanceFromBottom < 120;
    setNearBottom(nextNearBottom);
    if (nextNearBottom && lastMessageId) void onRead(lastMessageId);

    if (scroller.scrollTop < 80 && hasOlder && !loadingOlder) {
      const previousHeight = scroller.scrollHeight;
      await onLoadOlder();
      requestAnimationFrame(() => {
        if (!scrollerRef.current) return;
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight - previousHeight;
      });
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-[#15171a] text-zinc-500">
        <LoaderCircle size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-[#15171a]">
      <div
        ref={scrollerRef}
        onScroll={() => void handleScroll()}
        className="h-full overflow-y-auto overscroll-contain py-3 scrollbar-thin"
      >
        <div className="mx-auto w-full max-w-[1120px] pb-3">
          {loadingOlder ? (
            <div className="flex h-9 items-center justify-center text-zinc-600">
              <LoaderCircle size={14} className="animate-spin" />
            </div>
          ) : hasOlder ? (
            <div className="py-1.5 text-center text-[9px] text-zinc-600">Scroll up for older messages</div>
          ) : null}

          {!messages.length ? (
            <div className="flex min-h-[58vh] items-end px-5 pb-8 sm:px-8">
              <div className="max-w-md">
                <div className="grid size-14 place-items-center rounded-full bg-[#2b2d31] text-zinc-200">
                  <Hash size={27} strokeWidth={2.4} />
                </div>
                <h3 className="mt-4 text-xl font-extrabold tracking-[-0.03em] text-zinc-100">Welcome to the conversation</h3>
                <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                  This is the beginning of this channel. Messages, replies and reactions appear here instantly.
                </p>
              </div>
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.day}>
                <div className="my-4 flex items-center gap-3 px-4">
                  <span className="h-px flex-1 bg-white/[.055]" />
                  <span className="text-[10px] font-semibold text-zinc-500">{dayLabel(group.day)}</span>
                  <span className="h-px flex-1 bg-white/[.055]" />
                </div>
                <div>
                  {group.messages.map((message, index) => {
                    const previous = group.messages[index - 1];
                    const compact = Boolean(
                      previous &&
                        previous.senderId === message.senderId &&
                        new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000,
                    );
                    return (
                      <MessageBubble
                        key={message.clientId || message.id}
                        message={message}
                        currentUserId={currentUserId}
                        canModerate={canModerate}
                        compact={compact}
                        onReply={onReply}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReact={onReact}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
          <TypingIndicator users={typingUsers} />
        </div>
      </div>

      {!nearBottom && messages.length ? (
        <Button
          type="button"
          size="sm"
          onClick={() => scrollToLatest("smooth")}
          className="absolute bottom-4 left-1/2 h-8 -translate-x-1/2 rounded-full bg-white px-3 text-[10px] font-bold text-black shadow-xl hover:bg-zinc-200"
        >
          <ArrowDown size={13} /> Jump to latest
        </Button>
      ) : null}
    </div>
  );
}
