"use client";

import {
  Bookmark,
  Eye,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { XSpinner } from "@/components/app-loader";
import { InstrumentBadge } from "@/components/instrument-badge";
import { MediaImage } from "@/components/media-image";
import { TraderAvatar } from "@/components/trader-avatar";
import type { Post, PostReply } from "@/components/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatCount, formatRelativeTime } from "@/lib/social-format";

export function PostCard({
  post,
  currentUserId,
  isAdmin,
  acting,
  repliesOpen,
  replies,
  replyDraft,
  repliesLoading,
  replySaving,
  observe,
  onLike,
  onBookmark,
  onRepost,
  onToggleReplies,
  onReplyDraft,
  onReply,
  onShare,
  onEdit,
  onDelete,
}: {
  post: Post;
  currentUserId?: string;
  isAdmin: boolean;
  acting: boolean;
  repliesOpen: boolean;
  replies: PostReply[];
  replyDraft: string;
  repliesLoading: boolean;
  replySaving: boolean;
  observe: (node: HTMLElement | null) => void;
  onLike: () => void;
  onBookmark: () => void;
  onRepost: () => void;
  onToggleReplies: () => void;
  onReplyDraft: (value: string) => void;
  onReply: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const canManage = post.userId === currentUserId || isAdmin;
  const openProfile = () => {
    const username = post.handle.replace(/^@/, "").toLowerCase();
    router.push(`/${encodeURIComponent(username)}`);
  };

  return (
    <>
      <article
        id={`post-${post.id}`}
        ref={observe}
        className="rounded-[1.25rem] border border-white/8 bg-[#17181b] px-3 py-4 transition-colors hover:bg-[#191a1e] sm:px-5 sm:py-5"
      >
        <div className="flex gap-3.5">
          <button
            type="button"
            onClick={openProfile}
            className="size-11 shrink-0 rounded-full sm:size-12"
            aria-label={`Open ${post.name} profile`}
          >
            <TraderAvatar
              name={post.name}
              value={post.avatar}
              className="size-11 rounded-full text-xs ring-1 ring-white/10 sm:size-12"
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={openProfile}
                  className="flex max-w-full items-center gap-1 truncate text-left text-[15px] font-black tracking-tight hover:underline"
                >
                  {post.name}
                  {post.isVerified ? <VerifiedBadge size={16} /> : null}
                </button>
                <p className="truncate text-[11px] text-slate-500">
                  {post.handle} · {post.time}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-600 transition hover:bg-white/6 hover:text-zinc-200"
                    aria-label="Post options"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={onShare}>
                    <Link2 /> Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onBookmark}>
                    <Bookmark /> {post.bookmarked ? "Remove bookmark" : "Bookmark"}
                  </DropdownMenuItem>
                  {canManage ? <DropdownMenuSeparator /> : null}
                  {post.userId === currentUserId ? (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil /> Edit post
                    </DropdownMenuItem>
                  ) : null}
                  {canManage ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={onDelete}
                      disabled={acting}
                    >
                      {acting ? <XSpinner size="sm" /> : <Trash2 />}
                      Delete post
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {post.symbol ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[1rem] border border-white/8 bg-black/14 px-3 py-2.5">
                <InstrumentBadge
                  symbol={post.symbol}
                  compact
                  className="mr-auto rounded-xl bg-white/[.03]"
                />
                <span
                  className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
                    post.side === "LONG"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-rose-400/10 text-rose-300"
                  }`}
                >
                  {post.side}
                </span>
                <span
                  className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
                    post.result === "WIN"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : post.result === "LOSS"
                        ? "bg-rose-400/10 text-rose-300"
                        : "bg-white/8 text-zinc-300"
                  }`}
                >
                  {post.result}
                </span>
                {typeof post.pnl === "number" ? (
                  <strong
                    className={`font-mono text-sm ${
                      post.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}
                  </strong>
                ) : null}
                {typeof post.resultR === "number" ? (
                  <span className="font-mono text-xs font-semibold text-zinc-300">
                    {post.resultR >= 0 ? "+" : ""}
                    {post.resultR.toFixed(2)}R
                  </span>
                ) : null}
              </div>
            ) : null}

            {post.text && post.text !== `${post.symbol} trade` ? (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-slate-100">
                {post.text}
              </p>
            ) : null}

            <PostMedia post={post} onOpen={setLightboxUrl} />

            <div className="mt-3 grid grid-cols-5 rounded-xl border border-white/8 bg-black/10 p-0.5 text-zinc-500">
              <ActionButton
                active={repliesOpen}
                label="Replies"
                icon={<MessageCircle className="size-4" />}
                count={post.replies}
                onClick={onToggleReplies}
              />
              <ActionButton
                active={Boolean(post.reposted)}
                label="Repost"
                icon={<Repeat2 className="size-4" />}
                count={post.reposts}
                activeClass="text-emerald-300 bg-emerald-400/8"
                onClick={onRepost}
              />
              <ActionButton
                active={Boolean(post.liked)}
                label="Like"
                icon={
                  <Heart
                    className="size-4"
                    fill={post.liked ? "currentColor" : "none"}
                  />
                }
                count={post.likes}
                activeClass="text-rose-300 bg-rose-400/8"
                onClick={onLike}
              />
              <span
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px]"
                aria-label={`${post.views} views`}
              >
                <Eye className="size-4" /> {formatCount(post.views)}
              </span>
              <button
                type="button"
                onClick={onShare}
                className="grid h-9 place-items-center rounded-lg transition hover:bg-white/6 hover:text-zinc-200"
                aria-label="Share"
              >
                <Share2 className="size-4" />
              </button>
            </div>

            {repliesOpen ? (
              <RepliesPanel
                replies={replies}
                draft={replyDraft}
                loading={repliesLoading}
                saving={replySaving}
                onDraft={onReplyDraft}
                onReply={onReply}
              />
            ) : null}
          </div>
        </div>
      </article>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/92 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close image"
          >
            <X className="size-4" />
          </button>
          <MediaImage
            src={lightboxUrl}
            alt="Full size trade media"
            className="max-h-[92dvh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

function PostMedia({
  post,
  onOpen,
}: {
  post: Post;
  onOpen: (url: string) => void;
}) {
  const urls = post.imageUrls?.length
    ? post.imageUrls.slice(0, 4)
    : post.imageUrl
      ? [post.imageUrl]
      : [];
  if (!urls.length) return null;

  return (
    <div
      className={`mt-3 overflow-hidden rounded-xl border border-white/10 ${
        urls.length === 1
          ? ""
          : urls.length === 2 || urls.length === 4
            ? "grid grid-cols-2 gap-px bg-white/10"
            : "grid grid-cols-3 gap-px bg-white/10"
      }`}
    >
      {urls.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          onClick={() => onOpen(url)}
          className={`group relative w-full overflow-hidden bg-black/90 ${
            urls.length === 1 ? "aspect-video" : "aspect-square"
          }`}
        >
          <MediaImage
            src={url}
            alt={`${post.symbol || "Trade"} media ${index + 1}`}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  active,
  label,
  icon,
  count,
  activeClass = "bg-white/6 text-zinc-100",
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  count: number;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11px] transition hover:bg-white/6 hover:text-zinc-200 ${
        active ? activeClass : ""
      }`}
      aria-label={label}
    >
      {icon} {count}
    </button>
  );
}

function RepliesPanel({
  replies,
  draft,
  loading,
  saving,
  onDraft,
  onReply,
}: {
  replies: PostReply[];
  draft: string;
  loading: boolean;
  saving: boolean;
  onDraft: (value: string) => void;
  onReply: () => void;
}) {
  return (
    <div className="mt-4 border-t border-white/8 pt-4">
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
          <XSpinner size="sm" /> Loading replies
        </div>
      ) : replies.length ? (
        <div className="space-y-2.5">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="flex gap-2.5 rounded-xl border border-white/8 bg-black/40 p-3"
            >
              <TraderAvatar
                name={reply.name}
                value={reply.avatar}
                className="size-8 shrink-0 text-[10px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong className="truncate text-xs">{reply.name}</strong>
                  {reply.isVerified ? <VerifiedBadge size={14} /> : null}
                  <span className="text-[10px] text-zinc-600">
                    @{reply.username} · {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-5 text-zinc-300">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-xs text-zinc-600">No replies yet.</p>
      )}

      <div className="mt-3 flex items-end gap-2 rounded-xl border border-white/8 bg-black/40 p-2 focus-within:border-white/20">
        <Textarea
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          maxLength={280}
          placeholder="Write a reply..."
          className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          onClick={onReply}
          disabled={!draft.trim() || saving}
          size="icon-sm"
          className="size-9 shrink-0 bg-white text-black hover:bg-zinc-200"
          aria-label="Send reply"
        >
          {saving ? <XSpinner size="sm" /> : <Send className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
