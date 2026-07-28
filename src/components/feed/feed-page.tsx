"use client";

import { Check, X } from "lucide-react";

import { SkeletonBlock, XSpinner } from "../app-loader";
import { MediaImage } from "../media-image";
import { SocialActions } from "../social-actions-v2";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { MemoizedPostCard as PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import { useFeedData } from "./use-feed-data";

export type FeedPageProps = {
  onLogin: () => void;
};

function FeedSkeleton() {
  return (
    <div className="mt-3 overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#17181b]">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="border-b border-white/8 p-4 last:border-b-0 sm:p-5"
        >
          <div className="flex gap-3">
            <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
              <SkeletonBlock className="mt-4 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-4/5" />
              <div className="mt-4 flex gap-4">
                <SkeletonBlock className="h-4 w-12" />
                <SkeletonBlock className="h-4 w-12" />
                <SkeletonBlock className="h-4 w-12" />
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
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#111214]/96 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-tight">Trade feed</h1>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              Shared trade reviews only
            </p>
          </div>
          <SocialActions className="lg:hidden" />
        </div>
      </header>

      {feed.error ? (
        <div className="mx-auto mt-4 max-w-4xl rounded-[1rem] border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {feed.error}
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center px-1">
          <h2 className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">
            Community tape
          </h2>
          <span className="ml-auto text-[10px] text-zinc-600">
            {feed.posts.length} posts
          </span>
        </div>

        {feed.loading ? (
          <FeedSkeleton />
        ) : (
          <div className="mt-3 space-y-3">
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
              <div className="rounded-[1.25rem] border border-white/8 bg-[#17181b] p-10 text-center text-sm text-slate-500">
                No trades shared yet.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {feed.lightboxUrl ? (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
          onClick={() => feed.setLightboxUrl(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
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

      {feed.deleteTarget ? (
        <div className="fixed inset-0 z-[99999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black/75 p-4 backdrop-blur-md">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() =>
              feed.actingId
                ? undefined
                : feed.setDeleteTarget(null)
            }
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-post-title"
            className="relative z-10 w-full max-w-[340px] rounded-[30px] border border-white/10 bg-[#171717]/95 p-7 text-white shadow-2xl shadow-black/70"
          >
            <h3
              id="delete-post-title"
              className="text-xl font-black leading-6 tracking-tight"
            >
              Delete post?
            </h3>
            <p className="mt-2 text-[14px] leading-5 text-slate-400">
              This can&apos;t be undone. This post will be removed from
              the timeline and your profile.
            </p>

            <button
              type="button"
              onClick={() => void feed.archivePost()}
              disabled={feed.actingId === feed.deleteTarget.id}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#f4212e] text-[15px] font-black text-white transition hover:bg-[#dc1f2b] disabled:cursor-not-allowed disabled:opacity-70"
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
              className="mt-3 h-12 w-full rounded-full border border-[#536471] bg-transparent text-[15px] font-black text-white transition hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-2xl sm:p-5">
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
              onChange={(event) =>
                feed.setEditingText(event.target.value)
              }
              maxLength={280}
              className="mt-4 min-h-32"
            />
            <div className="mt-3 flex items-center">
              <span className="text-xs text-slate-500">
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
