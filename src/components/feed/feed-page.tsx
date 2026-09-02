"use client";

import { Check, Flag, Newspaper, X } from "lucide-react";

import { SkeletonBlock, XSpinner } from "../app-loader";
import type { PostReply } from "../types";
import { MediaImage } from "../media-image";
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
import {
  POST_REPORT_NOTE_MAX,
  POST_REPORT_REASONS,
  isPostReportReason,
} from "@/lib/post-report";
import { MemoizedPostCard as PostCard } from "./post-card";

import { PostComposer } from "./post-composer";
import { useFeedData } from "./use-feed-data";

/**
 * Stable identity for the "no replies loaded yet" case, which is every post
 * until its thread is opened. A fresh `[]` literal here would be a new
 * reference on every render of this list, and PostCard's shallow `memo`
 * comparison would fail for every card - so one like would re-render the whole
 * feed instead of the single card that changed.
 */
const NO_REPLIES: PostReply[] = [];

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
            {feed.posts.length}
            {feed.nextCursor ? "+" : ""} posts
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
                replies={feed.repliesByPost[post.id] ?? NO_REPLIES}
                replyDraft={feed.replyDrafts[post.id] ?? ""}
                loadingReplies={feed.loadingReplies === post.id}
                savingReply={feed.savingReply === post.id}
                observePost={feed.observePost}
                onOpenProfile={feed.openProfile}
                onShare={feed.sharePost}
                onToggleBookmark={feed.toggleBookmark}
                onEdit={feed.openEditPost}
                onDelete={feed.openDeleteModal}
                onReport={feed.openReport}
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

            {feed.nextCursor ? (
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={feed.loadingMore}
                  onClick={() => void feed.loadMore()}
                >
                  {feed.loadingMore ? (
                    <>
                      <XSpinner size="sm" /> Loading
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {feed.lightboxUrl ? (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/95 p-4"
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
        open={Boolean(feed.reportTarget)}
        onOpenChange={(open) => {
          if (!open && !feed.reportingPost) feed.setReportTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {feed.reportDone ? (
            <>
              <DialogHeader>
                <DialogTitle>Thanks - report sent</DialogTitle>
                <DialogDescription>
                  A moderator will review this post. You won&apos;t hear back on
                  every report, but each one is looked at.
                </DialogDescription>
              </DialogHeader>
              <Button
                className="ml-auto"
                onClick={() => feed.setReportTarget(null)}
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report this post</DialogTitle>
                <DialogDescription>
                  Reports go to the moderators, not to the author. They will not
                  see who reported them.
                </DialogDescription>
              </DialogHeader>

              <fieldset className="space-y-1.5">
                <legend className="sr-only">Reason</legend>
                {POST_REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      feed.reportReason === reason.value
                        ? "border-white/25 bg-white/[.06] text-zinc-100"
                        : "border-border bg-transparent text-ink-soft hover:bg-white/[.03]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={reason.value}
                      checked={feed.reportReason === reason.value}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (isPostReportReason(next)) feed.setReportReason(next);
                      }}
                      className="size-3.5 accent-white"
                    />
                    {reason.label}
                  </label>
                ))}
              </fieldset>

              <Textarea
                value={feed.reportNote}
                onChange={(event) => feed.setReportNote(event.target.value)}
                maxLength={POST_REPORT_NOTE_MAX}
                placeholder="Anything else the moderator should know (optional)"
                className="min-h-20"
              />

              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-ink-mute">
                  {feed.reportNote.length}/{POST_REPORT_NOTE_MAX}
                </span>
                <Button
                  className="ml-auto"
                  disabled={feed.reportingPost}
                  onClick={() => void feed.submitReport()}
                >
                  {feed.reportingPost ? <XSpinner size="sm" /> : <Flag size={16} />}
                  Send report
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
