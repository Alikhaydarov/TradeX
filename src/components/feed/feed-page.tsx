"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { SkeletonBlock, XSpinner } from "@/components/app-loader";
import { SocialActions } from "@/components/social-actions-v2";
import type { Post } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import { useFeedData } from "./use-feed-data";

export function FeedPage({ onLogin }: { onLogin: () => void }) {
  const feed = useFeedData(onLogin);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  useEffect(() => {
    if (!feed.posts.length) return;
    const postId = window.location.hash.startsWith("#post-")
      ? window.location.hash.slice(6)
      : "";
    if (!postId) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`post-${postId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [feed.posts]);

  useEffect(() => {
    if (!deleteTarget && !editingPost) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [deleteTarget, editingPost]);

  const beginEdit = (post: Post) => {
    setEditingPost(post);
    setEditingText(post.text);
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    const saved = await feed.updatePost(editingPost, editingText);
    if (saved) setEditingPost(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const deleted = await feed.archivePost(deleteTarget);
    if (deleted) setDeleteTarget(null);
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-black/92 px-3 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-white">Trade feed</h1>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              Verified execution reviews from the community
            </p>
          </div>
          <SocialActions className="lg:hidden" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-5 sm:py-5">
        <PostComposer onLogin={onLogin} onPublished={feed.loadPosts} />

        {feed.error ? (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
            <span className="min-w-0 flex-1">{feed.error}</span>
            <button
              type="button"
              onClick={() => feed.setError(null)}
              className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/6"
              aria-label="Dismiss error"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Community tape
          </h2>
          <span className="ml-auto text-[10px] text-zinc-600">
            {feed.posts.length} posts
          </span>
        </div>

        {feed.loading ? (
          <FeedSkeleton />
        ) : feed.posts.length ? (
          <div className="space-y-3">
            {feed.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={feed.user?.id}
                isAdmin={feed.isAdmin}
                acting={feed.actingId === post.id}
                repliesOpen={feed.openReplies === post.id}
                replies={feed.repliesByPost[post.id] || []}
                replyDraft={feed.replyDrafts[post.id] || ""}
                repliesLoading={feed.loadingReplies === post.id}
                replySaving={feed.savingReply === post.id}
                observe={(node) => feed.observePost(node, post.id)}
                onLike={() => void feed.toggleLike(post)}
                onBookmark={() => void feed.toggleBookmark(post)}
                onRepost={() => void feed.toggleRepost(post)}
                onToggleReplies={() => void feed.toggleReplies(post)}
                onReplyDraft={(value) => feed.setReplyDraft(post.id, value)}
                onReply={() => void feed.addReply(post)}
                onShare={() => void feed.sharePost(post)}
                onEdit={() => beginEdit(post)}
                onDelete={() => setDeleteTarget(post)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#090909] p-10 text-center text-sm text-zinc-600">
            No trades shared yet.
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[99999] grid place-items-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() =>
              feed.actingId === deleteTarget.id ? undefined : setDeleteTarget(null)
            }
            aria-label="Close delete dialog"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#090909] p-6 shadow-2xl"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
              <Trash2 className="size-4" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-white">Delete post?</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This removes the post from the timeline and the author profile.
            </p>
            <Button
              onClick={() => void confirmDelete()}
              disabled={feed.actingId === deleteTarget.id}
              className="mt-6 w-full bg-rose-500 text-white hover:bg-rose-400"
            >
              {feed.actingId === deleteTarget.id ? (
                <><XSpinner size="sm" /> Deleting</>
              ) : (
                "Delete"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={feed.actingId === deleteTarget.id}
              className="mt-2 w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {editingPost ? (
        <div className="fixed inset-0 z-[99999] grid place-items-center bg-black/80 p-3">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setEditingPost(null)}
            aria-label="Close edit dialog"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#090909] p-4 shadow-2xl sm:p-5">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-white">Edit post</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                onClick={() => setEditingPost(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Textarea
              autoFocus
              value={editingText}
              onChange={(event) => setEditingText(event.target.value)}
              maxLength={280}
              className="mt-4 min-h-32"
            />
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-zinc-600">{editingText.length}/280</span>
              <Button
                className="ml-auto"
                disabled={!editingText.trim() || feed.actingId === editingPost.id}
                onClick={() => void saveEdit()}
              >
                {feed.actingId === editingPost.id ? (
                  <XSpinner size="sm" />
                ) : (
                  <Check className="size-4" />
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

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/8 bg-[#090909] p-4 sm:p-5"
        >
          <div className="flex gap-3">
            <SkeletonBlock className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
              <SkeletonBlock className="mt-4 h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-4/5" />
              <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
