import type { Profile } from "../types";

export type ProfileView = Profile & { isFollowing?: boolean };

export interface Achievement {
  id: string;
  title: string;
  issuer: string;
  achievement_type: "funded" | "payout";
  image_url: string;
  issued_at: string | null;
}

export interface TradingStats {
  trades: number;
  winRate: number;
  netPnl: number;
  averageR: number;
}

export interface ConnectionUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string;
  tradingStyle: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isVerified?: boolean;
  isSelf?: boolean;
}

export type ProfileTab = "posts" | "media";
