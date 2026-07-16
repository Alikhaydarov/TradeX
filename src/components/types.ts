export type Section =
  | "feed"
  | "accounts"
  | "dashboard"
  | "calendar"
  | "trades"
  | "analytics"
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
  bio: string;
  tradingStyle: string;
  location: string;
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  plan?: "free" | "standard" | "pro";
  isAdmin?: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  plan: "free" | "standard" | "pro";
  premiumUntil: string | null;
  aiEnabled: boolean;
  traderoxEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  subscriptionProvider: string | null;
  accountsCount: number;
  journalEntriesCount: number;
  postsCount: number;
  createdAt: string | null;
  lastSignInAt: string | null;
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
  importSource?: "manual" | "mt5_bridge" | "ctrader" | "tradovate" | "ninjatrader" | "projectx" | "official_api";
  platform?: string;
  phase: string;
  marketType: string;
  accountSize: number;
  initialBalance: number;
  profitTarget: number;
  maxDrawdown: number;
  dailyDrawdown: number;
  startDate: string;
  status: "Active" | "Processing" | "Passed" | "Failed" | "Paused";
}

export interface OpenPosition {
  id: string;
  accountId: string;
  propAccountId?: string | null;
  symbol: string;
  side: "long" | "short" | string;
  volume: number;
  entryPrice: number | null;
  currentPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  unrealizedPnl: number | null;
  openedAt: string | null;
  status: "open" | "closed" | string;
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
