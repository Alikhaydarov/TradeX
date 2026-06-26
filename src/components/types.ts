export type Section = "feed" | "chat" | "journal" | "backtest" | "account" | "pricing" | "admin";

export interface Post {
  id: string;
  userId?: string;
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
  bio: string;
  tradingStyle: string;
  location: string;
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  isAdmin?: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  createdAt: string | null;
}

export interface JournalEntry {
  id: string;
  propAccountId?: string | null;
  symbol: string;
  side: "Long" | "Short";
  entry: number;
  exit: number;
  quantity: number;
  fees: number;
  pnl: number;
  date: string;
  note: string;
  rawDate?: string;
  accountName?: string;
  marketType?: string;
  setup?: string;
  emotion?: string;
  riskAmount?: number;
  resultR?: number;
  riskPercent?: string;
  session?: string;
  followingPlan?: boolean;
  errorMade?: boolean;
  mistakeType?: string;
  reviewCompleted?: boolean;
  toTradingBible?: boolean;
  imageUrl?: string | null;
  imageUrls?: string[];
  tags?: string[];
  accountSize?: number;
  profitTarget?: number;
  maxDrawdown?: number;
}

export interface PropAccount {
  id: string;
  name: string;
  accountType?: "prop" | "real";
  firm: string;
  propSite?: string;
  propLogin?: string;
  importSource?: "manual" | "metaapi" | "ctrader" | "tradovate" | "ninjatrader" | "official_api";
  platform?: string;
  phase: string;
  marketType: string;
  accountSize: number;
  initialBalance: number;
  profitTarget: number;
  maxDrawdown: number;
  dailyDrawdown: number;
  startDate: string;
  status: "Active" | "Passed" | "Failed" | "Paused";
}

export interface BacktestResult {
  id?: string;
  createdAt?: string;
  asset: string;
  strategy: string;
  timeframe: string;
  period: string;
  initialBalance: number;
  netReturn: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  tradesCount: number;
  equityCurve: Array<{ step: number; equity: number }>;
}
