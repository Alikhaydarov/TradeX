"use client";

import { Bookmark, Check, Eye, Heart, ImageIcon, MessageCircle, Pencil, Repeat2, Send, Share2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonBlock, XSpinner } from "./app-loader";
import { SocialActions } from "./social-actions-v2";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { Post, PostReply } from "./types";

interface PostRecord {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  author_is_verified?: boolean | null;
  image_url?: string | null;
  symbol: string | null;
  side: "LONG" | "SHORT" | null;
  entry_price: string | null;
  target_price: string | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  views_count?: number | null;
  created_at: string;
}

function FeedSkeleton() {
  return (
    <div className="mt-3 overflow-hidden rounded-[28px] border border-white/10 bg-white/[.025] backdrop-blur-2xl">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-b border-white/8 p-4 last:border-b-0 sm:p-5">
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

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function formatFeedTime(value: string | Date | number) {
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "hozir";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  return `${weeks}w`;
}

function toPost(record: PostRecord, liked = false, bookmarked = false, reposted = false): Post {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.slice(0, 2).toUpperCase(),
    time: formatFeedTime(record.created_at),
    text: record.content,
    imageUrl: record.image_url ?? null,
    symbol: record.symbol ?? undefined,
    side: record.side ?? undefined,
    price: record.entry_price ?? undefined,
    target: record.target_price ?? undefined,
    likes: record.likes_count,
    replies: record.replies_count,
    reposts: record.reposts_count,
    views: record.views_count ?? 0,
    liked,
    bookmarked,
    reposted,
    isVerified: Boolean(record.author_is_verified),
  };
}

function replyTime(value: string) {
  return formatFeedTime(value);
}

export function FeedV3({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<Record<string, PostReply[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewed = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userName = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Trader");
  const userAvatar = typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const stats = useMemo(() => ({
    posts: posts.length,
    views: posts.reduce((sum, post) => sum + post.views, 0),
  }), [posts]);

  const loadPosts = () => {
    setLoading(true);
    setError(null);
    apiRequest<{ posts: PostRecord[]; likedPostIds: string[]; bookmarkedPostIds: string[]; repostedPostIds: string[] }>("/api/feed-posts")
      .then((data) => {
        const liked = new Set(data.likedPostIds);
        const bookmarked = new Set(data.bookmarkedPostIds);
        const reposted = new Set(data.repostedPostIds);
        setPosts(data.posts.map((post) => toPost(post, liked.has(post.id), bookmarked.has(post.id), reposted.has(post.id))));
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    apiRequest<{ isAdmin: boolean }>("/api/admin/me")
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

  useEffect(() => {
    if (!deleteTarget) return;

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [deleteTarget]);

  const recordView = (postId: string) => {
    if (!user || viewed.current.has(postId)) return;
    viewed.current.add(postId);
    void apiRequest<{ success: boolean; counted?: boolean }>("/api/post-actions", {
      method: "POST",
      body: JSON.stringify({ action: "view", postId }),
    })
      .then((response) => {
        if (response.counted === false) return;
        setPosts((current) => current.map((post) => post.id === postId ? { ...post, views: post.views + 1 } : post));
      })
      .catch(() => undefined);
  };

  const observePost = (node: HTMLElement | null, postId: string) => {
    if (!node || !user) return;
    if (!observer.current) {
      observer.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const id = entry.target.getAttribute("data-post-id");
            if (id) recordView(id);
          }
        });
      }, { threshold: [0.55] });
    }
    node.setAttribute("data-post-id", postId);
    observer.current.observe(node);
  };

  useEffect(() => {
    return () => observer.current?.disconnect();
  }, []);

  const uploadImage = async (file: File | undefined) => {
    if (!user) return onLogin();
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/posts/image", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Rasm yuklanmadi.");
      setImageUrl(payload.imageUrl);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Rasm yuklanmadi.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addPost = async () => {
    if (!user) return onLogin();
    if (!text.trim() && !imageUrl) return;

    setSaving(true);
    setError(null);
    try {
      const { post } = await apiRequest<{ post: PostRecord }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content: text.trim(), imageUrl }),
      });
      setPosts((current) => [toPost(post), ...current]);
      setText("");
      setImageUrl(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return onLogin();
    const optimisticLiked = !post.liked;
    const optimisticLikes = Math.max(0, post.likes + (optimisticLiked ? 1 : -1));
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: optimisticLiked, likes: optimisticLikes } : item));
    try {
      const state = await apiRequest<{ liked: boolean; likes: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...state } : item));
    } catch (nextError) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: post.liked, likes: post.likes } : item));
      setError(nextError instanceof Error ? nextError.message : "Like saqlanmadi.");
    }
  };

  const toggleBookmark = async (post: Post) => {
    if (!user) return onLogin();
    const bookmarked = !post.bookmarked;
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, bookmarked } : item));
    try {
      const state = await apiRequest<{ bookmarked: boolean }>(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, bookmarked: state.bookmarked } : item));
    } catch (nextError) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, bookmarked: post.bookmarked } : item));
      setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi.");
    }
  };

  const toggleRepost = async (post: Post) => {
    if (!user) return onLogin();
    const reposted = !post.reposted;
    const reposts = Math.max(0, post.reposts + (reposted ? 1 : -1));
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, reposted, reposts } : item));
    try {
      const state = await apiRequest<{ reposted: boolean; reposts: number }>(`/api/posts/${post.id}/repost`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...state } : item));
    } catch (nextError) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, reposted: post.reposted, reposts: post.reposts } : item));
      setError(nextError instanceof Error ? nextError.message : "Repost saqlanmadi.");
    }
  };

  const openEditPost = (post: Post) => {
    setEditingPost(post);
    setEditingText(post.text);
  };

  const savePostEdit = async () => {
    if (!editingPost || !editingText.trim()) return;
    const previous = editingPost.text;
    const content = editingText.trim();
    setActingId(editingPost.id);
    setPosts((current) => current.map((item) => item.id === editingPost.id ? { ...item, text: content } : item));
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, { method: "PATCH", body: JSON.stringify({ content }) });
      setEditingPost(null);
    } catch (nextError) {
      setPosts((current) => current.map((item) => item.id === editingPost.id ? { ...item, text: previous } : item));
      setError(nextError instanceof Error ? nextError.message : "Post update failed.");
    } finally {
      setActingId(null);
    }
  };

  const toggleReplies = async (post: Post) => {
    if (openReplies === post.id) {
      setOpenReplies(null);
      return;
    }

    setOpenReplies(post.id);
    if (repliesByPost[post.id]) return;

    setLoadingReplies(post.id);
    setError(null);
    try {
      const { replies } = await apiRequest<{ replies: PostReply[] }>(`/api/posts/${post.id}/replies`);
      setRepliesByPost((current) => ({ ...current, [post.id]: replies }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Javoblar yuklanmadi.");
    } finally {
      setLoadingReplies(null);
    }
  };

  const addReply = async (post: Post) => {
    if (!user) return onLogin();
    const content = replyDrafts[post.id]?.trim();
    if (!content) return;

    const optimisticReply: PostReply = {
      id: `optimistic-${Date.now()}`,
      postId: post.id,
      userId: user.id,
      name: String(user.user_metadata.full_name ?? user.user_metadata.name ?? "You"),
      username: String(user.user_metadata.user_name ?? user.email?.split("@")[0] ?? "you"),
      avatar: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      isVerified: false,
      content,
      createdAt: new Date().toISOString(),
    };

    setSavingReply(post.id);
    setError(null);
    setReplyDrafts((current) => ({ ...current, [post.id]: "" }));
    setRepliesByPost((current) => ({ ...current, [post.id]: [...(current[post.id] ?? []), optimisticReply] }));
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, replies: item.replies + 1 } : item));
    try {
      const { reply } = await apiRequest<{ reply: PostReply }>(`/api/posts/${post.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setRepliesByPost((current) => ({
        ...current,
        [post.id]: (current[post.id] ?? []).map((item) => item.id === optimisticReply.id ? reply : item),
      }));
    } catch (nextError) {
      setReplyDrafts((current) => ({ ...current, [post.id]: content }));
      setRepliesByPost((current) => ({ ...current, [post.id]: (current[post.id] ?? []).filter((item) => item.id !== optimisticReply.id) }));
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, replies: Math.max(0, item.replies - 1) } : item));
      setError(nextError instanceof Error ? nextError.message : "Javob yuborilmadi.");
    } finally {
      setSavingReply(null);
    }
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.name} - TradeWay`, text: post.text.slice(0, 120), url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (nextError) {
      if (nextError instanceof Error && nextError.name === "AbortError") return;
      setError("Post havolasini ulashib bo'lmadi.");
    }
  };

  const openDeleteModal = (post: Post) => {
    if (!user) return onLogin();
    setDeleteTarget(post);
  };

  const archivePost = async () => {
    if (!user || !deleteTarget) return;

    setActingId(deleteTarget.id);
    setError(null);
    try {
      await apiRequest<{ success: boolean }>("/api/post-actions", {
        method: "POST",
        body: JSON.stringify({ action: "archive", postId: deleteTarget.id }),
      });
      setPosts((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post o'chirilmadi. Faqat muallif yoki katta admin o'chira oladi.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#171717]/90 px-3 py-3 backdrop-blur-2xl sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-zinc-300/70">TradeWay workspace</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">TradeWay</h1>
          </div>
          <SocialActions className="lg:hidden" />
        </div>
      </header>

      {error ? <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-xl">{error}</div> : null}

      <div className="mx-auto max-w-3xl px-0 py-2 sm:px-5 sm:py-4">
        <section className="border-y border-white/10 bg-white/[.045] p-3 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl sm:rounded-[24px] sm:border sm:p-4">
          <div className="flex gap-3">
            <TraderAvatar name={userName} value={userAvatar} className="h-11 w-11 shrink-0 text-xs" />
            <div className="min-w-0 flex-1">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={280}
                placeholder="Nima bo'lyapti?"
                className="min-h-16 resize-none border-0 bg-transparent px-0 text-base shadow-none placeholder:text-slate-500 focus-visible:ring-0 sm:min-h-24"
              />

              {imageUrl ? (
                <div className="relative mt-3 flex max-h-[320px] min-h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 sm:max-h-[420px] sm:min-h-40 sm:rounded-3xl">
                  <img src={imageUrl} alt="Post rasmi" className="max-h-[320px] max-w-full object-contain object-center sm:max-h-[420px]" />
                  <button onClick={() => setImageUrl(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur-xl" aria-label="Rasmni olib tashlash">
                    <X size={17} />
                  </button>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-zinc-300 hover:bg-white/[.06] disabled:opacity-60">
                  {uploadingImage ? <XSpinner size="sm" /> : <ImageIcon size={16} />} Rasm
                </button>
                <span className="ml-auto text-[10px] text-slate-500">{text.length}/280</span>
                <Button onClick={() => void addPost()} disabled={(!text.trim() && !imageUrl) || saving} className="rounded-xl bg-white text-black px-4 text-white">
                  {saving ? <XSpinner size="sm" /> : <Send size={15} />} Ulashish
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex items-center gap-2 px-3 sm:mt-5 sm:px-1">
          <h2 className="text-sm font-bold">Community oqimi</h2>
          <span className="text-[10px] text-slate-500">{stats.posts} post Â· {formatCount(stats.views)} views</span>
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : (
          <div className="mt-3 overflow-hidden border-y border-white/10 bg-white/[.025] backdrop-blur-2xl sm:rounded-[24px] sm:border">
            {posts.map((post) => (
              <article
                key={post.id}
                id={`post-${post.id}`}
                ref={(node) => observePost(node, post.id)}
                className="border-b border-white/8 p-3 last:border-b-0 sm:p-5"
              >
                <div className="flex gap-3">
                  <TraderAvatar name={post.name} value={post.avatar} className="h-11 w-11 shrink-0 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-sm font-bold">
                          {post.name}
                          {post.isVerified && <VerifiedBadge size={14} />}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{post.handle} Â· {post.time}</p>
                      </div>
                      {(post.userId === user?.id || isAdmin) ? <div className="flex items-center">
                        {post.userId === user?.id ? <button onClick={() => openEditPost(post)} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06] hover:text-white" aria-label="Edit post"><Pencil size={15} /></button> : null}
                        <button onClick={() => openDeleteModal(post)} disabled={actingId === post.id} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-rose-400/10 hover:text-rose-200" aria-label="Delete post">
                          {actingId === post.id ? <XSpinner size="sm" /> : <Trash2 size={16} />}
                        </button>
                      </div> : null}
                    </div>

                    {post.text ? <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-slate-100">{post.text}</p> : null}

                    {post.imageUrl ? (
                      <div className="mt-3 flex max-h-[420px] min-h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 sm:max-h-[560px] sm:min-h-40 sm:rounded-[24px]">
                        <img src={post.imageUrl} alt="Post rasmi" className="max-h-[420px] max-w-full object-contain object-center sm:max-h-[560px]" loading="lazy" />
                      </div>
                    ) : null}

                    {post.symbol ? (
                      <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-3">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm">{post.symbol}</strong>
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${post.side === "LONG" ? "bg-emerald-300/10 text-emerald-300" : "bg-rose-300/10 text-rose-300"}`}>{post.side}</span>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-5 items-center gap-1 text-slate-500 sm:flex sm:gap-4">
                      <button onClick={() => void toggleReplies(post)} className={`flex items-center gap-1.5 text-[11px] hover:text-zinc-300 ${openReplies === post.id ? "text-zinc-300" : ""}`} aria-label="Javoblar"><MessageCircle size={16} />{post.replies}</button>
                      <button onClick={() => void toggleRepost(post)} className={`flex items-center gap-1.5 text-[11px] hover:text-emerald-200 ${post.reposted ? "text-emerald-300" : ""}`} aria-label="Repost"><Repeat2 size={16} />{post.reposts}</button>
                      <button onClick={() => void toggleLike(post)} className={`flex items-center gap-1.5 text-[11px] hover:text-white ${post.liked ? "text-rose-300" : ""}`}><Heart size={16} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
                      <span className="hidden items-center gap-1.5 text-[11px] sm:flex"><Eye size={16} />{formatCount(post.views)}</span>
                      <button onClick={() => void sharePost(post)} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white/[.05] hover:text-white" aria-label="Ulashish"><Share2 size={16} /></button>
                      <button onClick={() => void toggleBookmark(post)} className={`ml-auto grid h-8 w-8 place-items-center rounded-xl hover:bg-white/[.05] ${post.bookmarked ? "text-zinc-300" : "hover:text-white"}`} aria-label="Saqlash"><Bookmark size={16} fill={post.bookmarked ? "currentColor" : "none"} /></button>
                    </div>

                    {openReplies === post.id ? (
                      <div className="mt-4 border-t border-white/8 pt-4">
                        {loadingReplies === post.id ? (
                          <div className="flex items-center gap-2 py-4 text-xs text-slate-500"><XSpinner size="sm" /> Javoblar yuklanmoqda</div>
                        ) : (
                          <div className="space-y-3">
                            {(repliesByPost[post.id] ?? []).map((reply) => (
                              <div key={reply.id} className="flex gap-2.5 rounded-2xl bg-white/[.025] p-3">
                                <TraderAvatar name={reply.name} value={reply.avatar} className="h-8 w-8 shrink-0 text-[10px]" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="truncate text-xs">{reply.name}</strong>
                                    {reply.isVerified ? <VerifiedBadge size={13} /> : null}
                                    <span className="text-[10px] text-slate-600">@{reply.username} Â· {replyTime(reply.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-300">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                            {!repliesByPost[post.id]?.length ? <p className="py-2 text-xs text-slate-500">Hali javob yo&apos;q. Birinchi bo&apos;lib fikr bildiring.</p> : null}
                          </div>
                        )}

                        <div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/8 bg-black/10 p-2 focus-within:border-white/20">
                          <Textarea
                            value={replyDrafts[post.id] ?? ""}
                            onChange={(event) => setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                            maxLength={280}
                            placeholder="Javob yozing..."
                            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                          />
                          <Button onClick={() => void addReply(post)} disabled={!replyDrafts[post.id]?.trim() || savingReply === post.id} size="icon-sm" className="h-9 w-9 shrink-0 rounded-xl bg-white text-slate-950 hover:bg-white" aria-label="Javob yuborish">
                            {savingReply === post.id ? <XSpinner size="sm" /> : <Send size={14} />}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}

            {!posts.length ? <div className="p-10 text-center text-sm text-slate-500">Hali post yo&apos;q.</div> : null}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[99999] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black/75 p-4 backdrop-blur-md">
          <div className="absolute inset-0" aria-hidden="true" onClick={() => actingId ? undefined : setDeleteTarget(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby="delete-post-title" className="relative z-10 w-full max-w-[340px] rounded-[30px] border border-white/10 bg-[#171717]/95 p-7 text-white shadow-2xl shadow-black/70">
            <h3 id="delete-post-title" className="text-xl font-black leading-6 tracking-tight">Delete post?</h3>
            <p className="mt-2 text-[14px] leading-5 text-slate-400">
              This can&apos;t be undone. This post will be removed from the timeline and your profile.
            </p>

            <button
              onClick={() => void archivePost()}
              disabled={actingId === deleteTarget.id}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#f4212e] text-[15px] font-black text-white transition hover:bg-[#dc1f2b] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {actingId === deleteTarget.id ? <span className="inline-flex items-center gap-2"><XSpinner size="sm" /> Deleting</span> : "Delete"}
            </button>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={actingId === deleteTarget.id}
              className="mt-3 h-12 w-full rounded-full border border-[#536471] bg-transparent text-[15px] font-black text-white transition hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {editingPost ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md">
          <button className="absolute inset-0" onClick={() => setEditingPost(null)} aria-label="Close edit dialog" />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-2xl sm:p-5">
            <div className="flex items-center gap-3"><h3 className="font-black">Edit post</h3><Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setEditingPost(null)}><X size={16} /></Button></div>
            <Textarea autoFocus value={editingText} onChange={(event) => setEditingText(event.target.value)} maxLength={280} className="mt-4 min-h-32" />
            <div className="mt-3 flex items-center"><span className="text-xs text-slate-500">{editingText.length}/280</span><Button className="ml-auto" disabled={!editingText.trim() || actingId === editingPost.id} onClick={() => void savePostEdit()}>{actingId === editingPost.id ? <XSpinner size="sm" /> : <Check size={16} />}Save changes</Button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
