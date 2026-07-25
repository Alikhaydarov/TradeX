"use client";

import { Check, CornerUpLeft, MoreHorizontal, Pencil, SmilePlus, Trash2, X } from "lucide-react";
import { useState } from "react";
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

export function MessageBubble({
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
      className={`group relative flex gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white/[.025] sm:px-3 ${compact ? "pt-0.5" : "mt-1.5"}`}
    >
      <div className="w-8 shrink-0 pt-0.5">
        {!compact ? (
          <TraderAvatar
            name={message.sender.fullName}
            value={message.sender.avatarUrl}
            className="size-8 rounded-lg text-[10px]"
          />
        ) : (
          <span className="block pt-1 text-center text-[9px] text-transparent transition group-hover:text-zinc-700">
            {timeLabel(message.createdAt)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!compact ? (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[12px] font-bold text-zinc-100">
              {message.sender.fullName}
            </span>
            {message.sender.isVerified ? <VerifiedBadge size={12} /> : null}
            <span className="text-[9px] text-zinc-700">{timeLabel(message.createdAt)}</span>
            {message.editedAt ? <span className="text-[9px] text-zinc-700">edited</span> : null}
            {message.pending ? <span className="text-[9px] text-zinc-600">sending…</span> : null}
            {message.failed ? <span className="text-[9px] text-rose-400">failed</span> : null}
          </div>
        ) : null}

        {message.reply ? (
          <button
            type="button"
            className="mt-1 flex max-w-full items-center gap-1.5 rounded-md border-l-2 border-zinc-700 bg-white/[.025] px-2 py-1 text-left"
          >
            <CornerUpLeft size={11} className="shrink-0 text-zinc-600" />
            <span className="shrink-0 text-[9px] font-semibold text-zinc-500">{message.reply.senderName}</span>
            <span className="truncate text-[9px] text-zinc-700">{message.reply.content}</span>
          </button>
        ) : null}

        {editing ? (
          <div className="mt-1.5 space-y-1.5">
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
              className="min-h-16 resize-none border-white/10 bg-[#090909] text-xs leading-5"
            />
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-700">
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
          <p className="mt-0.5 text-[11px] italic text-zinc-700">Message deleted</p>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-[1.55] text-zinc-300">
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
                className={`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] transition ${reaction.reactedByMe ? "border-white/20 bg-white/[.08] text-white" : "border-white/8 bg-[#080808] text-zinc-500 hover:text-zinc-200"}`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-semibold">{reaction.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!message.deletedAt ? (
        <div className="absolute right-2 top-0.5 hidden items-center overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0b] shadow-xl group-hover:flex">
          <button
            type="button"
            onClick={() => onReply({
              id: message.id,
              content: message.content,
              senderName: message.sender.fullName,
              deleted: false,
            })}
            className="grid size-7 place-items-center text-zinc-600 hover:bg-white/[.05] hover:text-white"
            aria-label="Reply"
          >
            <CornerUpLeft size={12} />
          </button>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => void onReact(message.id, emoji)}
              className="grid size-7 place-items-center text-[11px] hover:bg-white/[.05]"
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <span className="grid size-7 place-items-center text-zinc-700"><SmilePlus size={12} /></span>
          {mine ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="grid size-7 place-items-center text-zinc-600 hover:bg-white/[.05] hover:text-white"
              aria-label="Edit"
            >
              <Pencil size={12} />
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="grid size-7 place-items-center text-zinc-600 hover:bg-rose-400/10 hover:text-rose-300"
              aria-label="Delete"
            >
              <Trash2 size={12} />
            </button>
          ) : (
            <span className="grid size-7 place-items-center text-zinc-700"><MoreHorizontal size={12} /></span>
          )}
        </div>
      ) : null}
    </article>
  );
}
