"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiRequest } from "@/lib/api-client";
import {
  parseTradeImages,
  toSocialPost,
  type SocialPostRecord,
} from "@/lib/social-format";
import { useAuth } from "../auth-context";
import type { JournalEntry, Post, PostReply } from "../types";
import { usePremiumStatus } from "../use-premium-status";

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

export function useFeedData(onLogin: () => void) {
  const router = useRouter();
  const { user } = useAuth();
  const { status: premiumStatus } = usePremiumStatus(Boolean(user));

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<
    Record<string, PostReply[]>
  >({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingText, setEditingText] = useState("");
  const [tradePickerOpen, setTradePickerOpen] = useState(false);
  const [tradePickerLoading, setTradePickerLoading] = useState(false);
  const [tradePickerQuery, setTradePickerQuery] = useState("");
  const [shareAccountFilter, setShareAccountFilter] = useState("all");
  const [shareTrades, setShareTrades] = useState<JournalEntry[]>([]);
  const [shareTarget, setShareTarget] = useState<JournalEntry | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const viewed = useRef(new Set<string>());
  const pendingViews = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);

  const loadPosts = useCallback(() => {
    setLoading(true);
    setError(null);
    return apiRequest<{
      posts: PostRecord[];
      likedPostIds: string[];
      bookmarkedPostIds: string[];
      repostedPostIds: string[];
    }>("/api/feed-posts")
      .then((data) => {
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
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setLoading(false));
  }, []);

  const loadShareTrades = useCallback(() => {
    if (!user) return Promise.resolve();
    setTradePickerLoading(true);
    return apiRequest<{ entries: FeedTradeRow[] }>("/api/journal")
      .then((data) => setShareTrades(data.entries.map(tradeFromRow)))
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setTradePickerLoading(false));
  }, [user]);

  const openTradePicker = useCallback(() => {
    if (!user) {
      onLogin();
      return;
    }
    setTradePickerOpen(true);
    if (!shareTrades.length) void loadShareTrades();
  }, [loadShareTrades, onLogin, shareTrades.length, user]);

  const shareAccountOptions = useMemo(() => {
    const seen = new Set<string>();
    return shareTrades.reduce<Array<{ id: string; label: string }>>(
      (options, trade) => {
        const id = trade.propAccountId || "";
        if (!id || seen.has(id)) return options;
        seen.add(id);
        options.push({
          id,
          label:
            trade.accountName?.trim() ||
            `${trade.marketType || "Trading"} account`,
        });
        return options;
      },
      [],
    );
  }, [shareTrades]);

  const filteredShareTrades = useMemo(() => {
    const query = tradePickerQuery.trim().toLowerCase();
    const trades = [...shareTrades]
      .filter((trade) =>
        shareAccountFilter === "all"
          ? true
          : trade.propAccountId === shareAccountFilter,
      )
      .sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)));

    if (!query) return trades;
    return trades.filter((trade) =>
      `${trade.symbol} ${trade.accountName} ${trade.setup} ${trade.session} ${trade.note}`
        .toLowerCase()
        .includes(query),
    );
  }, [shareTrades, shareAccountFilter, tradePickerQuery]);

 useEffect(() => {
    void loadPosts();
  }, [loadPosts, user]);

  useEffect(() => {
    if (!posts.length) return;
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
  }, [posts]);

  useEffect(() => {
    const handler = () => openTradePicker();
    window.addEventListener("tradeway:share-trade", handler);
    return () => window.removeEventListener("tradeway:share-trade", handler);
  }, [openTradePicker]);

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

  const recordView = useCallback(
    (postId: string) => {
      if (
        !user ||
        viewed.current.has(postId) ||
        pendingViews.current.has(postId)
      ) {
        return;
      }

      pendingViews.current.add(postId);
      void apiRequest<{
        success: boolean;
        counted?: boolean;
        views?: number | null;
      }>("/api/post-actions", {
        method: "POST",
        body: JSON.stringify({ action: "view", postId }),
      })
        .then((response) => {
          viewed.current.add(postId);
          const currentViews = response.views;
          if (typeof currentViews !== "number") return;
          setPosts((current) =>
            current.map((post) =>
              post.id === postId ? { ...post, views: currentViews } : post,
            ),
          );
        })
        .catch(() => undefined)
        .finally(() => {
          pendingViews.current.delete(postId);
        });
    },
    [user],
  );

  const observePost = useCallback(
    (node: HTMLElement | null, postId: string) => {
      if (!node || !user) return;
      if (!observer.current) {
        observer.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (
                entry.isIntersecting &&
                entry.intersectionRatio >= 0.2
              ) {
                const id = entry.target.getAttribute("data-post-id");
                if (id) recordView(id);
              }
            });
          },
          { threshold: [0.2], rootMargin: "0px 0px -12% 0px" },
        );
      }
      node.setAttribute("data-post-id", postId);
      observer.current.observe(node);
    },
    [recordView, user],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  const openProfile = useCallback(
    (username: string) => {
      const clean = username.replace(/^@/, "").toLowerCase();
      router.push(`/${encodeURIComponent(clean)}`);
      window.dispatchEvent(new Event("tradeup:open-profile"));
    },
    [router],
  );

  const openJournal = useCallback(() => {
    setTradePickerOpen(false);
    router.push("/accounts");
  }, [router]);

  const toggleLike = useCallback(
    async (post: Post) => {
      if (!user) {
        onLogin();
        return;
      }
      const optimisticLiked = !post.liked;
      const optimisticLikes = Math.max(
        0,
        post.likes + (optimisticLiked ? 1 : -1),
      );
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, liked: optimisticLiked, likes: optimisticLikes }
            : item,
        ),
      );
      try {
        const state = await apiRequest<{ liked: boolean; likes: number }>(
          `/api/posts/${post.id}/like`,
          { method: "POST" },
        );
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id ? { ...item, ...state } : item,
          ),
        );
      } catch (nextError) {
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? { ...item, liked: post.liked, likes: post.likes }
              : item,
          ),
        );
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Like could not be saved.",
        );
      }
    },
    [onLogin, user],
  );

  const toggleBookmark = useCallback(
    async (post: Post) => {
      if (!user) {
        onLogin();
        return;
      }
      const bookmarked = !post.bookmarked;
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, bookmarked } : item,
        ),
      );
      try {
        const state = await apiRequest<{ bookmarked: boolean }>(
          `/api/posts/${post.id}/bookmark`,
          { method: "POST" },
        );
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? { ...item, bookmarked: state.bookmarked }
              : item,
          ),
        );
      } catch (nextError) {
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? { ...item, bookmarked: post.bookmarked }
              : item,
          ),
        );
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Bookmark could not be saved.",
        );
      }
    },
    [onLogin, user],
  );

  const toggleRepost = useCallback(
    async (post: Post) => {
      if (!user) {
        onLogin();
        return;
      }
      const reposted = !post.reposted;
      const reposts = Math.max(
        0,
        post.reposts + (reposted ? 1 : -1),
      );
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, reposted, reposts } : item,
      ),
      );
      try {
        const state = await apiRequest<{
          reposted: boolean;
          reposts: number;
        }>(`/api/posts/${post.id}/repost`, { method: "POST" });
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id ? { ...item, ...state } : item,
          ),
        );
      } catch (nextError) {
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  reposted: post.reposted,
                  reposts: post.reposts,
                }
              : item,
          ),
        );
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Repost could not be saved.",
        );
      }
    },
    [onLogin, user],
  );

  const openEditPost = useCallback((post: Post) => {
    setEditingPost(post);
    setEditingText(post.text);
  }, []);

  const savePostEdit = useCallback(async () => {
    if (!editingPost || !editingText.trim()) return;
    const previous = editingPost.text;
    const content = editingText.trim();
    setActingId(editingPost.id);
    setPosts((current) =>
      current.map((item) =>
        item.id === editingPost.id ? { ...item, text: content } : item,
      ),
    );

    try {
      await apiRequest(`/api/posts/${editingPost.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      setEditingPost(null);
    } catch (nextError) {
      setPosts((current) =>
        current.map((item) =>
          item.id === editingPost.id
            ? { ...item, text: previous }
            : item,
        ),
      );
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Post update failed.",
      );
    } finally {
      setActingId(null);
    }
  }, [editingPost, editingText]);

  const toggleReplies = useCallback(
    async (post: Post) => {
      if (openReplies === post.id) {
        setOpenReplies(null);
        return;
      }

      setOpenReplies(post.id);
      if (repliesByPost[post.id]) return;

      setLoadingReplies(post.id);
      setError(null);
      try {
        const { replies } = await apiRequest<{ replies: PostReply[] }>(
          `/api/posts/${post.id}/replies`,
        );
        setRepliesByPost((current) => ({
          ...current,
          [post.id]: replies,
        }));
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Replies could not be loaded.",
        );
      } finally {
        setLoadingReplies(null);
      }
    },
    [openReplies, repliesByPost],
  );

  const addReply = useCallback(
    async (post: Post) => {
      if (!user) {
        onLogin();
        return;
      }
      const content = replyDrafts[post.id]?.trim();
      if (!content) return;

      const optimisticReply: PostReply = {
        id: `optimistic-${Date.now()}`,
        postId: post.id,
        userId: user.id,
        name: String(
          user.user_metadata.full_name ??
            user.user_metadata.name ??
            "You",
        ),
        username: String(
          user.user_metadata.user_name ??
            user.email?.split("@")[0] ??
            "you",
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
      setError(null);
      setReplyDrafts((current) => ({ ...current, [post.id]: "" }));
      setRepliesByPost((current) => ({
        ...current,
        [post.id]: [...(current[post.id] ?? []), optimisticReply],
      }));
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, replies: item.replies + 1 }
            : item,
      ),
      );

      try {
        const { reply } = await apiRequest<{ reply: PostReply }>(
          `/api/posts/${post.id}/replies`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
        );
        setRepliesByPost((current) => ({
          ...current,
          [post.id]: (current[post.id] ?? []).map((item) =>
            item.id === optimisticReply.id ? reply : item,
          ),
        }));
      } catch (nextError) {
        setReplyDrafts((current) => ({
          ...current,
          [post.id]: content,
        }));
        setRepliesByPost((current) => ({
          ...current,
          [post.id]: (current[post.id] ?? []).filter(
            (item) => item.id !== optimisticReply.id,
          ),
        }));
        setPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? { ...item, replies: Math.max(0, item.replies - 1) }
              : item,
          ),
        );
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Reply could not be sent.",
        );
      } finally {
        setSavingReply(null);
      }
    },
    [onLogin, premiumStatus.isVerified, replyDrafts, user],
  );

  const sharePost = useCallback(async (post: Post) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.name} - Tradox`,
          text: post.text.slice(0, 120),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (nextError) {
      if (nextError instanceof Error && nextError.name === "AbortError") {
        return;
      }
      setError("Post link could not be shared.");
    }
  }, []);

  const openDeleteModal = useCallback(
    (post: Post) => {
      if (!user) {
        onLogin();
        return;
      }
      setDeleteTarget(post);
    },
    [onLogin, user],
  );

  const archivePost = useCallback(async () => {
    if (!user || !deleteTarget) return;
    setActingId(deleteTarget.id);
    setError(null);
    try {
      await apiRequest<{ success: boolean }>("/api/post-actions", {
        method: "POST",
        body: JSON.stringify({
          action: "archive",
          postId: deleteTarget.id,
        }),
      });
      setPosts((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Post could not be deleted. Only the author or admin can delete it.",
      );
    } finally {
      setActingId(null);
    }
  }, [deleteTarget, user]);

  const closeShareComposer = useCallback(() => {
    setShareTarget(null);
    void loadPosts();
  }, [loadPosts]);

  return {
    user,
    posts,
    loading,
    actingId,
    openReplies,
    repliesByPost,
    replyDrafts,
    loadingReplies,
    savingReply,
    deleteTarget,
    setDeleteTarget,
    editingPost,
    setEditingPost,
    editingText,
    setEditingText,
    tradePickerOpen,
    setTradePickerOpen,
    tradePickerLoading,
    tradePickerQuery,
    setTradePickerQuery,
    shareAccountFilter,
    setShareAccountFilter,
    shareAccountOptions,
    filteredShareTrades,
    shareTarget,
    setShareTarget,
    isAdmin,
    error,
    lightboxUrl,
    setLightboxUrl,
    observePost,
    openProfile,
    openJournal,
    toggleLike,
    toggleBookmark,
    toggleRepost,
    openEditPost,
    savePostEdit,
    toggleReplies,
    addReply,
    setReplyDrafts,
    sharePost,
    openDeleteModal,
    archivePost,
    closeShareComposer,
  };
}
