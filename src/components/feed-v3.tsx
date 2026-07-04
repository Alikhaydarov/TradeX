"use client";

import { Bookmark, Check, Eye, Heart, Link2, MessageCircle, MoreHorizontal, Pencil, Plus, Repeat2, Search, Send, Share2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { formatCount, formatRelativeTime, parseTradeImages, toSocialPost, type SocialPostRecord } from "@/lib/social-format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SkeletonBlock, XSpinner } from "./app-loader";
import { SocialActions } from "./social-actions-v2";
import { TradeShareComposer } from "./trade-share-composer";
import { useAuth } from "./auth-context";
import { InstrumentBadge } from "./instrument-badge";
import { MediaImage } from "./media-image";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { JournalEntry, Post, PostReply } from "./types";

type PostRecord = SocialPostRecord;

interface FeedTradeRow {
  id: string;
  prop_account_id?: string | null;
  symbol: string;
  side: "Long" | "Short";
  entry_price: string;
  exit_price: string;
  quantity: string;
  fees: string;
  pnl: string;
  note: string;
  traded_at: string;
  account_name?: string;
  market_type?: string;
  setup?: string;
  emotion?: string;
  risk_amount?: string;
  result_r?: string;
  risk_percent?: string;
  session?: string;
  following_plan?: boolean;
  error_made?: boolean;
  mistake_type?: string;
  review_completed?: boolean;
  to_trading_bible?: boolean;
  image_url?: string | null;
  tags?: string[];
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

function tradeFromRow(row: FeedTradeRow): JournalEntry {
  const imageUrls = parseTradeImages(row.image_url);
  return {
    id: row.id,
    propAccountId: row.prop_account_id,
    symbol: row.symbol,
    side: row.side,
    entry: Number(row.entry_price || 0),
    exit: Number(row.exit_price || 0),
    quantity: Number(row.quantity || 0),
    fees: Number(row.fees || 0),
    pnl: Number(row.pnl || 0),
    note: row.note || "",
    rawDate: row.traded_at,
    date: new Date(`${row.traded_at}T00:00:00`).toLocaleDateString("en-US"),
    accountName: row.account_name,
    marketType: row.market_type,
    setup: row.setup || "",
    emotion: row.emotion || "Neutral",
    riskAmount: Number(row.risk_amount || 0),
    resultR: Number(row.result_r || 0),
    riskPercent: row.risk_percent || "",
    session: row.session || "",
    followingPlan: row.following_plan ?? true,
    errorMade: row.error_made ?? false,
    mistakeType: row.mistake_type || "",
    reviewCompleted: row.review_completed ?? false,
    toTradingBible: row.to_trading_bible ?? false,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    tags: row.tags || [],
  };
}

function replyTime(value: string) {
  return formatRelativeTime(value);
}

function timeMeta(handle: string, value: string) {
  return `${handle} / ${value}`;
}

function openProfile(username: string) {
  const clean = username.replace(/^@/, "").toLowerCase();
  window.history.pushState(null, "", `/${encodeURIComponent(clean)}`);
  window.dispatchEvent(new Event("tradeup:open-profile"));
}

export function FeedV3({ onLogin }: { onLogin: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<Record<string, PostReply[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingText, setEditingText] = useState("");
  const [tradePickerOpen, setTradePickerOpen] = useState(false);
  const [tradePickerLoading, setTradePickerLoading] = useState(false);
  const [tradePickerQuery, setTradePickerQuery] = useState("");
  const [shareTrades, setShareTrades] = useState<JournalEntry[]>([]);
  const [shareTarget, setShareTarget] = useState<JournalEntry | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const viewed = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);

  const stats = useMemo(() => ({
    posts: posts.length,
  }), [posts]);

  const loadPosts = () => {
    setLoading(true);
    setError(null);
    apiRequest<{ posts: PostRecord[]; likedPostIds: string[]; bookmarkedPostIds: string[]; repostedPostIds: string[] }>("/api/feed-posts")
      .then((data) => {
        const liked = new Set(data.likedPostIds);
        const bookmarked = new Set(data.bookmarkedPostIds);
        const reposted = new Set(data.repostedPostIds);
        setPosts(data.posts.map((post) => toSocialPost(post, { liked: liked.has(post.id), bookmarked: bookmarked.has(post.id), reposted: reposted.has(post.id) })));
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setLoading(false));
  };

  const loadShareTrades = () => {
    if (!user) return;
    setTradePickerLoading(true);
    apiRequest<{ entries: FeedTradeRow[] }>("/api/journal")
      .then((data) => setShareTrades(data.entries.map(tradeFromRow)))
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setTradePickerLoading(false));
  };

  const openTradePicker = () => {
    if (!user) return onLogin();
    setTradePickerOpen(true);
    if (!shareTrades.length) loadShareTrades();
  };

  const filteredShareTrades = useMemo(() => {
    const query = tradePickerQuery.trim().toLowerCase();
    const trades = [...shareTrades].sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)));
    if (!query) return trades;
    return trades.filter((trade) => `${trade.symbol} ${trade.setup} ${trade.session} ${trade.note}`.toLowerCase().includes(query));
  }, [shareTrades, tradePickerQuery]);

  useEffect(() => {
    loadPosts();
  }, [user]);

  useEffect(() => {
    const handler = () => openTradePicker();
    window.addEventListener("tradeway:share-trade", handler);
    return () => window.removeEventListener("tradeway:share-trade", handler);
  });

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
      setError(nextError instanceof Error ? nextError.message : "Like could not be saved.");
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
      setError(nextError instanceof Error ? nextError.message : "Bookmark could not be saved.");
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
      setError(nextError instanceof Error ? nextError.message : "Repost could not be saved.");
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
      setError(nextError instanceof Error ? nextError.message : "Replies could not be loaded.");
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
      setError(nextError instanceof Error ? nextError.message : "Reply could not be sent.");
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
      setError("Post link could not be shared.");
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
      setError(nextError instanceof Error ? nextError.message : "Post could not be deleted. Only the author or admin can delete it.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#171717]/90 px-3 py-2.5 backdrop-blur-2xl sm:px-6 sm:py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-tight">Trade feed</h1>
            <p className="mt-0.5 text-[10px] text-zinc-500">Shared journal trades</p>
          </div>
          <Button onClick={openTradePicker} className="hidden h-10 rounded-lg bg-white px-4 text-sm font-black text-black hover:bg-zinc-200 sm:inline-flex">
            <Plus size={16} /> {t("shareTrade")}
          </Button>
          <SocialActions className="lg:hidden" />
        </div>
      </header>

      {error ? <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 backdrop-blur-xl">{error}</div> : null}

      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={openTradePicker}
          className="mb-3 flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-white/[.035] sm:hidden"
        >
          <span>
            <span className="block text-sm font-black text-white">{t("shareJournalTrade")}</span>
            <span className="mt-0.5 block text-xs text-zinc-500">{t("reviewedOnly")}</span>
          </span>
          <span className="grid size-9 place-items-center rounded-lg bg-white text-black"><Plus size={17} /></span>
        </button>

        <div className="flex items-center px-1">
          <h2 className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Latest</h2>
          <span className="ml-auto text-[10px] text-zinc-600">{stats.posts} trades</span>
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : (
          <div className="mt-3 overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-[0_18px_54px_rgba(0,0,0,.22)]">
            {posts.map((post) => (
              <article
                key={post.id}
                id={`post-${post.id}`}
                ref={(node) => observePost(node, post.id)}
                className="border-b border-border/80 px-3 py-4 transition-colors last:border-b-0 hover:bg-white/[.02] sm:px-5 sm:py-5"
              >
                <div className="flex gap-3.5">
                  <button type="button" onClick={() => openProfile(post.handle)} className="h-11 w-11 shrink-0 rounded-full sm:h-12 sm:w-12"><TraderAvatar name={post.name} value={post.avatar} className="h-11 w-11 rounded-full text-xs ring-1 ring-white/10 sm:h-12 sm:w-12" /></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => openProfile(post.handle)} className="flex max-w-full items-center gap-1 truncate text-left text-[15px] font-black tracking-tight hover:underline">
                          {post.name}
                          {post.isVerified && <VerifiedBadge size={14} />}
                        </button>
                        <p className="truncate text-[11px] text-slate-500">{timeMeta(post.handle, post.time)}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/0 text-zinc-600 transition-colors hover:border-white/8 hover:bg-white/[.04] hover:text-zinc-200" aria-label="Post options"><MoreHorizontal size={18} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => void sharePost(post)} className="min-h-9 px-2.5"><Link2 /> Copy link</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void toggleBookmark(post)} className="min-h-9 px-2.5"><Bookmark /> {post.bookmarked ? "Remove bookmark" : "Bookmark"}</DropdownMenuItem>
                          {(post.userId === user?.id || isAdmin) ? <DropdownMenuSeparator /> : null}
                          {post.userId === user?.id ? <DropdownMenuItem onClick={() => openEditPost(post)} className="min-h-9 px-2.5"><Pencil /> Edit post</DropdownMenuItem> : null}
                          {(post.userId === user?.id || isAdmin) ? <DropdownMenuItem variant="destructive" onClick={() => openDeleteModal(post)} disabled={actingId === post.id} className="min-h-9 px-2.5">{actingId === post.id ? <XSpinner size="sm" /> : <Trash2 />} Delete post</DropdownMenuItem> : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {post.symbol ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                        <InstrumentBadge symbol={post.symbol} compact className="mr-auto rounded-xl bg-white/[.03]" />
                        <span className={`rounded-md px-2 py-1 text-[9px] font-black ${post.side === "LONG" ? "bg-emerald-300/10 text-emerald-300" : "bg-rose-300/10 text-rose-300"}`}>{post.side}</span>
                        <span className={`rounded-md px-2 py-1 text-[9px] font-black ${post.result === "WIN" ? "bg-emerald-300/10 text-emerald-300" : post.result === "LOSS" ? "bg-rose-300/10 text-rose-300" : "bg-white/8 text-zinc-300"}`}>{post.result}</span>
                        {typeof post.pnl === "number" ? <strong className={post.pnl >= 0 ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}</strong> : null}
                        {typeof post.resultR === "number" ? <span className="text-xs font-bold text-zinc-300">{post.resultR >= 0 ? "+" : ""}{post.resultR.toFixed(2)}R</span> : null}
                      </div>
                    ) : null}

                    {post.text && post.text !== `${post.symbol} trade` ? <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-slate-100">{post.text}</p> : null}

                    {post.imageUrls?.length ? (
                      <div className={`mt-3 overflow-hidden rounded-xl border border-white/10 ${post.imageUrls.length === 1 ? "" : post.imageUrls.length === 2 || post.imageUrls.length === 4 ? "grid grid-cols-2 gap-px bg-white/10" : "grid grid-cols-3 gap-px bg-white/10"}`}>
                        {post.imageUrls.slice(0, 4).map((url, index) => (
                          <button key={url} type="button" onClick={() => setLightboxUrl(url)} className="group relative aspect-square w-full overflow-hidden bg-black/90">
                            <MediaImage src={url} alt={index === post.imageUrls!.length - 1 ? `${post.symbol} TradeWay share card` : `${post.symbol} trade screenshot ${index + 1}`} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                          </button>
                        ))}
                      </div>
                    ) : post.imageUrl ? (
                      <button type="button" onClick={() => setLightboxUrl(post.imageUrl!)} className="group relative mt-3 block w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/90">
                        <MediaImage src={post.imageUrl} alt="Trade media" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                      </button>
                    ) : null}

                    <div className="mt-3 grid grid-cols-5 items-center rounded-2xl border border-white/8 bg-white/[.02] p-1 text-zinc-500">
                      <button onClick={() => void toggleReplies(post)} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[11px] transition-colors hover:bg-white/[.04] hover:text-zinc-200 ${openReplies === post.id ? "bg-white/[.05] text-zinc-100" : ""}`} aria-label="Replies"><MessageCircle size={17} />{post.replies}</button>
                      <button onClick={() => void toggleRepost(post)} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[11px] transition-colors hover:bg-emerald-400/[.06] hover:text-emerald-300 ${post.reposted ? "bg-emerald-400/[.08] text-emerald-300" : ""}`} aria-label="Repost"><Repeat2 size={17} />{post.reposts}</button>
                      <button onClick={() => void toggleLike(post)} className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[11px] transition-colors hover:bg-rose-400/[.06] hover:text-rose-300 ${post.liked ? "bg-rose-400/[.08] text-rose-300" : ""}`} aria-label="Like"><Heart size={17} fill={post.liked ? "currentColor" : "none"} />{post.likes}</button>
                      <span className="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[11px]" aria-label={`${post.views} views`}><Eye size={17} />{formatCount(post.views)}</span>
                      <button onClick={() => void sharePost(post)} className="grid h-11 place-items-center rounded-xl transition-colors hover:bg-white/[.04] hover:text-zinc-200" aria-label="Share"><Share2 size={17} /></button>
                    </div>

                    {openReplies === post.id ? (
                      <div className="mt-4 border-t border-white/8 pt-4">
                        {loadingReplies === post.id ? (
                          <div className="flex items-center gap-2 py-4 text-xs text-slate-500"><XSpinner size="sm" /> Loading replies</div>
                        ) : (
                          <div className="space-y-3">
                            {(repliesByPost[post.id] ?? []).map((reply) => (
                              <div key={reply.id} className="flex gap-2.5 rounded-2xl bg-white/[.025] p-3">
                                <TraderAvatar name={reply.name} value={reply.avatar} className="h-8 w-8 shrink-0 text-[10px]" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="truncate text-xs">{reply.name}</strong>
                                    {reply.isVerified ? <VerifiedBadge size={13} /> : null}
                                    <span className="text-[10px] text-slate-600">@{reply.username} <span className="px-1 text-zinc-700">/</span> {replyTime(reply.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-300">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                            {!repliesByPost[post.id]?.length ? <p className="py-2 text-xs text-slate-500">No replies yet.</p> : null}
                          </div>
                        )}

                        <div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/8 bg-black/10 p-2 focus-within:border-white/20">
                          <Textarea
                            value={replyDrafts[post.id] ?? ""}
                            onChange={(event) => setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                            maxLength={280}
                            placeholder="Write a reply..."
                            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                          />
                          <Button onClick={() => void addReply(post)} disabled={!replyDrafts[post.id]?.trim() || savingReply === post.id} size="icon-sm" className="h-9 w-9 shrink-0 rounded-xl bg-white text-slate-950 hover:bg-white" aria-label="Send reply">
                            {savingReply === post.id ? <XSpinner size="sm" /> : <Send size={14} />}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}

            {!posts.length ? <div className="p-10 text-center text-sm text-slate-500">No trades shared yet.</div> : null}
          </div>
        )}
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            aria-label="Yopish"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={18} />
          </button>
          <MediaImage
            src={lightboxUrl}
            alt="Full size"
            className="max-h-[92dvh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <Dialog open={tradePickerOpen} onOpenChange={setTradePickerOpen}>
        <DialogContent className="max-h-[88dvh] overflow-hidden border-border bg-[#171717] p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-4 py-4">
            <DialogTitle className="text-xl font-black">{t("shareTrade")}</DialogTitle>
            <p className="text-sm text-zinc-500">{t("pickTrade")}</p>
          </DialogHeader>
          <div className="border-b border-border p-3">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-black/15 px-3 focus-within:border-white/25">
              <Search size={17} className="text-zinc-500" />
              <input
                value={tradePickerQuery}
                onChange={(event) => setTradePickerQuery(event.target.value)}
                placeholder={t("searchTrade")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
            </label>
          </div>
          <div className="max-h-[55dvh] overflow-y-auto p-2">
            {tradePickerLoading ? (
              <div className="grid min-h-48 place-items-center text-sm text-zinc-500"><XSpinner size="sm" /> Loading trades</div>
            ) : filteredShareTrades.length ? (
              <div className="space-y-1">
                {filteredShareTrades.map((trade) => {
                  const win = trade.pnl >= 0;
                  return (
                    <button
                      key={trade.id}
                      type="button"
                      onClick={() => {
                        setTradePickerOpen(false);
                        setShareTarget(trade);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/[.045]"
                    >
                      <InstrumentBadge symbol={trade.symbol} compact className="shrink-0 rounded-xl bg-black/25" showFullSymbol={false} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <strong className="truncate text-sm">{trade.symbol}</strong>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${trade.side === "Long" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                            {trade.side}
                          </span>
                          <span className="text-[10px] text-zinc-600">{trade.rawDate}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-zinc-500">{trade.setup || trade.session || trade.note || "No review note"}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <strong className={`block font-mono text-sm font-black ${win ? "text-emerald-300" : "text-rose-300"}`}>
                          {win ? "+" : ""}${Math.abs(trade.pnl).toFixed(2)}
                        </strong>
                        <span className="font-mono text-[10px] text-zinc-600">{(trade.resultR || 0).toFixed(2)}R</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center px-6 text-center">
                <div>
                  <p className="text-sm font-bold">{t("noTrades")}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{t("addTradeFirst")}</p>
                  <Button className="mt-4 bg-white text-black hover:bg-zinc-200" onClick={() => { setTradePickerOpen(false); window.history.pushState(null, "", "/journal"); window.dispatchEvent(new Event("popstate")); }}>
                    {t("openJournal")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TradeShareComposer
        trade={shareTarget}
        onClose={() => {
          setShareTarget(null);
          loadPosts();
        }}
      />

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

