export type Section = "feed" | "chat" | "journal" | "backtest" | "account";

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
  liked?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId?: string;
  name: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string;
  tradingStyle: string;
  location: string;
}

export interface JournalEntry {
  id: number;
  symbol: string;
  side: "Long" | "Short";
  entry: number;
  exit: number;
  pnl: number;
  date: string;
  note: string;
}
