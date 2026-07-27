"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import type { Post, PostReply } from "@/components/types";
import { usePremiumStatus } from "@/components/use-premium-status";
import { apiRequest } from "@/lib/api-client";
import {
  toSocialPost,
  type SocialPostRecord,
} from "@/lib/social-format";

export function useFeedData(onLogin: () => void) {
  const { user } = useAuth();
  const { status: premiumStatus } = usePremiumStatus(Boolean(user));
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<Record<string, PostReply[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const viewed = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{
        posts: SocialPostRecord[];
        likedPostIds: string[];
        bookmarkedPostIds: string[];
        repostedPostIds: string[];
      }>("/api/feed-posts");
      const liked = new Set(data.likedPostIds);
      const bookmarked = new Set(data.bookmarkedPostIds);
      const reposted = new Set(data.repostedPostIds);
      setPosts(
        data.posts.map((post) =>
          toSocialPost(post, {
            liked: liked.has(post.id),
            bookmarked: bookmarked.has(post.id),
            reposted: reposted.has(post.id),
          }),
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Feed could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts, user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    void apiRequest<{ isAdmin: boolean }>("/api/admin/me")
      .then((response) => {
        if (active) setIsAdmin(response.isAdmin);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const replacePost = useCallback((postId: string, patch: Partial<Post>) => {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    );
  }, []);

  const toggleLike = useCallback(async (post: Post) => {
    if (!user) return onLogin();
    const liked = !post.liked;
    const likes = Math.max(0, post.likes + (liked ? 1 : -1));
    replacePost(post.id, { liked, likes });
    try {
      const state = await apiRequest<{ liked: boolean; likes: number }>(
        `/api/posts/${post.id}/like`,
        { method: "POST" },
      );
      replacePost(post.id, state);
    } catch (nextError) {
      replacePost(post.id, { liked: post.liked, likes: post.likes });
      setError(nextError instanceof Error ? nextError.message : "Like could not be saved.");
    }
  }, [onLogin, replacePost, user]);

  const toggleBookmark = useCallback(async (post: Post) => {
    if (!user) return onLogin();
    const bookmarked = !post.bookmarked;
    replacePost(post.id, { bookmarked });
    try {
      const state = await apiRequest<{ bookmarked: boolean }>(
        `/api/posts/${post.id}/bookmark`,
        { method: "POST" },
      );
      replacePost(post.id, state);
    } catch (nextError) {
      replacePost(post.id, { bookmarked: post.bookmarked });
      setError(nextError instanceof Error ? nextError.message : "Bookmark could not be saved.");
    }
  }, [onLogin, replacePost, user]);

  const toggleRepost = useCallback(async (post: Post) => {
    if (!user) return onLogin();
    const reposted = !post.reposted;
    const reposts = Math.max(0, post.reposts + (reposted ? 1 : -1));
    replacePost(post.id, { reposted, reposts });
    try {
      const state = await apiRequest<{ reposted: boolean; reposts: number }>(
        `/api/posts/${post.id}/repost`,
        { method: "POST" },
      );
      replacePost(post.id, state);
    } catch (nextError) {
      replacePost(post.id, { reposted: post.reposted, reposts: post.reposts });
      setError(nextError instanceof Error ? nextError.message : "Repost could not be saved.");
    }
  }, [onLogin, replacePost, user]);

  const toggleReplies = useCallback(async (post: Post) => {
    if (openReplies === post.id) {
      setOpenReplies(null);
      return;
    }
    setOpenReplies(post.id);
    if (repliesByPost[post.id]) return;
    setLoadingReplies(post.id);
    try {
      const response = await apiRequest<{ replies: PostReply[] }>(
        `/api/posts/${post.id}/replies`,
      );
      setRepliesByPost((current) => ({ ...current, [post.id]: response.replies }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Replies could not be loaded.");
    } finally {
      setLoadingReplies(null);
    }
  }, [openReplies, repliesByPost]);

  const setReplyDraft = useCallback((postId: string, value: string) => {
    setReplyDrafts((current) => ({ ...current, [postId]: value }));
  }, []);

  const addReply = useCallback(async (post: Post) => {
    if (!user) return onLogin();
    const content = replyDrafts[post.id]?.trim();
    if (!content) return;

    const optimistic: PostReply = {
      id: `optimistic-${Date.now()}`,
      postId: post.id,
      userId: user.id,
      name: String(user.user_metadata.full_name ?? user.user_metadata.name ?? "You"),
      username: String(
        user.user_metadata.user_name ?? user.email?.split("@")[0] ?? "you",
      ),
      avatar:
        typeof user.user_metadata.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null,
      isVerified: premiumStatus.isVerified,
      content,
      createdAt: new Date().toISOString(),
    };

    setSavingReply(post.id);
    setReplyDraft(post.id, "");
    setRepliesByPost((current) => ({
      ...current,
      [post.id]: [...(current[post.id] || []), optimistic],
    }));
    replacePost(post.id, { replies: post.replies + 1 });

    try {
      const response = await apiRequest<{ reply: PostReply }>(
        `/api/posts/${post.id}/replies`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setRepliesByPost((current) => ({
        ...current,
        [post.id]: (current[post.id] || []).map((reply) =>
          reply.id === optimistic.id ? response.reply : reply,
        ),
      }));
    } catch (nextError) {
      setReplyDraft(post.id, content);
      setRepliesByPost((current) => ({
        ...current,
        [post.id]: (current[post.id] || []).filter(
          (reply) => reply.id !== optimistic.id,
        ),
      }));
      replacePost(post.id, { replies: Math.max(0, post.replies) });
      setError(nextError instanceof Error ? nextError.message : "Reply could not be sent.");
    } finally {
      setSavingReply(null);
    }
  }, [onLogin, premiumStatus.isVerified, replacePost, replyDrafts, setReplyDraft, user]);

  const updatePost = useCallback(async (post: Post, content: string) => {
    const previous = post.text;
    const trimmed = content.trim();
    if (!trimmed) return false;
    setActingId(post.id);
    replacePost(post.id, { text: trimmed });
    try {
      await apiRequest(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: trimmed }),
      });
      return true;
    } catch (nextError) {
      replacePost(post.id, { text: previous });
      setError(nextError instanceof Error ? nextError.message : "Post update failed.");
      return false;
    } finally {
      setActingId(null);
    }
  }, [replacePost]);

  const archivePost = useCallback(async (post: Post) => {
    if (!user) return onLogin();
    setActingId(post.id);
    try {
      await apiRequest("/api/post-actions", {
        method: "POST",
        body: JSON.stringify({ action: "archive", postId: post.id }),
      });
      setPosts((current) => current.filter((item) => item.id !== post.id));
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post could not be deleted.");
      return false;
    } finally {
      setActingId(null);
    }
  }, [onLogin, user]);

  const sharePost = useCallback(async (post: Post) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.name} - Tradox`, text: post.text.slice(0, 120), url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (nextError) {
      if (nextError instanceof Error && nextError.name === "AbortError") return;
      setError("Post link could not be shared.");
    }
  }, []);

  const recordView = useCallback((postId: string) => {
    if (!user || viewed.current.has(postId)) return;
    viewed.current.add(postId);
    void apiRequest<{ views?: number | null }>("/api/post-actions", {
      method: "POST",
      body: JSON.stringify({ action: "view", postId }),
    })
      .then((response) => {
        if (typeof response.views === "number") {
          replacePost(postId, { views: response.views });
        }
      })
      .catch(() => undefined);
  }, [replacePost, user]);

  const observePost = useCallback((node: HTMLElement | null, postId: string) => {
    if (!node || !user) return;
    if (!observer.current) {
      observer.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
              const id = entry.target.getAttribute("data-post-id");
              if (id) recordView(id);
            }
          });
        },
        { threshold: [0.55] },
      );
    }
    node.setAttribute("data-post-id", postId);
    observer.current.observe(node);
  }, [recordView, user]);

  useEffect(() => () => observer.current?.disconnect(), []);

  return {
    user,
    posts,
    loading,
    error,
    setError,
    isAdmin,
    actingId,
    openReplies,
    repliesByPost,
    replyDrafts,
    loadingReplies,
    savingReply,
    loadPosts,
    toggleLike,
    toggleBookmark,
    toggleRepost,
    toggleReplies,
    setReplyDraft,
    addReply,
    updatePost,
    archivePost,
    sharePost,
    observePost,
  };
}
