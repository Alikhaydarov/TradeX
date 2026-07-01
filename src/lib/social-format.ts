import type { Post } from "@/components/types";

export interface SocialPostRecord {
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
  trade_result?: "WIN" | "LOSS" | "BE" | null;
  pnl?: number | null;
  result_r?: number | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  views_count?: number | null;
  created_at: string;
}

export function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

export function formatRelativeTime(value: string | Date | number) {
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function parseTradeImages(value?: string | null, limit = 3) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, limit)
      : [value];
  } catch {
    return [value];
  }
}

export function toSocialPost(record: SocialPostRecord, state?: { liked?: boolean; bookmarked?: boolean; reposted?: boolean }): Post {
  const isJournalPost = Boolean(record.entry_price?.startsWith("journal:"));
  const chartImages = isJournalPost ? parseTradeImages(record.target_price) : [];
  const shareImage = isJournalPost ? record.image_url : null;

  return {
    id: record.id,
    userId: record.user_id,
    name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.slice(0, 2).toUpperCase(),
    time: formatRelativeTime(record.created_at),
    text: record.content,
    imageUrl: record.image_url ?? null,
    chartImageUrl: chartImages[0] ?? null,
    shareImageUrl: shareImage,
    imageUrls: [...chartImages, ...(shareImage ? [shareImage] : [])],
    journalEntryId: isJournalPost ? record.entry_price?.slice(8) ?? null : null,
    symbol: record.symbol ?? undefined,
    side: record.side ?? undefined,
    result: record.trade_result ?? undefined,
    pnl: record.pnl ?? undefined,
    resultR: record.result_r ?? undefined,
    price: isJournalPost ? undefined : record.entry_price ?? undefined,
    target: isJournalPost ? undefined : record.target_price ?? undefined,
    likes: record.likes_count,
    replies: record.replies_count,
    reposts: record.reposts_count,
    views: record.views_count ?? 0,
    liked: state?.liked,
    bookmarked: state?.bookmarked,
    reposted: state?.reposted,
    isVerified: Boolean(record.author_is_verified),
  };
}
