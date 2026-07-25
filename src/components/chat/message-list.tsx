"use client";

import { ArrowDown, LoaderCircle } from "lucide-react";
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
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

  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => {
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
      requestAnimationFrame(() => scrollToLatest("smooth"));
      void onRead(lastMessageId);
    }
  }, [lastMessageId, nearBottom, onRead]);

  const handleScroll = async () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const nextNearBottom = distanceFromBottom < 100;
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
      <div className="grid min-h-0 flex-1 place-items-center bg-[#030303] text-zinc-600">
        <LoaderCircle size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 bg-[#030303]">
      <div
        ref={scrollerRef}
        onScroll={() => void handleScroll()}
        className="h-full overflow-y-auto overscroll-contain px-1 py-2 scrollbar-thin"
      >
        {loadingOlder ? (
          <div className="flex h-8 items-center justify-center text-zinc-700">
            <LoaderCircle size={14} className="animate-spin" />
          </div>
        ) : hasOlder ? (
          <div className="py-1 text-center text-[9px] text-zinc-800">Scroll up for older messages</div>
        ) : null}

        {!messages.length ? (
          <div className="grid min-h-[55vh] place-items-center px-5 text-center">
            <div>
              <div className="mx-auto grid size-10 place-items-center rounded-xl border border-white/8 bg-[#090909] text-lg">#</div>
              <h3 className="mt-3 text-sm font-bold text-zinc-200">Start the conversation</h3>
              <p className="mt-1 max-w-xs text-[11px] leading-5 text-zinc-600">Messages, replies and reactions will appear here in real time.</p>
            </div>
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.day}>
              <div className="sticky top-1 z-10 my-2 flex items-center gap-2 px-3">
                <span className="h-px flex-1 bg-white/[.055]" />
                <span className="rounded-full border border-white/8 bg-[#080808]/95 px-2 py-0.5 text-[8px] font-semibold text-zinc-600 backdrop-blur">
                  {dayLabel(group.day)}
                </span>
                <span className="h-px flex-1 bg-white/[.055]" />
              </div>
              {group.messages.map((message, index) => {
                const previous = group.messages[index - 1];
                const compact = Boolean(
                  previous &&
                    previous.senderId === message.senderId &&
                    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000,
                );
                return (
                  <MessageBubble
                    key={message.id}
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
            </section>
          ))
        )}
        <TypingIndicator users={typingUsers} />
      </div>

      {!nearBottom && messages.length ? (
        <Button
          type="button"
          size="sm"
          onClick={() => scrollToLatest()}
          className="absolute bottom-3 left-1/2 h-8 -translate-x-1/2 rounded-full bg-white px-3 text-[10px] font-bold text-black shadow-xl hover:bg-zinc-200"
        >
          <ArrowDown size={13} /> Jump to latest
        </Button>
      ) : null}
    </div>
  );
}
