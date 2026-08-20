"use client";

import {
  Bookmark,
  Eye,
  Heart,
  ImageIcon,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import { useMemo } from "react";

import { formatCount } from "@/lib/social-format";
import { XSpinner } from "../app-loader";
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
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-xborder bg-xpanel">
          <ImageIcon className="text-xmuted" size={20} />
        </span>
        <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
        <p className="mt-1.5 text-sm text-xmuted">{description}</p>
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
      className="group border-b border-xborder bg-xsurface px-4 py-4 transition hover:bg-xpanel/45 last:border-b-0 sm:px-5 [content-visibility:auto] [contain-intrinsic-size:420px]"
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[44px_minmax(0,1fr)]">
        <TraderAvatar
          name={post.name}
          value={post.avatar}
          className="h-10 w-10 shrink-0 rounded-full text-xs ring-1 ring-white/10 sm:h-11 sm:w-11"
        />
        <div className="min-w-0">
          {post.timelineType === "reply" && post.parentPostHandle ? (
            <p className="mb-1.5 text-[10px] font-semibold text-sky-300/80">
              Replying to {post.parentPostHandle}
            </p>
          ) : null}
          {post.timelineType === "repost" ? (
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-300/80">
              <Repeat2 size={11} /> Reposted
            </p>
          ) : null}

          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-5">
            <p className="max-w-full truncate text-sm font-black text-white">
              {post.name}
            </p>
            {post.isVerified ? <VerifiedBadge size={15} /> : null}
            <p className="truncate text-xs text-xmuted">{post.handle}</p>
            <span className="text-xs text-zinc-700">·</span>
            <p className="text-xs text-xmuted">{post.time}</p>
          </div>

          {post.text ? (
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-zinc-100">
              {post.text}
            </p>
          ) : null}

          {post.symbol ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-xborder bg-xpanel px-3 py-2.5">
              <InstrumentBadge
                symbol={post.symbol}
                compact
                className="mr-auto rounded-lg bg-xraised"
              />
              {post.side ? (
                <span
                  className={`text-[9px] font-black uppercase ${
                    post.side === "LONG" ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {post.side}
                </span>
              ) : null}
              {post.result ? (
                <span
                  className={`text-[9px] font-black uppercase ${
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
            </div>
          ) : null}

          {post.timelineType === "reply" && post.parentPostText ? (
            <div className="mt-3 rounded-xl border border-xborder bg-xpanel px-3 py-3 text-xs text-zinc-400">
              <p className="line-clamp-3 whitespace-pre-line leading-5">
                {post.parentPostText}
              </p>
            </div>
          ) : null}

          {post.imageUrls?.length ? (
            <div
              className={`mt-3 grid overflow-hidden rounded-xl border border-xborder bg-black ${
                post.imageUrls.length === 1
                  ? "grid-cols-1"
                  : post.imageUrls.length === 3
                    ? "grid-cols-3 gap-px"
                    : "grid-cols-2 gap-px"
              }`}
            >
              {post.imageUrls.slice(0, 4).map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={
                    post.imageUrls?.length === 1
                      ? "grid max-h-[580px] min-h-44 place-items-center overflow-hidden bg-black"
                      : "aspect-[4/3] overflow-hidden bg-black"
                  }
                >
                  <MediaImage
                    src={url}
                    alt={`Trade media ${index + 1}`}
                    className={
                      post.imageUrls?.length === 1
                        ? "max-h-[580px] w-full object-contain"
                        : "h-full w-full object-cover"
                    }
                  />
                </a>
              ))}
            </div>
          ) : post.imageUrl ? (
            <a
              href={post.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 grid max-h-[580px] min-h-44 place-items-center overflow-hidden rounded-xl border border-xborder bg-black"
            >
              <MediaImage
                src={post.imageUrl}
                alt="Post media"
                className="max-h-[580px] w-full object-contain"
              />
            </a>
          ) : null}

          <div className="mt-3 flex max-w-lg items-center justify-between border-t border-xborder pt-2.5 text-xmuted">
            <span className="flex h-8 items-center gap-1.5 text-[11px]">
              <MessageCircle size={15} /> {formatCount(post.replies)}
            </span>
            <span className="flex h-8 items-center gap-1.5 text-[11px]">
              <Repeat2 size={15} /> {formatCount(post.reposts)}
            </span>
            <span className="flex h-8 items-center gap-1.5 text-[11px]">
              <Heart size={15} /> {formatCount(post.likes)}
            </span>
            <span className="flex h-8 items-center gap-1.5 text-[11px]">
              <Eye size={15} /> {formatCount(post.views)}
            </span>
            <span className="grid h-8 place-items-center">
              <Bookmark size={15} />
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
  const mediaPosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          post.imageUrl ||
          post.imageUrls?.length ||
          post.chartImageUrl ||
          post.shareImageUrl,
      ),
    [posts],
  );
  const visiblePosts = activeTab === "posts" ? posts : mediaPosts;

  return (
    <section className="mt-3 border-y border-xborder bg-xsurface sm:overflow-hidden sm:rounded-2xl sm:border">
      <div className="relative z-10 grid grid-cols-2 border-b border-xborder bg-xsurface px-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative min-w-0 px-2 py-3.5 text-xs font-black transition-colors ${
                active
                  ? "text-white"
                  : "text-xmuted hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-10 bottom-0 h-0.5 rounded-full bg-white" />
              ) : null}
            </button>
          );
        })}
      </div>
      {loading && !posts.length ? (
        <div className="grid min-h-48 place-items-center text-xmuted">
          <XSpinner size="lg" />
        </div>
      ) : visiblePosts.length ? (
        <div>{visiblePosts.map((post) => (
          <ProfilePost
            key={post.id}
            post={post}
            observePostView={observePostView}
          />
        ))}</div>
      ) : (
        <EmptyTab tab={activeTab} />
      )}
    </section>
  );
}
