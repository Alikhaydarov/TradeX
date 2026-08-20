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
  const [now, setNow] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (rateLimitedUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (reply) textareaRef.current?.focus();
  }, [reply]);

  const remaining = useMemo(
    () =>
      Math.max(
        0,
        Math.ceil((rateLimitedUntil - (now ?? rateLimitedUntil)) / 1000),
      ),
    [now, rateLimitedUntil],
  );
  const blocked = disabled || remaining > 0;

  const submit = () => {
    const content = value.trim();
    if (!content || blocked) return;
    const activeReply = reply;
    setValue("");
    onReplyClear();
    onTyping(false);
    void onSend(content, activeReply).finally(() =>
      textareaRef.current?.focus(),
    );
  };

  return (
    <div className="shrink-0 border-t border-xborder bg-xcanvas px-3 pb-3 pt-2 sm:px-4">
      <div className="mx-auto w-full max-w-[1120px]">
        {reply ? (
          <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-xborder bg-xpanel px-3 py-2">
            <CornerUpLeft size={13} className="shrink-0 text-xmuted" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-xmuted-strong">
                Replying to {reply.senderName}
              </p>
              <p className="truncate text-[10px] text-xmuted">
                {reply.content}
              </p>
            </div>
            <button
              type="button"
              onClick={onReplyClear}
              className="grid size-6 shrink-0 place-items-center rounded-md text-xmuted transition hover:bg-xraised hover:text-white"
              aria-label="Cancel reply"
            >
              <X size={13} />
            </button>
          </div>
        ) : null}

        <div
          className={`flex items-end gap-2 border border-xborder bg-xpanel px-2.5 py-1.5 transition focus-within:border-xborder-strong focus-within:bg-xraised ${
            reply ? "rounded-b-xl" : "rounded-xl"
          }`}
        >
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              const next = event.target.value.slice(0, 4000);
              setValue(next);
              onTyping(Boolean(next.trim()));
            }}
            onBlur={() => onTyping(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            placeholder={
              remaining ? `Slow down — ${remaining}s` : `Message ${roomLabel}`
            }
            className="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent px-1.5 py-2.5 text-[14px] leading-5 text-zinc-100 shadow-none placeholder:text-xmuted focus-visible:ring-0"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={blocked || !value.trim()}
            className="mb-0.5 size-9 shrink-0 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:bg-xraised disabled:text-xmuted"
            aria-label="Send message"
          >
            <Send size={15} />
          </Button>
        </div>
        <div className="mt-1 flex items-center justify-between px-1 text-[8px] text-xmuted">
          <span>Enter to send · Shift+Enter for a new line</span>
          <span>{value.length}/4000</span>
        </div>
      </div>
    </div>
  );
}
