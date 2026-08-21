"use client";

import { Check, Newspaper, X } from "lucide-react";

import { SkeletonBlock, XSpinner } from "../app-loader";
import { MediaImage } from "../media-image";
import { SocialActions } from "../social-actions-v2";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Textarea } from "../ui/textarea";
import { MemoizedPostCard as PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import { useFeedData } from "./use-feed-data";

export type FeedPageProps = {
  onLogin: () => void;
};

function FeedSkeleton() {
  return (
    <div className="mt-3 space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/8 bg-surface px-3 py-4 sm:px-5 sm:py-5"
        >
          <div className="flex gap-3.5">
            <SkeletonBlock className="size-11 shrink-0 rounded-full sm:size-12" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
              <SkeletonBlock className="mt-3 h-11 w-full rounded-xl" />
              <SkeletonBlock className="mt-3 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-4/5" />
              <SkeletonBlock className="mt-3 aspect-[16/10] w-full rounded-xl" />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  <SkeletonBlock className="h-9 w-14 rounded-lg" />
                  <SkeletonBlock className="h-9 w-14 rounded-lg" />
                  <SkeletonBlock className="h-9 w-14 rounded-lg" />
                </div>
                <div className="flex gap-1">
                  <SkeletonBlock className="h-9 w-14 rounded-lg" />
                  <SkeletonBlock className="h-9 w-9 rounded-lg" />
                </div>
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
      <header className="sticky top-0 z-20 border-b border-white/8 bg-black/90 px-3 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight">Trade feed</h1>
            <p className="mt-0.5 text-[10px] text-ink-mute">
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
          <h2 className="text-xs font-semibold uppercase tracking-[.18em] text-ink-mute">
            Community tape
          </h2>
          <span className="ml-auto text-[10px] text-ink-subtle">
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
              <Empty className="rounded-2xl py-14">
                <EmptyHeader>
                  <EmptyMedia>
                    <Newspaper size={18} />
                  </EmptyMedia>
                  <EmptyTitle>No trades shared yet</EmptyTitle>
                  <EmptyDescription>
                    Reviewed trades your community shares will show up here.
                    Share one from your journal to start the tape.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
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

      <AlertDialog
        open={Boolean(feed.deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !feed.actingId) feed.setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. The post will be removed from the
              timeline and from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(
                feed.deleteTarget && feed.actingId === feed.deleteTarget.id,
              )}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-500"
              disabled={Boolean(
                feed.deleteTarget && feed.actingId === feed.deleteTarget.id,
              )}
              onClick={(event) => {
                event.preventDefault();
                void feed.archivePost();
              }}
            >
              {feed.deleteTarget && feed.actingId === feed.deleteTarget.id ? (
                <>
                  <XSpinner size="sm" /> Deleting
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(feed.editingPost)}
        onOpenChange={(open) => {
          if (!open) feed.setEditingPost(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
            <DialogDescription>
              Edits are visible to everyone who can see this post.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={feed.editingText}
            onChange={(event) => feed.setEditingText(event.target.value)}
            maxLength={280}
            className="min-h-32"
          />
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-ink-mute">
              {feed.editingText.length}/280
            </span>
            <Button
              className="ml-auto"
              disabled={
                !feed.editingText.trim() ||
                Boolean(
                  feed.editingPost && feed.actingId === feed.editingPost.id,
                )
              }
              onClick={() => void feed.savePostEdit()}
            >
              {feed.editingPost && feed.actingId === feed.editingPost.id ? (
                <XSpinner size="sm" />
              ) : (
                <Check size={16} />
              )}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
