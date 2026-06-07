"use client";

import { Bookmark, Eye, Heart, ImageIcon, MessageCircle, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { XSpinner } from "./app-loader";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import type { Post } from "./types";

interface PostRecord {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
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

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function toPost(record: PostRecord, liked = false, bookmarked = false): Post {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(record.created_at).getTime()) / 60000));
  return {
    id: record.id,
    userId: record.user_id,
    name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.slice(0, 2).toUpperCase(),
    time: minutes < 1 ? "hozir" : `${minutes}m`,
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
  };
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
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
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
    apiRequest<{ posts: PostRecord[]; likedPostIds: string[]; bookmarkedPostIds: string[] }>("/api/feed-posts")
      .then((data) => {
        const liked = new Set(data.likedPostIds);
        const bookmarked = new Set(data.bookmarkedPostIds);
        setPosts(data.posts.map((post) => toPost(post, liked.has(post.id), bookmarked.has(post.id))));
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
    try {
      const state = await apiRequest<{ liked: boolean; likes: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...state } : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Like saqlanmadi.");
    }
  };

  const toggleBookmark = async (post: Post) => {
    if (!user) return onLogin();
    try {
      const state = await apiRequest<{ bookmarked: boolean }>(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, bookmarked: state.bookmarked } : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi.");
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
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0b1424]/45 px-4 py-4 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300/70">TradeUp workspace</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">TradeUp</h1>
        </div>
      </header>

      {error ? <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-xl">{error}</div> : null}

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-5">
        <section className="rounded-[28px] border border-white/10 bg-white/[.045] p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
          <div className="flex gap-3">
            <TraderAvatar name={userName} value={userAvatar} className="h-11 w-11 shrink-0 text-xs" />
            <div className="min-w-0 flex-1">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={280}
                placeholder="Nima bo'lyapti?"
                className="min-h-24 resize-none border-0 bg-transparent px-0 text-base shadow-none placeholder:text-slate-500 focus-visible:ring-0"
              />

              {imageUrl ? (
                <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                  <img src={imageUrl} alt="Post rasmi" className="h-full w-full object-cover object-center" />
                  <button onClick={() => setImageUrl(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur-xl" aria-label="Rasmni olib tashlash">
                    <X size={17} />
                  </button>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-cyan-200 hover:bg-white/[.06] disabled:opacity-60">
                  {uploadingImage ? <XSpinner size="sm" /> : <ImageIcon size={16} />} Rasm
                </button>
                <span className="ml-auto text-[10px] text-slate-500">{text.length}/280</span>
                <Button onClick={() => void addPost()} disabled={(!text.trim() && !imageUrl) || saving} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 text-white">
                  {saving ? <XSpinner size="sm" /> : <Send size={15} />} Ulashish
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-2 px-1">
          <h2 className="text-sm font-bold">Community oqimi</h2>
          <span className="text-[10px] text-slate-500">{stats.posts} post · {formatCount(stats.views)} views</span>
        </div>

        {loading ? (
          <div className="mt-10 grid place-items-center py-10 text-slate-500"><XSpinner size="lg" /></div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[28px] border border-white/10 bg-white/[.025] backdrop-blur-2xl">
            {posts.map((post) => (
              <article
                key={post.id}
                ref={(node) => observePost(node, post.id)}
                className="border-b border-white/8 p-4 last:border-b-0 sm:p-5"
              >
                <div className="flex gap-3">
                  <TraderAvatar name={post.name} value={post.avatar} className="h-11 w-11 shrink-0 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{post.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{post.handle} · {post.time}</p>
                      </div>
                      {(post.userId === user?.id || isAdmin) ? (
                        <button onClick={() => openDeleteModal(post)} disabled={actingId === post.id} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-rose-400/10 hover:text-rose-200" aria-label="Postni o'chirish">
                          {actingId === post.id ? <XSpinner size="sm" /> : <Trash2 size={16} />}
                        </button>
                      ) : null}
                    </div>

                    {post.text ? <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-slate-100">{post.text}</p> : null}

                    {post.imageUrl ? (
                      <div className="mt-3 aspect-video w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                        <img src={post.imageUrl} alt="Post rasmi" className="h-full w-full object-cover object-center" loading="lazy" />
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

                    <div className="mt-4 flex items-center gap-4 text-slate-500">
                      <span className="flex items-center gap-1.5 text-[11px]"><MessageCircle size={16} />{post.replies}</span>
                      <button onClick={() => void toggleLike(post)} className={`flex items-center gap-1.5 text-[11px] hover:text-white ${post.liked ? "text-rose-300" : ""}`}><Heart size={16} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
                      <span className="flex items-center gap-1.5 text-[11px]"><Eye size={16} />{formatCount(post.views)}</span>
                      <button onClick={() => void toggleBookmark(post)} className={`ml-auto grid h-8 w-8 place-items-center rounded-xl hover:bg-white/[.05] ${post.bookmarked ? "text-cyan-300" : "hover:text-white"}`} aria-label="Saqlash"><Bookmark size={16} fill={post.bookmarked ? "currentColor" : "none"} /></button>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {!posts.length ? <div className="p-10 text-center text-sm text-slate-500">Hali post yo'q.</div> : null}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed left-0 top-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[28px] border border-white/10 bg-[#0b1220] p-5 text-white shadow-2xl shadow-black/50">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-400/10 text-rose-200">
                <Trash2 size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black">Postni o'chirish?</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Bu post feed’dan olib tashlanadi. Bu amalni faqat post egasi yoki admin bajarishi mumkin.
                </p>
                {deleteTarget.text ? <p className="mt-3 line-clamp-2 rounded-2xl bg-white/[.04] px-3 py-2 text-xs text-slate-300">{deleteTarget.text}</p> : null}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={actingId === deleteTarget.id}
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-bold text-slate-200 hover:bg-white/[.08] disabled:opacity-60"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => void archivePost()}
                disabled={actingId === deleteTarget.id}
                className="h-11 flex-1 rounded-2xl bg-rose-500 text-sm font-black text-white hover:bg-rose-400 disabled:opacity-60"
              >
                {actingId === deleteTarget.id ? <span className="inline-flex items-center gap-2"><XSpinner size="sm" /> O'chirilmoqda</span> : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
