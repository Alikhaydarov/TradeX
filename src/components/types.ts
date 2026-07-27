export type Section =
  | "feed"
  | "accounts"
  | "dashboard"
  | "calendar"
  | "trades"
  | "analytics"
  | "backtest"
  | "community"
  | "settings"
  | "account"
  | "pricing"
  | "admin";

export interface Post {
  id: string;
  userId?: string;
  timelineType?: "post" | "reply" | "repost";
  name: string;
  handle: string;
  avatar: string;
  time: string;
  text: string;
  symbol?: string;
  side?: "LONG" | "SHORT";
  result?: "WIN" | "LOSS" | "BE";
  pnl?: number;
  resultR?: number;
  price?: string;
  target?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  chartImageUrl?: string | null;
  shareImageUrl?: string | null;
  journalEntryId?: string | null;
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  liked?: boolean;
  bookmarked?: boolean;
  reposted?: boolean;
  isVerified?: boolean;
  parentPostId?: string | null;
  parentPostAuthor?: string | null;
  parentPostHandle?: string | null;
  parentPostText?: string | null;
}

export interface PostReply {
  id: string;
  postId: string;
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified?: boolean;
  content: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  isPrivate?: boolean;
  isCommunity?: boolean;
  members?: ChatMember[];
}

export interface MessageReply {
  id: string;
  name: string;
  text: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId?: string;
  name: string;
  avatar: string;
  text: string;
  createdAt: string;
  isVerified?: boolean;
  replyTo?: MessageReply | null;
}

export interface ChatMember {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified?: boolean;
}

export interface UserOption {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified?: boolean;
}

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio: string;
  tradingStyle: string;
  location: string;
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  plan?: "free" | "standard" | "pro";
  isAdmin?: boolean;
  statsVisible?: boolean;
}

export interface PropAccount {
  id: string;
  name: string;
  firm: string;
  phase: string;
  marketType: string;
  accountSize: number;
  currentBalance?: number;
  startingBalance?: number;
  currency?: string;
  status?: string;
  isArchived?: boolean;
  importedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
