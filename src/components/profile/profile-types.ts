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

export type ProfileTab = "posts" | "media";
