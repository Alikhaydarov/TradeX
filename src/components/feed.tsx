"use client";

import { BarChart2, Bookmark, Cloud, Heart, LoaderCircle, MessageCircle, Repeat2, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "./auth-context";
import type { Post } from "./types";

const seedPosts: Post[] = [
  { id: "seed-1", name: "Sardor Capital", handle: "@sardorcap", avatar: "SC", time: "12m", text: "BTC 4H da liquidity sweep'dan keyin bullish structure tasdiqlandi. Entry uchun retest kutyapman.", symbol: "BTC/USDT", side: "LONG", price: "103,840", target: "108,200", likes: 128, replies: 24, reposts: 31 },
  { id: "seed-2", name: "Malika FX", handle: "@malikafx", avatar: "MF", time: "38m", text: "Setup bo'lmasa bozorga kirmaslik ham strategiyaning bir qismi.", symbol: "XAU/USD", side: "SHORT", price: "2,358", target: "2,347", likes: 87, replies: 12, reposts: 9 },
];

interface PostRecord {
  id: string; user_id: string; content: string; author_name: string; author_handle: string;
  author_avatar: string | null; symbol: string | null; side: "LONG" | "SHORT" | null;
  entry_price: string | null; target_price: string | null; likes_count: number;
  replies_count: number; reposts_count: number; created_at: string;
}

function toPost(record: PostRecord, liked = false, bookmarked = false): Post {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(record.created_at).getTime()) / 60000));
  return {
    id: record.id, userId: record.user_id, name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.slice(0, 2).toUpperCase(),
    time: minutes < 1 ? "hozir" : `${minutes}m`, text: record.content,
    symbol: record.symbol ?? undefined, side: record.side ?? undefined,
    price: record.entry_price ?? undefined, target: record.target_price ?? undefined,
    likes: record.likes_count, replies: record.replies_count, reposts: record.reposts_count,
    liked, bookmarked,
  };
}

export function Feed({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ posts: PostRecord[]; likedPostIds: string[]; bookmarkedPostIds: string[] }>("/api/posts")
      .then((data) => {
      if (!active) return;
      const liked = new Set(data.likedPostIds);
      const bookmarked = new Set(data.bookmarkedPostIds);
      setPosts(data.posts.length ? data.posts.map((post) => toPost(post, liked.has(post.id), bookmarked.has(post.id))) : seedPosts);
      })
      .catch((nextError: Error) => {
      if (!active) return;
      setError(nextError instanceof Error ? nextError.message : "Postlar yuklanmadi.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const addPost = async () => {
    if (!user) return onLogin();
    if (!text.trim()) return;
    setSaving(true); setError(null);
    try {
      const { post } = await apiRequest<{ post: PostRecord }>("/api/posts", {
        method: "POST", body: JSON.stringify({ content: text }),
      });
      setPosts((current) => [toPost(post), ...current]);
      setText("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi.");
    } finally { setSaving(false); }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return onLogin();
    if (post.id.startsWith("seed-")) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item));
      return;
    }
    try {
      const state = await apiRequest<{ liked: boolean; likes: number }>(`/api/posts/${post.id}/like`, { method: "POST" });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...state } : item));
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Like saqlanmadi."); }
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
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Post saqlanmadi."); }
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-xborder bg-black/80 backdrop-blur-md">
        <div className="flex items-center px-4 py-3">
          <h1 className="text-xl font-bold">Bosh sahifa</h1>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400"><Cloud size={13} />Node API</span>
        </div>
      </header>
      {error && <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{error}</div>}
      <div className="flex gap-3 border-b border-xborder p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 font-bold">{String(user?.user_metadata.name ?? "T")[0]}</div>
        <div className="flex-1">
          <Textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={280} placeholder="Trading fikringizni ulashing..." className="min-h-20 resize-none border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0" />
          <div className="flex items-center border-t border-xborder pt-3">
            <span className="ml-auto mr-3 text-xs text-xmuted">{text.length}/280</span>
            <Button onClick={() => void addPost()} disabled={!text.trim() || saving} className="rounded-full bg-xblue text-white">
              {saving && <LoaderCircle className="animate-spin" size={15} />} Post
            </Button>
          </div>
        </div>
      </div>
      {loading && <div className="p-8 text-center text-sm text-xmuted">Postlar yuklanmoqda...</div>}
      {!loading && posts.map((post) => (
        <article key={post.id} className="flex gap-3 border-b border-xborder px-4 py-3 hover:bg-white/[.015]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#202327] text-sm font-bold">{post.avatar}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px]"><span className="truncate font-bold">{post.name}</span><span className="truncate text-xmuted">{post.handle}</span><span className="text-xmuted">· {post.time}</span><span className="ml-auto text-xmuted">•••</span></div>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-6">{post.text}</p>
            {post.symbol && <div className="mt-3 rounded-2xl border border-xborder bg-gradient-to-br from-[#111820] to-black p-4"><div className="flex items-center"><b>{post.symbol}</b><span className={`ml-2 rounded px-2 py-0.5 text-[10px] font-black ${post.side === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{post.side}</span><BarChart2 className="ml-auto text-xmuted" size={20} /></div><div className="mt-5 flex gap-10"><div><p className="text-xs text-xmuted">Entry</p><b className="font-mono">{post.price}</b></div><div><p className="text-xs text-xmuted">Target</p><b className="font-mono text-emerald-400">{post.target}</b></div></div></div>}
            <div className="mt-3 flex max-w-[430px] justify-between text-xmuted">
              <button className="flex items-center gap-2 text-xs"><MessageCircle size={18} />{post.replies}</button>
              <button className="flex items-center gap-2 text-xs"><Repeat2 size={19} />{post.reposts}</button>
              <button onClick={() => void toggleLike(post)} className={`flex items-center gap-2 text-xs ${post.liked ? "text-pink-500" : ""}`}><Heart size={18} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
              <button aria-label="Ulashish"><Share size={18} /></button>
              <button onClick={() => void toggleBookmark(post)} className={post.bookmarked ? "text-xblue" : ""} aria-label="Saqlash"><Bookmark size={18} fill={post.bookmarked ? "currentColor" : "none"} /></button>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
