"use client";

import {
  Bookmark,
  Eye,
  Heart,
  ImageIcon,
  MessageCircle,
  Repeat2,
} from "lucide-react";

import { formatCount } from "@/lib/social-format";
import { SkeletonBlock } from "../app-loader";
import { InstrumentBadge } from "../instrument-badge";
import { MediaImage } from "../media-image";
import { TraderAvatar } from "../trader-avatar";
import type { Post } from "../types";
import { VerifiedBadge } from "../verified-badge";
import type { ProfileTab } from "./profile-types";

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "posts", label: "Posts" },
  { id: "media", label: "Media" },
];

function EmptyTab({ tab }: { tab: ProfileTab }) {
  const title = tab === "posts" ? "No posts yet" : "No media yet";
  const description =
    tab === "posts" ? "Posts will appear here." : "Image posts will appear here.";

  return (
    <div className="grid min-h-64 place-items-center px-8 text-center">
      <div>
        <ImageIcon className="mx-auto text-ink-subtle" size={36} />
        <h3 className="mt-4 text-2xl font-black">{title}</h3>
        <p className="mt-2 text-sm text-ink-mute">{description}</p>
      </div>
    </div>
  );
}

function ProfilePost({
  post,
  observePostView,
}: {
  post: Post;
  observePostView: (node: HTMLElement | null, postId: string) => void;
}) {
  return (
    <article
      ref={(node) => observePostView(node, post.id)}
      className="group border-b border-white/8 bg-surface-raised px-4 py-5 last:border-b-0 transition hover:bg-surface-raised sm:px-6"
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-4">
        <TraderAvatar
          name={post.name}
          value={post.avatar}
          className="mt-1 h-10 w-10 shrink-0 rounded-full text-xs ring-2 ring-white/5 transition group-hover:ring-white/15 sm:h-12 sm:w-12"
        />
        <div className="min-w-0">
          {post.timelineType === "reply" && post.parentPostHandle ? (
            <div className="mb-2 inline-flex max-w-full items-center rounded-full border border-sky-400/15 bg-sky-400/10 px-2.5 py-1 text-[10px] font-bold text-sky-200">
              Replying to {post.parentPostHandle}
            </div>
          ) : null}
          {post.timelineType === "repost" ? (
            <div className="mb-2 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
              <Repeat2 size={11} /> Reposted
            </div>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-5 sm:text-sm">
            <p className="max-w-full truncate font-black text-white">{post.name}</p>
            {post.isVerified ? <VerifiedBadge size={15} /> : null}
            <p className="truncate text-xs text-ink-mute">{post.handle}</p>
            <span className="text-xs text-ink-faint">/</span>
            <p className="text-xs text-ink-mute">{post.time}</p>
          </div>
          {post.symbol ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-black px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
              <InstrumentBadge
                symbol={post.symbol}
                compact
                className="mr-auto rounded-xl bg-surface-raised"
              />
              <span className="text-[10px] font-black text-ink-strong">{post.side}</span>
              <span
                className={
                  post.result === "WIN"
                    ? "text-[10px] font-black text-emerald-300"
                    : post.result === "LOSS"
                      ? "text-[10px] font-black text-rose-300"
                      : "text-[10px] font-black text-ink-strong"
                }
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
            </div>
          ) : null}
          {post.text ? (
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-zinc-50">
              {post.text}
            </p>
          ) : null}
          {post.timelineType === "reply" && post.parentPostText ? (
            <div className="mt-3 rounded-2xl border border-white/8 bg-black px-3 py-3 text-xs text-ink-soft">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-ink-subtle">
                Original post
              </div>
              <p className="line-clamp-3 whitespace-pre-line leading-5">
                {post.parentPostText}
              </p>
            </div>
          ) : null}
          {post.imageUrls?.length ? (
            <div
              className={`mt-3 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 ${
                post.imageUrls.length === 1
                  ? "grid-cols-1"
                  : post.imageUrls.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2"
              }`}
            >
              {post.imageUrls.slice(0, 4).map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid min-h-40 place-items-center overflow-hidden bg-black/90"
                >
                  <MediaImage
                    src={url}
                    alt={`Trade media ${index + 1}`}
                    className="h-full max-h-[520px] w-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : post.imageUrl ? (
            <a
              href={post.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 grid min-h-40 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/90"
            >
              <MediaImage
                src={post.imageUrl}
                alt="Post media"
                className="max-h-[520px] max-w-full object-contain"
              />
            </a>
          ) : null}
          <div className="mt-3 grid max-w-md grid-cols-5 text-ink-mute">
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-ink-strong">
              <MessageCircle size={16} /> {post.replies}
            </span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-emerald-200">
              <Repeat2 size={16} /> {post.reposts}
            </span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-rose-200">
              <Heart size={16} /> {post.likes}
            </span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-ink-strong">
              <Eye size={16} /> {formatCount(post.views)}
            </span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-ink-strong">
              <Bookmark size={16} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProfilePosts({
  posts,
  activeTab,
  loading,
  onTabChange,
  observePostView,
}: {
  posts: Post[];
  activeTab: ProfileTab;
  loading: boolean;
  onTabChange: (tab: ProfileTab) => void;
  observePostView: (node: HTMLElement | null, postId: string) => void;
}) {
  const mediaPosts = posts.filter(
    (post) => post.imageUrl || post.chartImageUrl || post.shareImageUrl,
  );
  const visiblePosts = activeTab === "posts" ? posts : mediaPosts;

  return (
    <section className="border-b border-border bg-card sm:mt-2 sm:overflow-hidden sm:rounded-lg sm:border">
      <div className="relative z-10 grid grid-cols-2 border-b border-border bg-card">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative min-w-0 px-2 py-3 text-xs font-black transition-colors ${
                active
                  ? "text-white"
                  : "text-ink-mute hover:bg-white/[.03] hover:text-ink-strong"
              }`}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-white" />
              ) : null}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="space-y-px" role="status" aria-label="Loading posts">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="border-b border-white/[.055] px-4 py-4">
              <div className="flex gap-3">
                <SkeletonBlock className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3.5 w-36" />
                  <SkeletonBlock className="mt-2.5 h-3.5 w-full" />
                  <SkeletonBlock className="mt-2 h-3.5 w-3/5" />
                  <div className="mt-3 flex gap-4">
                    <SkeletonBlock className="h-3 w-10" />
                    <SkeletonBlock className="h-3 w-10" />
                    <SkeletonBlock className="h-3 w-10" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visiblePosts.length ? (
        <div className="relative z-0">
          {visiblePosts.map((post) => (
            <ProfilePost
              key={post.id}
              post={post}
              observePostView={observePostView}
            />
          ))}
        </div>
      ) : (
        <EmptyTab tab={activeTab} />
      )}
    </section>
  );
}
