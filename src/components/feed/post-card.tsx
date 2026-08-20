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

import { formatCount, formatRelativeTime } from "@/lib/social-format";
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
  onPrefetchProfile,
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
  onPrefetchProfile: (username: string) => void;
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
  const warmProfile = () => onPrefetchProfile(post.handle);

  return (
    <article
      id={`post-${post.id}`}
      ref={(node) => observePost(node, post.id)}
      className="border-b border-xborder bg-xsurface px-4 py-4 transition-colors last:border-b-0 hover:bg-xpanel/40 sm:px-5 sm:py-5 [content-visibility:auto] [contain-intrinsic-size:520px]"
    >
      <div className="flex gap-3">
        <button
          type="button"
          onMouseEnter={warmProfile}
          onFocus={warmProfile}
          onPointerDown={warmProfile}
          onClick={() => onOpenProfile(post.handle)}
          className="h-10 w-10 shrink-0 rounded-full sm:h-11 sm:w-11"
        >
          <TraderAvatar
            name={post.name}
            value={post.avatar}
            className="h-10 w-10 rounded-full text-xs ring-1 ring-white/10 sm:h-11 sm:w-11"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <button
                  type="button"
                  onMouseEnter={warmProfile}
                  onFocus={warmProfile}
                  onPointerDown={warmProfile}
                  onClick={() => onOpenProfile(post.handle)}
                  className="max-w-full truncate text-left text-sm font-black tracking-tight text-white hover:underline"
                >
                  {post.name}
                </button>
                {post.isVerified ? <VerifiedBadge size={15} /> : null}
                <button
                  type="button"
                  onMouseEnter={warmProfile}
                  onFocus={warmProfile}
                  onClick={() => onOpenProfile(post.handle)}
                  className="truncate text-xs text-xmuted hover:text-zinc-300"
                >
                  {post.handle}
                </button>
                <span className="text-xs text-zinc-700">·</span>
                <span className="text-xs text-xmuted">{post.time}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-xmuted transition hover:bg-xraised hover:text-zinc-200"
                  aria-label="Post options"
                >
                  <MoreHorizontal size={17} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onShare(post)} className="min-h-9 px-2.5">
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
                  <DropdownMenuItem onClick={() => onEdit(post)} className="min-h-9 px-2.5">
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

          {post.text && post.text !== `${post.symbol} trade` ? (
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-zinc-100">
              {post.text}
            </p>
          ) : null}

          {post.symbol ? (
            <div className="relative mt-3 overflow-hidden rounded-xl border border-xborder bg-xpanel px-3 py-2.5">
              <span
                className={`absolute inset-y-0 left-0 w-0.5 ${
                  post.result === "LOSS" ||
                  (typeof post.pnl === "number" && post.pnl < 0)
                    ? "bg-rose-400/70"
                    : "bg-emerald-400/70"
                }`}
              />
              <div className="flex flex-wrap items-center gap-2 pl-1">
                <InstrumentBadge
                  symbol={post.symbol}
                  compact
                  className="mr-auto rounded-lg bg-xraised"
                />
                {post.side ? (
                  <span
                    className={`text-[9px] font-black uppercase tracking-[.08em] ${
                      post.side === "LONG" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {post.side}
                  </span>
                ) : null}
                {post.result ? (
                  <span
                    className={`text-[9px] font-black uppercase tracking-[.08em] ${
                      post.result === "WIN"
                        ? "text-emerald-300"
                        : post.result === "LOSS"
                          ? "text-rose-300"
                          : "text-zinc-400"
                    }`}
                  >
                    {post.result}
                  </span>
                ) : null}
                {typeof post.pnl === "number" ? (
                  <strong
                    className={`font-mono text-sm font-black ${
                      post.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}
                  </strong>
                ) : null}
                {typeof post.resultR === "number" ? (
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    {post.resultR >= 0 ? "+" : ""}
                    {post.resultR.toFixed(2)}R
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {post.imageUrls?.length ? (
            <div
              className={`mt-3 grid overflow-hidden rounded-xl border border-xborder bg-black ${
                post.imageUrls.length === 1
                  ? "grid-cols-1"
                  : post.imageUrls.length === 2 || post.imageUrls.length === 4
                    ? "grid-cols-2 gap-px"
                    : "grid-cols-3 gap-px"
              }`}
            >
              {post.imageUrls.slice(0, 4).map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onOpenMedia(url)}
                  className={
                    post.imageUrls?.length === 1
                      ? "group grid max-h-[620px] min-h-44 w-full place-items-center overflow-hidden bg-black"
                      : "group relative aspect-[4/3] w-full overflow-hidden bg-black"
                  }
                >
                  <MediaImage
                    src={url}
                    alt={
                      index === post.imageUrls!.length - 1
                        ? `${post.symbol} Tradoxy share card`
                        : `${post.symbol} trade screenshot ${index + 1}`
                    }
                    className={
                      post.imageUrls?.length === 1
                        ? "max-h-[620px] w-full object-contain transition-opacity group-hover:opacity-95"
                        : "h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    }
                  />
                </button>
              ))}
            </div>
          ) : post.imageUrl ? (
            <button
              type="button"
              onClick={() => onOpenMedia(post.imageUrl!)}
              className="group mt-3 grid max-h-[620px] min-h-44 w-full place-items-center overflow-hidden rounded-xl border border-xborder bg-black"
            >
              <MediaImage
                src={post.imageUrl}
                alt="Trade media"
                className="max-h-[620px] w-full object-contain transition-opacity group-hover:opacity-95"
              />
            </button>
          ) : null}

          <div className="mt-3 flex items-center justify-between border-t border-xborder pt-2.5 text-xmuted">
            <button
              type="button"
              onClick={() => onToggleReplies(post)}
              className={`flex h-8 items-center gap-1.5 px-1 text-[11px] transition hover:text-zinc-200 ${
                openReplies ? "text-white" : ""
              }`}
              aria-label="Replies"
            >
              <MessageCircle size={15} strokeWidth={1.75} />
              {formatCount(post.replies)}
            </button>
            <button
              type="button"
              onClick={() => onToggleRepost(post)}
              className={`flex h-8 items-center gap-1.5 px-1 text-[11px] transition hover:text-emerald-300 ${
                post.reposted ? "text-emerald-300" : ""
              }`}
              aria-label="Repost"
            >
              <Repeat2 size={15} strokeWidth={1.75} />
              {formatCount(post.reposts)}
            </button>
            <button
              type="button"
              onClick={() => onToggleLike(post)}
              className={`flex h-8 items-center gap-1.5 px-1 text-[11px] transition hover:text-rose-300 ${
                post.liked ? "text-rose-300" : ""
              }`}
              aria-label="Like"
            >
              <Heart
                size={15}
                strokeWidth={1.75}
                fill={post.liked ? "currentColor" : "none"}
              />
              {formatCount(post.likes)}
            </button>
            <span
              className="flex h-8 items-center gap-1.5 px-1 text-[11px]"
              aria-label={`${post.views} views`}
            >
              <Eye size={15} strokeWidth={1.75} />
              {formatCount(post.views)}
            </span>
            <button
              type="button"
              onClick={() => onShare(post)}
              className="grid h-8 w-8 place-items-center transition hover:text-zinc-200"
              aria-label="Share"
            >
              <Share2 size={15} strokeWidth={1.75} />
            </button>
          </div>

          {openReplies ? (
            <div className="mt-3 border-t border-xborder pt-3">
              {loadingReplies ? (
                <div className="flex items-center gap-2 py-4 text-xs text-xmuted">
                  <XSpinner size="sm" /> Loading replies
                </div>
              ) : (
                <div className="space-y-2.5">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex gap-2.5 rounded-xl border border-xborder bg-xpanel p-3"
                    >
                      <TraderAvatar
                        name={reply.name}
                        value={reply.avatar}
                        className="h-8 w-8 shrink-0 text-[10px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="truncate text-xs text-white">
                            {reply.name}
                          </strong>
                          {reply.isVerified ? <VerifiedBadge size={14} /> : null}
                          <span className="text-[10px] text-xmuted">
                            @{reply.username} · {formatRelativeTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-5 text-zinc-300">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!replies.length ? (
                    <p className="py-2 text-xs text-xmuted">No replies yet.</p>
                  ) : null}
                </div>
              )}

              <div className="mt-3 flex items-end gap-2 rounded-xl border border-xborder bg-xpanel p-2 focus-within:border-xborder-strong">
                <Textarea
                  value={replyDraft}
                  onChange={(event) => onReplyDraftChange(post.id, event.target.value)}
                  maxLength={280}
                  placeholder="Write a reply..."
                  className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  onClick={() => onAddReply(post)}
                  disabled={!replyDraft.trim() || savingReply}
                  size="icon-sm"
                  className="h-10 w-10 shrink-0 rounded-lg bg-white text-black hover:bg-zinc-200"
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
