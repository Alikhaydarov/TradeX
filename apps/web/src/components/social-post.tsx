"use client";

import Image from "next/image";
import {
  Check,
  Eye,
  Heart,
  Link2,
  LoaderCircle,
  MessageCircle,
  Repeat2,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { clientApi } from "@/lib/client-api";
import {
  reactionPatch,
  replyOptions,
  updatePost,
  type SocialPost as Post,
  type SocialReply,
  type TraderProfileData,
} from "@/lib/social-data";
import { ProfileLink } from "./profile-link";
import { useWorkspaceUser } from "./app-shell";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const number = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
function timeAgo(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  return minutes < 1
    ? "now"
    : minutes < 60
      ? `${minutes}m`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h`
        : new Date(value).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
}

function Reaction({
  post,
  action,
  onError,
}: {
  post: Post;
  action: "like" | "repost";
  onError: (error: string) => void;
}) {
  const client = useQueryClient();
  const mutationKey = ["reaction", post.id, action];
  const pending = useIsMutating({ mutationKey }) > 0;
  const active = action === "like" ? post.liked : post.reposted;
  const count = action === "like" ? post.likes_count : post.reposts_count;
  const mutation = useMutation({
    mutationKey,
    mutationFn: (next: boolean) =>
      clientApi<{ active: boolean; count: number | null }>(
        `/api/community/${post.id}`,
        { method: "POST", body: JSON.stringify({ action, active: next }) },
      ),
    onMutate: async (next) => {
      onError("");
      await client.cancelQueries({ queryKey: ["social"] });
      updatePost(client, post.id, (item) => reactionPatch(item, action, next));
      return { active, count };
    },
    onSuccess: (result) => {
      updatePost(client, post.id, (item) =>
        reactionPatch(item, action, result.active, result.count),
      );
      if (action === "repost") {
        client.setQueriesData<TraderProfileData>(
          {
            queryKey: ["social", "profile"],
            predicate: (query) =>
              query.queryKey[3] === "reposts" &&
              Boolean(
                (query.state.data as TraderProfileData | undefined)?.isSelf,
              ),
          },
          (current) => {
            if (!current) return current;
            return {
              ...current,
              posts: result.active
                ? current.posts.some((item) => item.id === post.id)
                  ? current.posts
                  : [
                      reactionPatch(post, action, true, result.count),
                      ...current.posts,
                    ]
                : current.posts.filter((item) => item.id !== post.id),
            };
          },
        );
      }
    },
    onError: (error, _next, previous) => {
      if (previous)
        updatePost(client, post.id, (item) =>
          reactionPatch(item, action, previous.active, previous.count),
        );
      onError(error.message);
    },
  });
  return (
    <button
      type="button"
      className={active ? (action === "like" ? "is-liked" : "is-reposted") : ""}
      aria-label={action === "like" ? "Like" : "Repost"}
      aria-pressed={Boolean(active)}
      aria-busy={pending}
      disabled={pending}
      onClick={() => {
        if (!client.isMutating({ mutationKey })) mutation.mutate(!active);
      }}
    >
      {action === "like" ? (
        <Heart size={18} fill={active ? "currentColor" : "none"} />
      ) : (
        <Repeat2 size={18} />
      )}
      <span>{number.format(count)}</span>
    </button>
  );
}

function Replies({ postId, open }: { postId: string; open: boolean }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const replies = useQuery({ ...replyOptions(postId), enabled: open });
  const mutation = useMutation({
    mutationKey: ["reply", postId],
    onMutate: () =>
      client.cancelQueries({ queryKey: replyOptions(postId).queryKey }),
    mutationFn: (content: string) =>
      clientApi<{ reply: SocialReply }>(`/api/community/${postId}/replies`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: ({ reply }) => {
      client.setQueryData(replyOptions(postId).queryKey, (current) => ({
        replies: [
          ...(current?.replies ?? []).filter((item) => item.id !== reply.id),
          reply,
        ],
      }));
      updatePost(client, postId, (post) => ({
        ...post,
        replies_count: post.replies_count + 1,
      }));
      setDraft("");
    },
  });
  return (
    <section className="community-replies" aria-label="Replies" hidden={!open}>
      <div className="community-reply-list" aria-busy={replies.isPending}>
        {replies.isPending ? (
          <p className="community-no-replies" role="status">
            <LoaderCircle size={14} className="animate-spin" /> Loading replies
          </p>
        ) : replies.isError ? (
          <p role="alert">
            {replies.error.message}{" "}
            <button type="button" onClick={() => void replies.refetch()}>
              Retry
            </button>
          </p>
        ) : !replies.data.replies.length ? (
          <p className="community-no-replies">Be the first to reply.</p>
        ) : (
          replies.data.replies.map((reply) => (
            <article className="community-reply" key={reply.id}>
              <div className="community-reply-avatar">
                {initials(reply.author?.full_name || "Trader")}
              </div>
              <div>
                <div className="community-post-byline">
                  {reply.author?.username ? (
                    <ProfileLink
                      username={reply.author.username}
                      className="community-author"
                    >
                      {reply.author.full_name || reply.author.username}
                    </ProfileLink>
                  ) : (
                    <strong>Trader</strong>
                  )}
                  <time dateTime={reply.created_at}>
                    {timeAgo(reply.created_at)}
                  </time>
                </div>
                <p>{reply.content}</p>
              </div>
            </article>
          ))
        )}
      </div>
      {mutation.isError && (
        <p role="alert" className="community-action-error">
          {mutation.error.message}
        </p>
      )}
      <form
        className="community-reply-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim() && !mutation.isPending && replies.isSuccess)
            mutation.mutate(draft.trim());
        }}
      >
        <input
          aria-label="Write a reply"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={280}
          placeholder="Write a reply"
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          disabled={
            !draft.trim() ||
            mutation.isPending ||
            replies.isPending ||
            replies.isError
          }
          aria-label="Send reply"
        >
          {mutation.isPending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </button>
      </form>
    </section>
  );
}

export function SocialPost({ post }: { post: Post }) {
  const client = useQueryClient();
  const viewer = useWorkspaceUser();
  const element = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [repliesMounted, setRepliesMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = element.current;
    if (
      !node ||
      !viewer?.id ||
      viewer.id === post.user_id ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const key = `tradoxy:viewed:${viewer.id}:${post.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* Database deduplication still applies without storage. */
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let recorded = false;
    let pending = false;
    const observer = new IntersectionObserver(
      (entries) => {
        clearTimeout(timer);
        if (
          !entries[0]?.isIntersecting ||
          entries[0].intersectionRatio < 0.6 ||
          recorded ||
          pending
        )
          return;
        timer = setTimeout(() => {
          if (document.visibilityState !== "visible") return;
          pending = true;
          void clientApi<{ counted: boolean }>(`/api/community/${post.id}`, {
            method: "POST",
            body: JSON.stringify({ action: "view" }),
          })
            .then((result) => {
              recorded = true;
              try {
                sessionStorage.setItem(key, "1");
              } catch {
                /* Storage is optional. */
              }
              if (result.counted)
                updatePost(client, post.id, (item) => ({
                  ...item,
                  views_count: item.views_count + 1,
                }));
              observer.disconnect();
            })
            .catch(() => {
              pending = false;
            });
        }, 1000);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [client, post.id, post.user_id, viewer?.id]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  async function share() {
    try {
      const url = `${window.location.origin}/community?post=${encodeURIComponent(post.id)}#post-${post.id}`;
      if (navigator.share)
        await navigator.share({ title: `${post.author_name} on Tradoxy`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError("Could not share this link. Please try again.");
    }
  }
  return (
    <article
      ref={element}
      className="community-post"
      id={`post-${post.id}`}
      data-post-id={post.id}
    >
      <ProfileLink
        username={post.author_handle}
        className="community-post-avatar"
        aria-label={`${post.author_name}'s profile`}
      >
        {post.author_avatar?.startsWith("http") ? (
          <Image
            src={post.author_avatar}
            alt=""
            width={36}
            height={36}
            unoptimized
          />
        ) : (
          initials(post.author_name || "Trader")
        )}
      </ProfileLink>
      <div className="community-post-content">
        <div className="community-post-byline">
          <ProfileLink
            username={post.author_handle}
            className="community-author"
          >
            {post.author_name}
          </ProfileLink>
          <span>@{post.author_handle}</span>
          <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
        </div>
        <p className="community-post-text">{post.content}</p>
        {post.image_url && (
          <a
            className="community-post-image"
            href={post.image_url}
            target="_blank"
            rel="noreferrer"
          >
            <Image
              src={post.image_url}
              alt="Post attachment"
              width={760}
              height={520}
              unoptimized
            />
          </a>
        )}
        {post.symbol && (
          <div className="community-trade-tag">
            <strong>{post.symbol}</strong>
            {post.side && (
              <span className={post.side === "LONG" ? "is-long" : "is-short"}>
                {post.side}
              </span>
            )}
          </div>
        )}
        <div className="community-actions">
          <button
            type="button"
            className={open ? "is-active" : ""}
            onClick={() => {
              setRepliesMounted(true);
              setOpen((value) => !value);
            }}
            aria-expanded={open}
            aria-label={`Reply to ${post.author_name}`}
          >
            <MessageCircle size={18} />
            <span>{number.format(post.replies_count)}</span>
          </button>
          <Reaction post={post} action="repost" onError={setError} />
          <Reaction post={post} action="like" onError={setError} />
          <span className="community-views" title={`${post.views_count} views`}>
            <Eye size={17} />
            <span>{number.format(post.views_count)}</span>
          </span>
          <button
            type="button"
            aria-label={copied ? "Link copied" : "Share post"}
            title={copied ? "Link copied" : "Share post"}
            onClick={() => void share()}
          >
            {copied ? <Check size={17} /> : <Link2 size={17} />}
          </button>
        </div>
        {error && (
          <p role="alert" className="community-action-error">
            {error}
          </p>
        )}
        {repliesMounted && <Replies postId={post.id} open={open} />}
      </div>
    </article>
  );
}
