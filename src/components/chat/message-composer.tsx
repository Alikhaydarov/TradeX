"use client";

import { CornerUpLeft, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatReplyPreview } from "@/features/community-chat/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MessageComposer({
  roomLabel,
  reply,
  rateLimitedUntil,
  disabled = false,
  onReplyClear,
  onTyping,
  onSend,
}: {
  roomLabel: string;
  reply: ChatReplyPreview | null;
  rateLimitedUntil: number;
  disabled?: boolean;
  onReplyClear: () => void;
  onTyping: (typing: boolean) => void;
  onSend: (content: string, reply: ChatReplyPreview | null) => Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (rateLimitedUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (reply) textareaRef.current?.focus();
  }, [reply]);

  const remaining = useMemo(
    () => Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000)),
    [now, rateLimitedUntil],
  );
  const blocked = disabled || sending || remaining > 0;

  const submit = async () => {
    const content = value.trim();
    if (!content || blocked) return;
    setSending(true);
    try {
      const result = await onSend(content, reply);
      if (result) {
        setValue("");
        onReplyClear();
        onTyping(false);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="border-t border-white/8 bg-[#050505] px-2.5 py-2 sm:px-3">
      {reply ? (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-white/8 bg-[#090909] px-2.5 py-1.5">
          <CornerUpLeft size={12} className="shrink-0 text-zinc-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold text-zinc-500">Replying to {reply.senderName}</p>
            <p className="truncate text-[10px] text-zinc-700">{reply.content}</p>
          </div>
          <button
            type="button"
            onClick={onReplyClear}
            className="grid size-6 shrink-0 place-items-center rounded-md text-zinc-600 hover:bg-white/[.05] hover:text-white"
            aria-label="Cancel reply"
          >
            <X size={12} />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#090909] p-1.5 focus-within:border-white/18">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value.slice(0, 4000));
            onTyping(Boolean(event.target.value.trim()));
          }}
          onBlur={() => onTyping(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          disabled={disabled}
          placeholder={remaining ? `Slow down — ${remaining}s` : `Message ${roomLabel}`}
          className="max-h-36 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-xs leading-5 shadow-none focus-visible:ring-0"
          rows={1}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void submit()}
          disabled={blocked || !value.trim()}
          className="size-9 shrink-0 rounded-lg bg-white text-black hover:bg-zinc-200"
          aria-label="Send message"
        >
          <Send size={15} />
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between px-1 text-[8px] text-zinc-700">
        <span>Enter to send · Shift+Enter for newline</span>
        <span>{value.length}/4000</span>
      </div>
    </div>
  );
}
