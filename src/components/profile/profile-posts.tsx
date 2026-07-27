"use client";

import { Bookmark, Eye, Heart, ImageIcon, MessageCircle, Repeat2 } from "lucide-react";

import { InstrumentBadge } from "@/components/instrument-badge";
import { MediaImage } from "@/components/media-image";
import { TraderAvatar } from "@/components/trader-avatar";
import type { Post } from "@/components/types";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatCount } from "@/lib/social-format";

export type ProfileTab = "posts" | "media";

export function ProfilePosts({
  posts,
  activeTab,
  onTabChange,
}: {
  posts: Post[];
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}) {
  const visible =
    activeTab === "media"
      ? posts.filter(
          (post) =>
            post.imageUrl ||
            post.chartImageUrl ||
            post.shareImageUrl ||
            post.imageUrls?.length,
        )
      : posts;

  return (
    <section className="border-b border-border bg-card sm:mt-2 sm:overflow-hidden sm:rounded-lg sm:border">
      <div className="relative z-10 grid grid-cols-2 border-b border-border bg-card">
        {(["posts", "media"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`relative min-w-0 px-2 py-3 text-xs font-black capitalize transition-colors ${
                active
                  ? "text-white"
                  : "text-zinc-500 hover:bg-white/[.03] hover:text-zinc-300"
              }`}
            >
              {tab}
              {active ? (
                <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-white" />
              ) : null}
            </button>
          );
        })}
      </div>

      {visible.length ? (
        <div className="relative z-0">
          {visible.map((post) => (
            <article
              key={post.id}
              className="group border-b border-white/8 bg-[#111111] px-4 py-5 last:border-b-0 transition hover:bg-[#141414] sm:px-6"
            >
              <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-4">
                <TraderAvatar
                  name={post.name}
                  value={post.avatar}
                  className="mt-1 size-10 shrink-0 rounded-full text-xs ring-2 ring-white/5 transition group-hover:ring-white/15 sm:size-12"
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-5 sm:text-sm">
                    <strong className="max-w-full truncate font-black text-white">
                      {post.name}
                    </strong>
                    {post.isVerified ? <VerifiedBadge size={15} /> : null}
                    <span className="truncate text-xs text-slate-500">{post.handle}</span>
                    <span className="text-xs text-slate-700">/</span>
                    <span className="text-xs text-slate-500">{post.time}</span>
                  </div>

                  {post.symbol ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-black px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                      <InstrumentBadge
                        symbol={post.symbol}
                        compact
                        className="mr-auto rounded-xl bg-[#131313]"
                      />
                      <span className="text-[10px] font-black text-zinc-300">
                        {post.side}
                      </span>
                      {post.result ? (
                        <span
                          className={`text-[10px] font-black ${
                            post.result === "WIN"
                              ? "text-emerald-300"
                              : post.result === "LOSS"
                                ? "text-rose-300"
                                : "text-zinc-300"
                          }`}
                        >
                          {post.result}
                        </span>
                      ) : null}
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
                    <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-slate-50">
                      {post.text}
                    </p>
                  ) : null}

                  <ProfilePostMedia post={post} />

                  <div className="mt-3 grid max-w-md grid-cols-5 text-slate-500">
                    <Metric icon={<MessageCircle size={16} />} value={post.replies} />
                    <Metric icon={<Repeat2 size={16} />} value={post.reposts} />
                    <Metric icon={<Heart size={16} />} value={post.likes} />
                    <Metric icon={<Eye size={16} />} value={formatCount(post.views)} />
                    <Metric icon={<Bookmark size={16} />} value="" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center px-8 text-center">
          <div>
            <ImageIcon className="mx-auto text-slate-600" size={36} />
            <h3 className="mt-4 text-2xl font-black text-white">
              {activeTab === "posts" ? "No posts yet" : "No media yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {activeTab === "posts" ? "Posts will appear here." : "Image posts will appear here."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ProfilePostMedia({ post }: { post: Post }) {
  const urls = post.imageUrls?.length
    ? post.imageUrls.slice(0, 4)
    : [post.imageUrl, post.chartImageUrl, post.shareImageUrl].filter(
        (value): value is string => Boolean(value),
      );
  if (!urls.length) return null;

  return (
    <div
      className={`mt-3 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 ${
        urls.length === 1
          ? "grid-cols-1"
          : urls.length === 3
            ? "grid-cols-3"
            : "grid-cols-2"
      }`}
    >
      {urls.map((url, index) => (
        <a
          key={`${url}-${index}`}
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
  );
}

function Metric({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string | number;
}) {
  return (
    <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-zinc-300">
      {icon}
      {value}
    </span>
  );
}
