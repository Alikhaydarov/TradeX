"use client";

import { BarChart2, Bookmark, Cloud, Heart, Image as ImageIcon, LoaderCircle, MessageCircle, Repeat2, Share, Smile } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-context";
import type { Post } from "./types";

const initialPosts: Post[] = [
  { id: "seed-1", name: "Sardor Capital", handle: "@sardorcap", avatar: "SC", time: "12m", text: "BTC 4H da liquidity sweep'dan keyin bullish structure tasdiqlandi. Entry uchun retest kutyapman. Riskni 1% dan oshirmang.", symbol: "BTC/USDT", side: "LONG", price: "103,840", target: "108,200", likes: 128, replies: 24, reposts: 31 },
  { id: "seed-2", name: "Malika FX", handle: "@malikafx", avatar: "M", time: "38m", text: "Bugungi London session natijasi: 2 ta trade, 1 win, 1 BE. Eng yaxshi qaror - setup bo'lmasa bozorga kirmaslik. Intizom ham strategiyaning bir qismi.", symbol: "XAU/USD", side: "LONG", price: "2,341", target: "2,362", likes: 87, replies: 12, reposts: 9 },
  { id: "seed-3", name: "Quant Uz", handle: "@quantuz", avatar: "Q", time: "1h", text: "EMA 20/50 crossover strategiyasini 5 yillik S&P 500 ma'lumotida test qildik. Win rate baland emas, lekin profit factor 1.74. Natijani Backtest bo'limida ulashaman.", likes: 204, replies: 43, reposts: 52 },
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
  created_at: string;
}

function toPost(record: PostRecord): Post {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.split(" ").map((part) => part[0]).join("").slice(0, 2),
    time: new Intl.RelativeTimeFormat("uz", { numeric: "auto" }).format(
      -Math.max(0, Math.round((Date.now() - new Date(record.created_at).getTime()) / 60000)),
      "minute",
    ),
    text: record.content,
    symbol: record.symbol ?? undefined,
    side: record.side ?? undefined,
    price: record.entry_price ?? undefined,
    target: record.target_price ?? undefined,
    likes: record.likes_count,
    replies: record.replies_count,
    reposts: record.reposts_count,
  };
}

function Composer({
  onAdd,
  userName,
  saving,
}: {
  onAdd: (text: string) => Promise<void>;
  userName: string;
  saving: boolean;
}) {
  const [text, setText] = useState("");
  const initial = userName[0]?.toUpperCase() ?? "T";
  return (
    <div className="flex gap-3 border-b border-xborder px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 font-bold">{initial}</div>
      <div className="min-w-0 flex-1">
        <textarea value={text} maxLength={280} onChange={(event) => setText(event.target.value)} placeholder="Trading fikringizni ulashing..." className="min-h-20 w-full resize-none bg-transparent pt-2 text-xl placeholder:text-xmuted focus:outline-none" />
        <div className="flex items-center border-t border-xborder pt-3 text-xblue">
          <button className="rounded-full p-2 hover:bg-xblue/10" aria-label="Rasm"><ImageIcon size={19} /></button>
          <button className="rounded-full p-2 hover:bg-xblue/10" aria-label="Emoji"><Smile size={19} /></button>
          <span className="ml-auto mr-3 text-xs text-xmuted">{text.length}/280</span>
          <button
            disabled={!text.trim() || saving}
            onClick={async () => {
              await onAdd(text);
              setText("");
            }}
            className="flex items-center gap-2 rounded-full bg-xblue px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving && <LoaderCircle className="animate-spin" size={15} />} Post
          </button>
        </div>
      </div>
    </div>
  );
}

export function Feed({ onLogin }: { onLogin: () => void }) {
  const { user, configured } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => {
    if (typeof window === "undefined") return initialPosts;
    const stored = localStorage.getItem("tradex-posts");
    return stored ? JSON.parse(stored) as Post[] : initialPosts;
  });
  const [saving, setSaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState(configured ? "Cloud yuklanmoqda" : "Demo storage");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          const cloudPosts = (data as PostRecord[]).map(toPost);
          setPosts(cloudPosts.length ? cloudPosts : initialPosts);
          setBackendStatus("Supabase cloud");
        } else {
          setBackendStatus("Database migration kerak");
        }
      });

    const channel = supabase
      .channel("tradex-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const incoming = toPost(payload.new as PostRecord);
        setPosts((current) => current.some((post) => post.id === incoming.id) ? current : [incoming, ...current]);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const addPost = async (text: string) => {
    if (configured && !user) {
      onLogin();
      return;
    }

    setSaving(true);
    const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Aziz Trader");
    const handle = String(user?.user_metadata.user_name ?? user?.email?.split("@")[0] ?? "azizfx");
    const avatar = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
    const supabase = getSupabaseBrowserClient();

    if (supabase && user) {
      const { data, error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: text,
        author_name: name,
        author_handle: handle,
        author_avatar: avatar,
      }).select().single();

      if (!error && data) {
        const created = toPost(data as PostRecord);
        setPosts((current) => current.some((post) => post.id === created.id) ? current : [created, ...current]);
      }
    } else {
      const created: Post = {
        id: crypto.randomUUID(),
        name,
        handle: `@${handle}`,
        avatar,
        time: "hozir",
        text,
        likes: 0,
        replies: 0,
        reposts: 0,
      };
      setPosts((current) => {
        const next = [created, ...current];
        localStorage.setItem("tradex-posts", JSON.stringify(next));
        return next;
      });
    }
    setSaving(false);
  };

  const like = (id: string) => setPosts((current) => current.map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post));
  const userName = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Trader");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-xborder bg-black/80 backdrop-blur-md">
        <div className="flex items-center px-4 pt-3">
          <h1 className="text-xl font-bold">Bosh sahifa</h1>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-xmuted"><Cloud size={13} />{backendStatus}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 text-center text-sm font-medium"><button className="relative py-3.5 font-bold after:absolute after:inset-x-8 after:bottom-0 after:h-1 after:rounded-full after:bg-xblue">Siz uchun</button><button className="py-3.5 text-xmuted hover:bg-white/5">Kuzatilayotgan</button></div>
      </header>
      <Composer onAdd={addPost} userName={userName} saving={saving} />
      {posts.map((post) => (
        <article key={post.id} className="flex gap-3 border-b border-xborder px-4 py-3 transition hover:bg-white/[.015]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#202327] text-sm font-bold">{post.avatar}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px]"><span className="truncate font-bold hover:underline">{post.name}</span><span className="truncate text-xmuted">{post.handle}</span><span className="text-xmuted">· {post.time}</span><button className="ml-auto text-xmuted">•••</button></div>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-5.5">{post.text}</p>
            {post.symbol && <div className="mt-3 overflow-hidden rounded-2xl border border-xborder bg-gradient-to-br from-[#111820] to-black p-4"><div className="flex items-center"><span className="font-bold">{post.symbol}</span><span className={`ml-2 rounded px-2 py-0.5 text-[10px] font-black ${post.side === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{post.side}</span><BarChart2 className="ml-auto text-xmuted" size={20} /></div><div className="mt-6 flex gap-10"><div><p className="text-xs text-xmuted">Entry</p><p className="font-mono font-bold">{post.price}</p></div><div><p className="text-xs text-xmuted">Target</p><p className="font-mono font-bold text-emerald-400">{post.target}</p></div></div><div className="mt-5 flex h-14 items-end gap-1 opacity-60">{[25,38,30,52,44,66,59,80,72,93,84,100,89,110,105,125].map((height, index) => <span key={index} style={{ height: `${height / 1.4}px` }} className="flex-1 rounded-t-sm bg-xblue/70" />)}</div></div>}
            <div className="mt-3 flex max-w-[430px] justify-between text-xmuted">
              <button className="flex items-center gap-2 text-xs hover:text-xblue"><MessageCircle size={18} />{post.replies}</button>
              <button className="flex items-center gap-2 text-xs hover:text-emerald-400"><Repeat2 size={19} />{post.reposts}</button>
              <button onClick={() => like(post.id)} className={`flex items-center gap-2 text-xs hover:text-pink-500 ${post.liked ? "text-pink-500" : ""}`}><Heart size={18} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
              <button className="hover:text-xblue" aria-label="Ulashish"><Share size={18} /></button>
              <button className="hover:text-xblue" aria-label="Saqlash"><Bookmark size={18} /></button>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
