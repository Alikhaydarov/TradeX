"use client";

import {
  BarChart3,
  Bookmark,
  Eye,
  Heart,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import type { Post } from "./types";

const seedPosts: Post[] = [
  { id: "seed-1", name: "Sardor Capital", handle: "@sardorcap", avatar: "SC", time: "12m", text: "BTC 4H da liquidity sweep'dan keyin bullish structure tasdiqlandi. Entry uchun retest kutyapman.", symbol: "BTC/USDT", side: "LONG", price: "103,840", target: "108,200", likes: 128, replies: 24, reposts: 31, views: 1200 },
  { id: "seed-2", name: "Malika FX", handle: "@malikafx", avatar: "MF", time: "38m", text: "Setup bo'lmasa bozorga kirmaslik ham strategiyaning bir qismi.", symbol: "XAU/USD", side: "SHORT", price: "2,358", target: "2,347", likes: 87, replies: 12, reposts: 9, views: 764 },
];

interface PostRecord {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
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

export function Feed({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userName = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Trader");
  const userAvatar = typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  useEffect(() => {
    let active = true;
    apiRequest<{ posts: PostRecord[]; likedPostIds: string[]; bookmarkedPostIds: string[] }>("/api/posts")
      .then((data) => {
        if (!active) return;
        const liked = new Set(data.likedPostIds);
        const bookmarked = new Set(data.bookmarkedPostIds);
        setPosts(data.posts.length
          ? data.posts.map((post) => toPost(post, liked.has(post.id), bookmarked.has(post.id)))
          : seedPosts);
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const addPost = async () => {
    if (!user) return onLogin();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { post } = await apiRequest<{ post: PostRecord }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setPosts((current) => [toPost(post), ...current]);
      setText("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return onLogin();
    if (post.id.startsWith("seed-")) {
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }
        : item));
      return;
    }
    try {
      const state = await apiRequest<{ liked: boolean; likes: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...state } : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Like saqlanmadi.");
    }
  };

  const toggleBookmark = async (post: Post) => {
    if (!user) return onLogin();
    if (post.id.startsWith("seed-")) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, bookmarked: !item.bookmarked } : item));
      return;
    }
    try {
      const state = await apiRequest<{ bookmarked: boolean }>(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, bookmarked: state.bookmarked } : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi.");
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 flex items-center border-b border-white/8 bg-[#0b1424]/45 px-5 py-4 backdrop-blur-2xl">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300/70">TradeUp workspace</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">TradeUp Pulse</h1>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1.5 text-[10px] font-bold text-emerald-300">
          <Radio size={11} /> LIVE DATA
        </span>
      </header>

      {error && <div className="mx-4 mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-xl">{error}</div>}

      <div className="p-4 md:p-5">
        <section className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[.045] p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex gap-3">
            <TraderAvatar name={userName} value={userAvatar} className="h-11 w-11 text-xs" />
            <div className="min-w-0 flex-1">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={280}
                placeholder="Bozor haqida qanday signal ko'ryapsiz?"
                className="min-h-24 resize-none border-0 bg-transparent px-0 text-base shadow-none placeholder:text-slate-500 focus-visible:ring-0"
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                <span className="rounded-full bg-cyan-300/8 px-3 py-1 text-[10px] font-bold text-cyan-200">#setup</span>
                <span className="rounded-full bg-violet-300/8 px-3 py-1 text-[10px] font-bold text-violet-200">#analysis</span>
                <span className="ml-auto text-[10px] text-slate-500">{text.length}/280</span>
                <Button onClick={() => void addPost()} disabled={!text.trim() || saving} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 text-white">
                  {saving ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}
                  Ulashish
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-2">
          <Sparkles size={16} className="text-violet-300" />
          <h2 className="text-sm font-bold">Community oqimi</h2>
          <span className="text-[10px] text-slate-500">{"Eng yangi g'oyalar"}</span>
        </div>

        {loading && <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[.025] p-10 text-center text-sm text-slate-500 backdrop-blur-xl">Postlar yuklanmoqda...</div>}

        {!loading && (
          <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
            {posts.map((post) => (
              <article key={post.id} className="group overflow-hidden rounded-[24px] border border-white/9 bg-white/[.035] p-4 shadow-xl shadow-slate-950/15 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-white/[.055]">
                <div className="flex items-center gap-3">
                  <TraderAvatar name={post.name} value={post.avatar} className="h-11 w-11 text-xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{post.name}</p>
                    <p className="truncate text-[10px] text-slate-500">{post.handle} · {post.time}</p>
                  </div>
                  <button className="ml-auto grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-white/[.06] hover:text-white" aria-label="Post menyusi">
                    <MoreHorizontal size={17} />
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-200">{post.text}</p>

                {post.symbol && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-cyan-300/8 via-white/[.025] to-violet-400/8 p-3">
                    <div className="flex items-center">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.06]"><BarChart3 size={17} className="text-cyan-300" /></span>
                      <div className="ml-3">
                        <strong className="block text-sm">{post.symbol}</strong>
                        <small className="text-[9px] uppercase tracking-widest text-slate-500">Trade idea</small>
                      </div>
                      <span className={`ml-auto rounded-full px-2.5 py-1 text-[9px] font-black ${post.side === "LONG" ? "bg-emerald-300/10 text-emerald-300" : "bg-rose-300/10 text-rose-300"}`}>{post.side}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-black/10 p-2.5"><p className="text-[9px] text-slate-500">ENTRY</p><b className="font-mono text-xs">{post.price}</b></div>
                      <div className="rounded-xl bg-black/10 p-2.5"><p className="text-[9px] text-slate-500">TARGET</p><b className="font-mono text-xs text-emerald-300">{post.target}</b></div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-1 border-t border-white/7 pt-3 text-slate-500">
                  <button className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] hover:bg-white/[.05] hover:text-white"><MessageCircle size={15} />{post.replies}</button>
                  <button onClick={() => void toggleLike(post)} className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] hover:bg-white/[.05] ${post.liked ? "text-rose-300" : "hover:text-white"}`}><Heart size={15} fill={post.liked ? "currentColor" : "none