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

export function PostCard({
  post,
  userId,
  isAdmin,
  actingId,
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
  actingId: string | null;
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

  return (
    <article
      id={`post-${post.id}`}
      ref={(node) => observePost(node, post.id)}
      className="rounded-[1.25rem] border border-white/8 bg-[#17181b] px-3 py-4 transition-colors hover:bg-[#191a1e] sm:px-5 sm:py-5"
    >
      <div className="flex gap-3.5">
        <button
          type="button"
          onClick={() => onOpenProfile(post.handle)}
          className="h-11 w-11 shrink-0 rounded-full sm:h-12 sm:w-12"
        >
          <TraderAvatar
            name={post.name}
            value={post.avatar}
            className="h-11 w-11 rounded-full text-xs ring-1 ring-white/10 sm:h-12 sm:w-12"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpenProfile(post.handle)}
                className="flex max-w-full items-center gap-1 truncate text-left text-[15px] font-black tracking-tight hover:underline"
              >
                {post.name}
                {post.isVerified ? <VerifiedBadge size={16} /> : null}
              </button>
              <p className="truncate text-[11px] text-slate-500">
                {post.handle} / {post.time}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/0 text-zinc-600 transition-colors hover:border-white/8 hover:bg-white/[.04] hover:text-zinc-200"
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
                    disabled={actingId === post.id}
                    className="min-h-9 px-2.5"
                  >
                    {actingId === post.id ? (
                      <XSpinner size="sm" />
                    ) : (
                      <Trash2 />
                    )}
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
                className={`rounded-md px-2 py-1 text-[9px] font-black ${
                  post.side === "LONG"
                    ? "bg-emerald-300/10 text-emerald-300"
                    : "bg-rose-300/10 text-rose-300"
                }`}
              >
                {post.side}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-[9px] font-black ${
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
                  className={
                    post.pnl >= 0
                      ? "text-sm text-emerald-300"
                      : "text-sm text-rose-300"
                  }
                >
                  {post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}
                </strong>
              ) : null}
              {typeof post.resultR === "number" ? (
                <span className="text-xs font-bold text-zinc-300">
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

          {post.imageUrls?.length ? (
            <div
              className={`mt-3 overflow-hidden rounded-xl border border-white/10 ${
                post.imageUrls.length === 1
                  ? ""
                  : post.imageUrls.length === 2 ||
                      post.imageUrls.length === 4
                    ? "grid grid-cols-2 gap-px bg-white/10"
                    : "grid grid-cols-3 gap-px bg-white/10"
              }`}
            >
              {post.imageUrls.slice(0, 4).map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onOpenMedia(url)}
                  className="group relative aspect-square w-full overflow-hidden bg-black/90"
                >
                  <MediaImage
                    src={url}
                    alt={
                      index === post.imageUrls!.length - 1
                        ? `${post.symbol} Tradox share card`
                        : `${post.symbol} trade screenshot ${index + 1}`
                    }
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          ) : post.imageUrl ? (
            <button
              type="button"
              onClick={() => onOpenMedia(post.imageUrl!)}
              className="group relative mt-3 block aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/90"
            >
              <MediaImage
                src={post.imageUrl}
                alt="Trade media"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </button>
          ) : null}

          <div className="mt-3 grid grid-cols-5 items-center rounded-xl border border-white/8 bg-black/10 p-0.5 text-zinc-500">
            <button
              type="button"
              onClick={() => onToggleReplies(post)}
              className={`flex h-11 items-center gap-1.5 rounded-lg text-[11px] transition-colors hover:bg-white/[.04] hover:text-zinc-200 sm:h-9 ${
                openReplies ? "bg-white/[.05] text-zinc-100" : ""
              }`}
              aria-label="Replies"
            >
              <MessageCircle size={15} strokeWidth={1.75} />
              {post.replies}
            </button>
            <button
              type="button"
              onClick={() => onToggleRepost(post)}
              className={`flex h-11 items-center gap-1.5 rounded-lg text-[11px] transition-colors hover:bg-emerald-400/[.06] hover:text-emerald-300 sm:h-9 ${
                post.reposted
                  ? "bg-emerald-400/[.08] text-emerald-300"
                  : ""
              }`}
              aria-label="Repost"
            >
              <Repeat2 size={15} strokeWidth={1.75} />
              {post.reposts}
            </button>
            <button
              type="button"
              onClick={() => onToggleLike(post)}
              className={`flex h-11 items-center gap-1.5 rounded-lg text-[11px] transition-colors hover:bg-rose-400/[.06] hover:text-rose-300 sm:h-9 ${
                post.liked ? "bg-rose-400/[.08] text-rose-300" : ""
              }`}
              aria-label="Like"
            >
              <Heart
                size={15}
                strokeWidth={1.75}
                fill={post.liked ? "currentColor" : "none"}
              />
              {post.likes}
            </button>
            <span
              className="flex h-11 items-center gap-1.5 rounded-lg text-[11px] sm:h-9"
              aria-label={`${post.views} views`}
            >
              <Eye size={15} strokeWidth={1.75} />
              {formatCount(post.views)}
            </span>
            <button
              type="button"
              onClick={() => onShare(post)}
              className="grid h-11 place-items-center rounded-lg transition-colors hover:bg-white/[.04] hover:text-zinc-200 sm:h-9"
              aria-label="Share"
            >
              <Share2 size={15} strokeWidth={1.75} />
            </button>
          </div>

          {openReplies ? (
            <div className="mt-4 border-t border-white/8 pt-4">
              {loadingReplies ? (
                <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                  <XSpinner size="sm" /> Loading replies
                </div>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex gap-2.5 rounded-[1rem] border border-white/8 bg-black p-3"
                    >
                      <TraderAvatar
                        name={reply.name}
                        value={reply.avatar}
                        className="h-8 w-8 shrink-0 text-[10px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <strong className="truncate text-xs">
                            {reply.name}
                          </strong>
                          {reply.isVerified ? (
                            <VerifiedBadge size={14} />
                          ) : null}
                          <span className="text-[10px] text-slate-600">
                            @{reply.username}
                            <span className="px-1 text-zinc-700">/</span>
                            {formatRelativeTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-300">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!replies.length ? (
                    <p className="py-2 text-xs text-slate-500">
                      No replies yet.
                    </p>
                  ) : null}
                </div>
              )}

              <div className="mt-3 flex items-end gap-2 rounded-[1rem] border border-white/8 bg-black p-2 focus-within:border-white/20">
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
                  className="h-11 w-11 shrink-0 rounded-xl bg-white text-slate-950 hover:bg-white sm:h-9 sm:w-9"
                  aria-label="Send reply"
                >
                  {savingReply ? (
                    <XSpinner size="sm" />
                  ) : (
                    <Send size={14} />
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
