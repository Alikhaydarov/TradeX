"use client";

import { Check, CornerUpLeft, Pencil, SmilePlus, Trash2, X } from "lucide-react";
import { memo, useState } from "react";
import type { ChatMessage, ChatReplyPreview } from "@/features/community-chat/types";
import { TraderAvatar } from "@/components/trader-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const QUICK_REACTIONS = ["👍", "🔥", "💯"];

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function MessageBubbleImpl({
  message,
  currentUserId,
  canModerate,
  compact = false,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  message: ChatMessage;
  currentUserId: string;
  canModerate: boolean;
  compact?: boolean;
  onReply: (reply: ChatReplyPreview) => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [busy, setBusy] = useState(false);
  const mine = message.senderId === currentUserId;
  const canDelete = mine || canModerate;

  const save = async () => {
    const next = draft.trim();
    if (!next || next === message.content || busy) {
      setEditing(false);
      setDraft(message.content);
      return;
    }
    setBusy(true);
    try {
      await onEdit(message.id, next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy || !window.confirm("Delete this message?")) return;
    setBusy(true);
    try {
      await onDelete(message.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={`group relative flex gap-3 px-3 transition hover:bg-[#1d1f23] sm:px-4 ${
        compact ? "py-0.5" : "mt-2 py-1.5"
      } ${message.failed ? "bg-rose-400/[.025]" : ""}`}
    >
      <div className="w-10 shrink-0 pt-0.5">
        {!compact ? (
          <TraderAvatar
            name={message.sender.fullName}
            value={message.sender.avatarUrl}
            className="size-10 rounded-full border border-white/[.07] text-[10px]"
          />
        ) : (
          <span className="block pt-1 text-center text-[8px] text-transparent transition group-hover:text-zinc-600">
            {timeLabel(message.createdAt)}
          </span>
        )}
      </div>

      <div className={`min-w-0 flex-1 ${message.pending ? "opacity-80" : ""}`}>
        {!compact ? (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[13px] font-bold text-zinc-100">
              {message.sender.fullName}
            </span>
            {message.sender.isVerified ? <VerifiedBadge size={12} /> : null}
            <span className="text-[9px] text-zinc-600">{timeLabel(message.createdAt)}</span>
            {message.editedAt ? <span className="text-[9px] text-zinc-600">(edited)</span> : null}
            {message.pending ? <span className="text-[9px] text-zinc-500">sending…</span> : null}
            {message.failed ? <span className="text-[9px] font-semibold text-rose-400">failed to send</span> : null}
          </div>
        ) : null}

        {message.reply ? (
          <button
            type="button"
            className="mt-1 flex max-w-full items-center gap-1.5 border-l-2 border-l-zinc-500 pl-2 text-left"
          >
            <CornerUpLeft size={11} className="shrink-0 text-zinc-500" />
            <span className="shrink-0 text-[10px] font-semibold text-zinc-400">{message.reply.senderName}</span>
            <span className="truncate text-[10px] text-zinc-600">{message.reply.content}</span>
          </button>
        ) : null}

        {editing ? (
          <div className="mt-2 space-y-1.5">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void save();
                }
                if (event.key === "Escape") {
                  setEditing(false);
                  setDraft(message.content);
                }
              }}
              autoFocus
              className="min-h-16 resize-none rounded-md border-white/[.08] bg-[#272a2f] text-[13px] leading-5"
            />
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
              Esc to cancel · Enter to save
              <Button type="button" size="sm" onClick={() => void save()} disabled={busy} className="ml-auto h-7 px-2 text-[10px]">
                <Check size={12} /> Save
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
                <X size={12} />
              </Button>
            </div>
          </div>
        ) : message.deletedAt ? (
          <p className="mt-0.5 text-[13px] italic text-zinc-600">Message deleted</p>
        ) : (
          <p className="mt-0.5 max-w-[860px] whitespace-pre-wrap break-words text-[14px] leading-[1.45] text-zinc-300">
            {message.content}
          </p>
        )}

        {message.reactions.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => void onReact(message.id, reaction.emoji)}
                className={`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] transition ${
                  reaction.reactedByMe
                    ? "border-indigo-400/35 bg-indigo-400/[.12] text-indigo-200"
                    : "border-white/[.07] bg-[#202226] text-zinc-400 hover:border-white/[.12] hover:text-zinc-100"
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-semibold">{reaction.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!message.deletedAt && !message.pending ? (
        <div className="absolute -top-3 right-3 hidden items-center overflow-hidden rounded-md border border-white/[.08] bg-[#24262b] shadow-xl group-hover:flex">
          <button
            type="button"
            onClick={() => onReply({
              id: message.id,
              content: message.content,
              senderName: message.sender.fullName,
              deleted: false,
            })}
            className="grid size-8 place-items-center text-zinc-400 hover:bg-white/[.06] hover:text-white"
            aria-label="Reply"
          >
            <CornerUpLeft size={13} />
          </button>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => void onReact(message.id, emoji)}
              className="grid size-8 place-items-center text-[12px] hover:bg-white/[.06]"
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <span className="grid size-8 place-items-center text-zinc-500"><SmilePlus size={13} /></span>
          {mine ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="grid size-8 place-items-center text-zinc-400 hover:bg-white/[.06] hover:text-white"
              aria-label="Edit"
            >
              <Pencil size={13} />
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="grid size-8 place-items-center text-zinc-400 hover:bg-rose-400/10 hover:text-rose-300"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Memoized because the chat list re-renders on every presence tick, typing
 * event and incoming message. Without this, a room with a few hundred messages
 * re-rendered every bubble several times a second. This is only effective
 * while callers keep the callback props stable - see chat-page.tsx.
 */
export const MessageBubble = memo(MessageBubbleImpl);
