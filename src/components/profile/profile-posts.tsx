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
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#090909]">
      <div className="grid grid-cols-2 border-b border-white/8">
        {(["posts", "media"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`relative h-12 text-sm font-semibold capitalize transition hover:bg-white/[.03] ${
              activeTab === tab ? "text-white" : "text-zinc-600"
            }`}
          >
            {tab}
            {activeTab === tab ? (
              <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-white" />
            ) : null}
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className="divide-y divide-white/8">
          {visible.map((post) => (
            <article key={post.id} className="p-4 transition hover:bg-white/[.018] sm:p-5">
              <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[46px_minmax(0,1fr)]">
                <TraderAvatar
                  name={post.name}
                  value={post.avatar}
                  className="size-10 rounded-full text-xs ring-1 ring-white/10 sm:size-11"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <strong className="truncate text-white">{post.name}</strong>
                    {post.isVerified ? <VerifiedBadge size={15} /> : null}
                    <span className="truncate text-xs text-zinc-600">{post.handle}</span>
                    <span className="text-xs text-zinc-700">·</span>
                    <span className="text-xs text-zinc-600">{post.time}</span>
                  </div>

                  {post.symbol ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                      <InstrumentBadge symbol={post.symbol} compact className="mr-auto bg-[#121212]" />
                      <span
                        className={`text-[10px] font-semibold ${
                          post.side === "LONG" ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {post.side}
                      </span>
                      {post.result ? (
                        <span
                          className={`text-[10px] font-semibold ${
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
                          className={`font-mono text-sm ${
                            post.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}
                        </strong>
                      ) : null}
                    </div>
                  ) : null}

                  {post.text ? (
                    <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-6 text-zinc-200">
                      {post.text}
                    </p>
                  ) : null}

                  <ProfilePostMedia post={post} />

                  <div className="mt-3 grid max-w-md grid-cols-5 text-zinc-600">
                    <Metric icon={<MessageCircle className="size-4" />} value={post.replies} />
                    <Metric icon={<Repeat2 className="size-4" />} value={post.reposts} />
                    <Metric icon={<Heart className="size-4" />} value={post.likes} />
                    <Metric icon={<Eye className="size-4" />} value={formatCount(post.views)} />
                    <Metric icon={<Bookmark className="size-4" />} value="" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center px-8 text-center">
          <div>
            <ImageIcon className="mx-auto size-7 text-zinc-700" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              {activeTab === "posts" ? "No posts yet" : "No media yet"}
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              {activeTab === "posts"
                ? "Shared trade reviews will appear here."
                : "Image posts will appear here."}
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
    <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px]">
      {icon}
      {value}
    </span>
  );
}
