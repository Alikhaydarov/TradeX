export type Section = "feed" | "chat" | "journal" | "backtest" | "account" | "admin";

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
  price?: string;
  target?: string;
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  liked?: boolean;
  bookmarked?: boolean;
  isVerified?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  isPrivate?: boolean;
  members?: ChatMember[];
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
  symbol: string;
  side: "Long" | "Short";
  entry: number;
  exit: number;
  quantity: number;
  fees: number;
  pnl: number;
  date: string;
  note: string;
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
