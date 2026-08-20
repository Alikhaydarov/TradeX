"use client";

import dynamic from "next/dynamic";
import { Check, X } from "lucide-react";

import { SkeletonBlock, XSpinner } from "../app-loader";
import { MediaImage } from "../media-image";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { MemoizedPostCard as PostCard } from "./post-card";
import { useFeedData } from "./use-feed-data";

const PostComposer = dynamic(
  () => import("./post-composer").then((module) => module.PostComposer),
  { ssr: false },
);

export type FeedPageProps = {
  onLogin: () => void;
};

function FeedSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-xborder bg-xsurface">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="border-b border-xborder p-4 last:border-b-0 sm:p-5"
        >
          <div className="flex gap-3">
            <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
              <SkeletonBlock className="mt-4 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-4/5" />
              <div className="mt-5 flex justify-between gap-4 border-t border-xborder pt-3">
                {Array.from({ length: 5 }, (_, item) => (
                  <SkeletonBlock key={item} className="h-4 w-9" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedPage({ onLogin }: FeedPageProps) {
  const feed = useFeedData(onLogin);

  return (
    <div className="min-h-full bg-xcanvas pb-10">
      {feed.error ? (
        <div className="mx-auto mt-4 max-w-[780px] rounded-xl border border-rose-300/15 bg-rose-400/[.07] px-4 py-3 text-sm text-rose-200">
          {feed.error}
        </div>
      ) : null}

      <div className="mx-auto max-w-[780px] px-0 py-3 sm:px-4 sm:py-5">
        <div className="mb-3 flex items-center justify-between px-4 sm:px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-xmuted">
              Community
            </p>
            <h1 className="mt-1 text-lg font-black tracking-tight text-white">
              Trading timeline
            </h1>
          </div>
          <span className="rounded-full border border-xborder bg-xsurface px-2.5 py-1 text-[10px] font-semibold text-xmuted">
            {feed.posts.length} posts
          </span>
        </div>

        {feed.loading && !feed.posts.length ? (
          <FeedSkeleton />
        ) : (
          <div className="overflow-hidden border-y border-xborder bg-xsurface sm:rounded-2xl sm:border">
            {feed.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={feed.user?.id}
                isAdmin={feed.isAdmin}
                acting={feed.actingId === post.id}
                openReplies={feed.openReplies === post.id}
                replies={feed.repliesByPost[post.id] ?? []}
                replyDraft={feed.replyDrafts[post.id] ?? ""}
                loadingReplies={feed.loadingReplies === post.id}
                savingReply={feed.savingReply === post.id}
                observePost={feed.observePost}
                onOpenProfile={feed.openProfile}
                onShare={feed.sharePost}
                onToggleBookmark={feed.toggleBookmark}
                onEdit={feed.openEditPost}
                onDelete={feed.openDeleteModal}
                onOpenMedia={feed.setLightboxUrl}
                onToggleReplies={feed.toggleReplies}
                onToggleRepost={feed.toggleRepost}
                onToggleLike={feed.toggleLike}
                onReplyDraftChange={feed.updateReplyDraft}
                onAddReply={feed.addReply}
              />
            ))}

            {!feed.posts.length ? (
              <div className="grid min-h-64 place-items-center px-8 text-center">
                <div>
                  <h2 className="text-base font-black text-white">No trades shared yet</h2>
                  <p className="mt-1 text-sm text-xmuted">
                    Shared trade reviews will appear here.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {feed.lightboxUrl ? (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/94 p-4 backdrop-blur-sm"
          onClick={() => feed.setLightboxUrl(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => feed.setLightboxUrl(null)}
          >
            <X size={18} />
          </button>
          <MediaImage
            src={feed.lightboxUrl}
            alt="Full size"
            className="max-h-[92dvh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}

      {feed.tradePickerOpen || feed.shareTarget ? (
        <PostComposer
          open={feed.tradePickerOpen}
          onOpenChange={feed.setTradePickerOpen}
          accountOptions={feed.shareAccountOptions}
          accountFilter={feed.shareAccountFilter}
          onAccountFilterChange={feed.setShareAccountFilter}
          query={feed.tradePickerQuery}
          onQueryChange={feed.setTradePickerQuery}
          loading={feed.tradePickerLoading}
          trades={feed.filteredShareTrades}
          onSelectTrade={(trade) => {
            feed.setTradePickerOpen(false);
            feed.setShareTarget(trade);
          }}
          onOpenJournal={feed.openJournal}
          shareTarget={feed.shareTarget}
          onCloseShare={feed.closeShareComposer}
        />
      ) : null}

      {feed.deleteTarget ? (
        <div className="fixed inset-0 z-[99999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black/75 p-4 backdrop-blur-md">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() =>
              feed.actingId ? undefined : feed.setDeleteTarget(null)
            }
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-post-title"
            className="relative z-10 w-full max-w-[340px] rounded-2xl border border-xborder bg-xraised p-6 text-white shadow-2xl shadow-black/70"
          >
            <h3
              id="delete-post-title"
              className="text-xl font-black leading-6 tracking-tight"
            >
              Delete post?
            </h3>
            <p className="mt-2 text-[14px] leading-5 text-xmuted">
              This can&apos;t be undone. This post will be removed from the timeline and your profile.
            </p>

            <button
              type="button"
              onClick={() => void feed.archivePost()}
              disabled={feed.actingId === feed.deleteTarget.id}
              className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-rose-500 text-[14px] font-black text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {feed.actingId === feed.deleteTarget.id ? (
                <span className="inline-flex items-center gap-2">
                  <XSpinner size="sm" /> Deleting
                </span>
              ) : (
                "Delete"
              )}
            </button>
            <button
              type="button"
              onClick={() => feed.setDeleteTarget(null)}
              disabled={feed.actingId === feed.deleteTarget.id}
              className="mt-2 h-11 w-full rounded-xl border border-xborder bg-xpanel text-[14px] font-black text-white transition hover:bg-xsurface disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {feed.editingPost ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => feed.setEditingPost(null)}
            aria-label="Close edit dialog"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-xborder bg-xraised p-4 shadow-2xl sm:p-5">
            <div className="flex items-center gap-3">
              <h3 className="font-black">Edit post</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                onClick={() => feed.setEditingPost(null)}
              >
                <X size={16} />
              </Button>
            </div>
            <Textarea
              autoFocus
              value={feed.editingText}
              onChange={(event) => feed.setEditingText(event.target.value)}
              maxLength={280}
              className="mt-4 min-h-32"
            />
            <div className="mt-3 flex items-center">
              <span className="text-xs text-xmuted">
                {feed.editingText.length}/280
              </span>
              <Button
                className="ml-auto"
                disabled={
                  !feed.editingText.trim() ||
                  feed.actingId === feed.editingPost.id
                }
                onClick={() => void feed.savePostEdit()}
              >
                {feed.actingId === feed.editingPost.id ? (
                  <XSpinner size="sm" />
                ) : (
                  <Check size={16} />
                )}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
