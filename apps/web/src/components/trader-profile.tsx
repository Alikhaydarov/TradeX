"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Eye,
  Heart,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Repeat2,
  Send,
  UserRoundPlus,
} from "lucide-react";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  trading_style: string | null;
  location: string | null;
  is_verified: boolean;
  created_at: string;
};
type Post = {
  id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  image_url?: string | null;
  symbol: string | null;
  side: string | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  views_count: number;
  created_at: string;
  liked: boolean;
  reposted: boolean;
};
type Reply = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string; username: string } | null;
};

async function fetchData<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Could not load trader profile.");
  return data as T;
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "T"
  );
}
function ago(value: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
  );
  return days < 1
    ? "today"
    : days < 30
      ? `${days}d ago`
      : new Intl.DateTimeFormat(undefined, {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(value));
}

export function TraderProfile({ username }: { username: string }) {
  const [tab, setTab] = useState<"posts" | "media">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activePostAction, setActivePostAction] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await fetchData<{
        profile: Profile;
        posts: Omit<Post, "liked" | "reposted">[];
        followers: number;
        following: number;
        isFollowing: boolean;
        isSelf: boolean;
        likedPostIds: string[];
        repostedPostIds: string[];
      }>(`/api/community/profile/${encodeURIComponent(username)}`);
      const liked = new Set(result.likedPostIds);
      const reposted = new Set(result.repostedPostIds);
      setProfile(result.profile);
      setPosts(
        result.posts.map((post) => ({
          ...post,
          liked: liked.has(post.id),
          reposted: reposted.has(post.id),
        })),
      );
      setFollowers(result.followers);
      setFollowing(result.following);
      setIsFollowing(result.isFollowing);
      setIsSelf(result.isSelf);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Trader profile could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [username]);
  useEffect(() => {
    void load();
  }, [load]);

  async function follow() {
    if (busy) return;
    setBusy(true);
    setError("");
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowers((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      const result = await fetchData<{
        isFollowing: boolean;
        followers: number;
      }>(`/api/community/profile/${encodeURIComponent(username)}/follow`, {
        method: "POST",
      });
      setIsFollowing(result.isFollowing);
      setFollowers(result.followers);
    } catch (cause) {
      setIsFollowing(!next);
      setFollowers((value) => Math.max(0, value + (next ? -1 : 1)));
      setError(
        cause instanceof Error ? cause.message : "Follow action failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function togglePostAction(post: Post, action: "like" | "repost") {
    if (activePostAction) return;
    setActivePostAction(`${post.id}:${action}`);
    const activeField = action === "like" ? "liked" : "reposted";
    const countField = action === "like" ? "likes_count" : "reposts_count";
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              [activeField]: !item[activeField],
              [countField]: Math.max(
                0,
                item[countField] + (item[activeField] ? -1 : 1),
              ),
            }
          : item,
      ),
    );
    try {
      const result = await fetchData<{ active: boolean; count: number }>(
        `/api/community/${post.id}`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                [activeField]: result.active,
                [countField]: result.count,
              }
            : item,
        ),
      );
    } catch (cause) {
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                [activeField]: post[activeField],
                [countField]: post[countField],
              }
            : item,
        ),
      );
      setError(
        cause instanceof Error
          ? cause.message
          : "Post reaction could not be saved.",
      );
    } finally {
      setActivePostAction(null);
    }
  }

  async function togglePostReplies(postId: string) {
    if (openReplies === postId) {
      setOpenReplies(null);
      return;
    }
    setOpenReplies(postId);
    if (replies[postId]) return;
    try {
      const result = await fetchData<{ replies: Reply[] }>(
        `/api/community/${postId}/replies`,
      );
      setReplies((current) => ({ ...current, [postId]: result.replies }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Replies could not be loaded.",
      );
    }
  }

  async function sendPostReply(postId: string) {
    const content = (replyDrafts[postId] ?? "").trim();
    if (!content || activePostAction) return;
    setActivePostAction(`${postId}:reply`);
    try {
      const result = await fetchData<{ reply: Reply }>(
        `/api/community/${postId}/replies`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setReplies((current) => ({
        ...current,
        [postId]: [...(current[postId] ?? []), result.reply],
      }));
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, replies_count: post.replies_count + 1 }
            : post,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [postId]: "" }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Reply could not be sent.",
      );
    } finally {
      setActivePostAction(null);
    }
  }

  if (loading)
    return (
      <div className="profile-loading">
        <LoaderCircle className="animate-spin" size={18} />
        Loading trader
      </div>
    );
  if (!profile)
    return (
      <div className="profile-not-found">
        <h1>Trader not found</h1>
        <p>{error || "This profile may have been removed."}</p>
        <Link href="/community">Back to community</Link>
      </div>
    );
  const joined = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(profile.created_at));
  const visiblePosts =
    tab === "media" ? posts.filter((post) => post.image_url) : posts;
  return (
    <div className="trader-profile">
      <Link href="/community" className="profile-back">
        <ArrowLeft size={16} />
        Back to community
      </Link>
      {error && (
        <div role="alert" className="trade-error">
          {error}
        </div>
      )}
      <section className="trader-profile-card">
        <div className="trader-profile-cover">
          <span>TRADOXY / TRADER PROFILE</span>
        </div>
        <div className="trader-profile-content">
          <div className="trader-profile-top">
            <div className="trader-profile-avatar">
              {profile.avatar_url?.startsWith("http") ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={90}
                  height={90}
                  unoptimized
                />
              ) : (
                initials(profile.full_name)
              )}
            </div>
            {isSelf ? (
              <Link href="/settings/profile" className="profile-follow-button">
                Edit profile
              </Link>
            ) : (
              <button
                type="button"
                className={
                  "profile-follow-button" + (isFollowing ? " following" : "")
                }
                onClick={() => void follow()}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <UserRoundPlus size={15} />
                )}{" "}
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
          <h1>
            {profile.full_name}
            {profile.is_verified && (
              <BadgeCheck
                className="profile-verified-icon"
                size={20}
                aria-label="Verified"
              />
            )}
          </h1>
          <p className="profile-username">@{profile.username}</p>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-meta">
            {profile.trading_style && <span>{profile.trading_style}</span>}
            {profile.location && (
              <span>
                <MapPin size={13} />
                {profile.location}
              </span>
            )}
            <span>
              <CalendarDays size={13} />
              Joined {joined}
            </span>
          </div>
          <div className="profile-counts">
            <span>
              <strong>{following}</strong> Following
            </span>
            <span>
              <strong>{followers}</strong> Followers
            </span>
          </div>
        </div>
      </section>
      <div className="profile-content-tabs" aria-label="Profile posts">
        {(["posts", "media"] as const).map((view) => (
          <button
            key={view}
            aria-pressed={tab === view}
            onClick={() => setTab(view)}
          >
            {view === "posts" ? "Posts" : "Media"}
            <span>
              {view === "posts"
                ? posts.length
                : posts.filter((post) => post.image_url).length}
            </span>
          </button>
        ))}
      </div>
      {visiblePosts.length ? (
        <div className="community-list">
          {visiblePosts.map((post) => (
            <article
              className="community-post"
              key={post.id}
              id={"post-" + post.id}
            >
              <div className="community-post-avatar">
                {profile.avatar_url?.startsWith("http") ? (
                  <Image
                    src={profile.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                  />
                ) : (
                  initials(profile.full_name)
                )}
              </div>
              <div className="community-post-content">
                <div className="community-post-byline">
                  <strong>{profile.full_name}</strong>
                  {profile.is_verified && (
                    <BadgeCheck size={13} className="profile-verified-icon" />
                  )}
                  <span>@{profile.username}</span>
                  <time dateTime={post.created_at}>
                    · {ago(post.created_at)}
                  </time>
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
                      <span
                        className={
                          post.side === "LONG" ? "is-long" : "is-short"
                        }
                      >
                        {post.side}
                      </span>
                    )}
                  </div>
                )}
                <div className="community-actions">
                  <button
                    type="button"
                    className={openReplies === post.id ? "is-active" : ""}
                    onClick={() => void togglePostReplies(post.id)}
                    aria-label="Replies"
                  >
                    <MessageCircle size={18} />
                    <span>{post.replies_count}</span>
                  </button>
                  <button
                    type="button"
                    className={post.reposted ? "is-reposted" : ""}
                    onClick={() => void togglePostAction(post, "repost")}
                    disabled={Boolean(activePostAction)}
                    aria-label="Repost"
                    aria-pressed={post.reposted}
                  >
                    <Repeat2 size={18} />
                    <span>{post.reposts_count}</span>
                  </button>
                  <button
                    type="button"
                    className={post.liked ? "is-liked" : ""}
                    onClick={() => void togglePostAction(post, "like")}
                    disabled={Boolean(activePostAction)}
                    aria-label="Like"
                    aria-pressed={post.liked}
                  >
                    <Heart
                      size={18}
                      fill={post.liked ? "currentColor" : "none"}
                    />
                    <span>{post.likes_count}</span>
                  </button>
                  <span className="community-views" title="Views">
                    <Eye size={17} />
                    {post.views_count ?? 0}
                  </span>
                </div>
                {openReplies === post.id && (
                  <section className="community-replies" aria-label="Replies">
                    <div className="community-reply-list">
                      {(replies[post.id] ?? []).map((reply) => (
                        <article className="community-reply" key={reply.id}>
                          <div className="community-reply-avatar">
                            {initials(reply.author?.full_name ?? "Trader")}
                          </div>
                          <div>
                            <div className="community-post-byline">
                              <strong>
                                {reply.author?.full_name ?? "Trader"}
                              </strong>
                              <span>@{reply.author?.username ?? "trader"}</span>
                              <time>{ago(reply.created_at)}</time>
                            </div>
                            <p>{reply.content}</p>
                          </div>
                        </article>
                      ))}
                      {!replies[post.id]?.length && (
                        <p className="community-no-replies">
                          Be the first to reply.
                        </p>
                      )}
                    </div>
                    <form
                      className="community-reply-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void sendPostReply(post.id);
                      }}
                    >
                      <input
                        aria-label="Write a reply"
                        value={replyDrafts[post.id] ?? ""}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [post.id]: event.target.value,
                          }))
                        }
                        maxLength={280}
                        placeholder="Write a reply"
                      />
                      <button
                        type="submit"
                        disabled={
                          !(replyDrafts[post.id] ?? "").trim() ||
                          activePostAction === post.id + ":reply"
                        }
                        aria-label="Send reply"
                      >
                        {activePostAction === post.id + ":reply" ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                      </button>
                    </form>
                  </section>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="community-empty">
          <MessageCircle size={24} />
          <h2>
            {tab === "media"
              ? "No media shared yet."
              : "Every trader starts somewhere."}
          </h2>
          <p>
            {tab === "media"
              ? "Charts and screenshots shared by this trader will appear here."
              : "Trading notes shared by this trader will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
