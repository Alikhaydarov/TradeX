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
} from "lucide-react";
import { memo } from "react";

import {
  formatCount,
  formatRelativeTime,
} from "@/lib/social-format";
import { XSpinner } from "../app-loader";
import { InstrumentBadge } from "../instrument-badge";
import { MediaImage } from "../media-image";
import { TraderAvatar } from "../trader-avatar";
import type { Post, PostReply } from "../types";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Textarea } from "../ui/textarea";
import { VerifiedBadge } from "../verified-badge";

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

/**
 * Screenshots of charts are wide. The grid below keeps every arrangement inside
 * one landscape frame instead of the square `object-cover` boxes this used to
 * render, which cropped the top and bottom off almost every chart posted.
 */
function PostMedia({
  urls,
  symbol,
  onOpenMedia,
}: {
  urls: string[];
  symbol?: string;
  onOpenMedia: (url: string) => void;
}) {
  const shown = urls.slice(0, 4);
  const extra = urls.length - shown.length;

  const frame =
    shown.length === 1
      ? "aspect-[16/10]"
      : shown.length === 2
        ? "aspect-[16/9] grid-cols-2"
        : shown.length === 3
          ? "aspect-[16/10] grid-cols-2 grid-rows-2"
          : "aspect-[16/10] grid-cols-2 grid-rows-2";

  return (
    <div
      className={`mt-3 grid gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 ${frame}`}
    >
      {shown.map((url, index) => (
        <button
          key={url}
          type="button"
          onClick={() => onOpenMedia(url)}
          className={`group relative h-full w-full overflow-hidden bg-black ${FOCUS_RING} ${
            shown.length === 3 && index === 0 ? "row-span-2" : ""
          }`}
          aria-label={`Open image ${index + 1} of ${urls.length}`}
        >
          <MediaImage
            src={url}
            alt={
              symbol
                ? `${symbol} trade screenshot ${index + 1}`
                : `Trade screenshot ${index + 1}`
            }
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          {extra > 0 && index === shown.length - 1 ? (
            <span className="absolute inset-0 grid place-items-center bg-black/60 text-lg font-semibold text-white">
              +{extra}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  label,
  count,
  active,
  tone = "neutral",
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  tone?: "neutral" | "positive" | "negative";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? `hover:bg-emerald-400/10 hover:text-emerald-300 ${active ? "bg-emerald-400/10 text-emerald-300" : ""}`
      : tone === "negative"
        ? `hover:bg-rose-400/10 hover:text-rose-300 ${active ? "bg-rose-400/10 text-rose-300" : ""}`
        : `hover:bg-white/[.06] hover:text-zinc-100 ${active ? "bg-white/[.06] text-zinc-100" : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium tabular-nums transition-colors ${toneClass} ${FOCUS_RING}`}
    >
      {children}
      {count !== undefined ? formatCount(count) : null}
    </button>
  );
}

export function PostCard({
  post,
  userId,
  isAdmin,
  acting,
  openReplies,
  replies,
  replyDraft,
  loadingReplies,
  savingReply,
  observePost,
  onOpenProfile,
  onShare,
  onToggleBookmark,
  onEdit,
  onDelete,
  onOpenMedia,
  onToggleReplies,
  onToggleRepost,
  onToggleLike,
  onReplyDraftChange,
  onAddReply,
}: {
  post: Post;
  userId?: string | null;
  isAdmin: boolean;
  acting: boolean;
  openReplies: boolean;
  replies: PostReply[];
  replyDraft: string;
  loadingReplies: boolean;
  savingReply: boolean;
  observePost: (node: HTMLElement | null, postId: string) => void;
  onOpenProfile: (username: string) => void;
  onShare: (post: Post) => void;
  onToggleBookmark: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onOpenMedia: (url: string) => void;
  onToggleReplies: (post: Post) => void;
  onToggleRepost: (post: Post) => void;
  onToggleLike: (post: Post) => void;
  onReplyDraftChange: (postId: string, value: string) => void;
  onAddReply: (post: Post) => void;
}) {
  const ownsPost = post.userId === userId;
  const canManage = ownsPost || isAdmin;
  const images = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
      ? [post.imageUrl]
      : [];

  return (
    <article
      id={`post-${post.id}`}
      ref={(node) => observePost(node, post.id)}
      className="rounded-2xl border border-white/8 bg-[#0a0a0a] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition-colors hover:border-white/12 hover:bg-[#0e0e0e] sm:px-5 sm:py-5"
    >
      <div className="flex gap-3.5">
        <button
          type="button"
          onClick={() => onOpenProfile(post.handle)}
          className={`size-11 shrink-0 rounded-full sm:size-12 ${FOCUS_RING}`}
          aria-label={`Open ${post.name}'s profile`}
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
                onClick={() => onOpenProfile(post.handle)}
                className={`flex max-w-full items-center gap-1 truncate rounded text-left text-[15px] font-bold tracking-tight hover:underline ${FOCUS_RING}`}
              >
                {post.name}
                {post.isVerified ? <VerifiedBadge size={16} /> : null}
              </button>
              <p className="truncate text-[11px] text-zinc-500">
                {post.handle}
                <span className="px-1 text-zinc-700">·</span>
                {post.time}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`grid size-9 shrink-0 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-white/[.06] hover:text-zinc-200 ${FOCUS_RING}`}
                  aria-label="Post options"
                >
                  <MoreHorizontal size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => onShare(post)}
                  className="min-h-9 px-2.5"
                >
                  <Link2 /> Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleBookmark(post)}
                  className="min-h-9 px-2.5"
                >
                  <Bookmark />
                  {post.bookmarked ? "Remove bookmark" : "Bookmark"}
                </DropdownMenuItem>
                {canManage ? <DropdownMenuSeparator /> : null}
                {ownsPost ? (
                  <DropdownMenuItem
                    onClick={() => onEdit(post)}
                    className="min-h-9 px-2.5"
                  >
                    <Pencil /> Edit post
                  </DropdownMenuItem>
                ) : null}
                {canManage ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(post)}
                    disabled={acting}
                    className="min-h-9 px-2.5"
                  >
                    {acting ? <XSpinner size="sm" /> : <Trash2 />}
                    Delete post
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {post.symbol ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[.02] px-3 py-2.5">
              <InstrumentBadge
                symbol={post.symbol}
                compact
                className="mr-auto rounded-lg bg-white/[.03]"
              />
              <span
                className={`rounded-md px-2 py-1 text-[9px] font-bold tracking-wide ${
                  post.side === "LONG"
                    ? "bg-emerald-300/10 text-emerald-300"
                    : "bg-rose-300/10 text-rose-300"
                }`}
              >
                {post.side}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-[9px] font-bold tracking-wide ${
                  post.result === "WIN"
                    ? "bg-emerald-300/10 text-emerald-300"
                    : post.result === "LOSS"
                      ? "bg-rose-300/10 text-rose-300"
                      : "bg-white/8 text-zinc-300"
                }`}
              >
                {post.result}
              </span>
              {typeof post.pnl === "number" ? (
                <strong
                  className={`text-sm tabular-nums ${
                    post.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}
                </strong>
              ) : null}
              {typeof post.resultR === "number" ? (
                <span className="text-xs font-semibold tabular-nums text-zinc-300">
                  {post.resultR >= 0 ? "+" : ""}
                  {post.resultR.toFixed(2)}R
                </span>
              ) : null}
            </div>
          ) : null}

          {post.text && post.text !== `${post.symbol} trade` ? (
            <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-zinc-100">
              {post.text}
            </p>
          ) : null}

          {images.length ? (
            <PostMedia
              urls={images}
              symbol={post.symbol}
              onOpenMedia={onOpenMedia}
            />
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-1 text-zinc-500">
            <div className="flex items-center gap-0.5">
              <ActionButton
                label="Replies"
                count={post.replies}
                active={openReplies}
                onClick={() => onToggleReplies(post)}
              >
                <MessageCircle size={15} strokeWidth={1.75} />
              </ActionButton>
              <ActionButton
                label="Repost"
                count={post.reposts}
                active={post.reposted}
                tone="positive"
                onClick={() => onToggleRepost(post)}
              >
                <Repeat2 size={15} strokeWidth={1.75} />
              </ActionButton>
              <ActionButton
                label="Like"
                count={post.likes}
                active={post.liked}
                tone="negative"
                onClick={() => onToggleLike(post)}
              >
                <Heart
                  size={15}
                  strokeWidth={1.75}
                  fill={post.liked ? "currentColor" : "none"}
                />
              </ActionButton>
            </div>

            <div className="flex items-center gap-0.5">
              <span
                className="inline-flex h-9 items-center gap-1.5 px-2.5 text-[11px] tabular-nums"
                aria-label={`${post.views} views`}
              >
                <Eye size={15} strokeWidth={1.75} />
                {formatCount(post.views)}
              </span>
              <ActionButton label="Share" onClick={() => onShare(post)}>
                <Share2 size={15} strokeWidth={1.75} />
              </ActionButton>
            </div>
          </div>

          {openReplies ? (
            <div className="mt-4 border-t border-white/8 pt-4">
              {loadingReplies ? (
                <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                  <XSpinner size="sm" /> Loading replies
                </div>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex gap-2.5 rounded-xl border border-white/8 bg-white/[.02] p-3"
                    >
                      <TraderAvatar
                        name={reply.name}
                        value={reply.avatar}
                        className="size-8 shrink-0 rounded-full text-[10px] ring-1 ring-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="truncate text-xs font-semibold">
                            {reply.name}
                          </strong>
                          {reply.isVerified ? (
                            <VerifiedBadge size={14} />
                          ) : null}
                          <span className="text-[10px] text-zinc-600">
                            @{reply.username}
                            <span className="px-1 text-zinc-700">·</span>
                            {formatRelativeTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-5 text-zinc-300">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!replies.length ? (
                    <p className="py-2 text-xs text-zinc-500">
                      No replies yet. Be the first.
                    </p>
                  ) : null}
                </div>
              )}

              <div className="mt-3 flex items-end gap-2 rounded-xl border border-white/8 bg-white/[.02] p-2 transition-colors focus-within:border-white/20">
                <Textarea
                  value={replyDraft}
                  onChange={(event) =>
                    onReplyDraftChange(post.id, event.target.value)
                  }
                  maxLength={280}
                  placeholder="Write a reply..."
                  className="min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  onClick={() => onAddReply(post)}
                  disabled={!replyDraft.trim() || savingReply}
                  size="icon-sm"
                  className="size-11 shrink-0 rounded-lg sm:size-9"
                  aria-label="Send reply"
                >
                  {savingReply ? <XSpinner size="sm" /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const MemoizedPostCard = memo(PostCard);
