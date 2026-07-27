"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-context";
import type { Post, Profile } from "@/components/types";
import { apiRequest } from "@/lib/api-client";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { toSocialPost, type SocialPostRecord } from "@/lib/social-format";
import { validateUsername } from "@/lib/username";

export type ProfileAchievement = {
  id: string;
  title: string;
  issuer: string;
  achievement_type: "funded" | "payout";
  image_url: string;
  issued_at: string | null;
};

export type ProfileStats = {
  trades: number;
  winRate: number;
  netPnl: number;
  averageR: number;
};

export type ConnectionUser = {
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
};

type ProfileRecord = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio: string;
  trading_style: string;
  location: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  is_verified?: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
  ai_enabled?: boolean | null;
  auto_sync_enabled?: boolean | null;
  stats_visible?: boolean | null;
};

function toProfile(data: ProfileRecord): Profile & { isFollowing?: boolean } {
  const rawPlan = data.plan?.toLowerCase();
  const plan =
    rawPlan === "standard"
      ? "standard"
      : rawPlan === "pro" || rawPlan === "premium"
        ? "pro"
        : "free";
  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    bannerUrl: data.banner_url ?? null,
    bio: data.bio ?? "",
    tradingStyle: data.trading_style ?? "Price Action",
    location: data.location ?? "",
    followersCount: data.followersCount ?? 0,
    followingCount: data.followingCount ?? 0,
    isVerified: hasVerifiedPremiumAccess(data),
    plan,
    isFollowing: Boolean(data.isFollowing),
    statsVisible: data.stats_visible !== false,
  };
}

export function useProfileData(profileUsername?: string) {
  const { user, configured, signOut } = useAuth();
  const [profile, setProfile] = useState<
    (Profile & { isFollowing?: boolean }) | null
  >(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [achievements, setAchievements] = useState<ProfileAchievement[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    trades: 0,
    winRate: 0,
    netPnl: 0,
    averageR: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = profileUsername
        ? `/api/profile/${encodeURIComponent(profileUsername)}`
        : "/api/profile";
      const data = await apiRequest<{
        profile: ProfileRecord;
        posts: SocialPostRecord[];
        achievements?: ProfileAchievement[];
        stats?: ProfileStats;
      }>(endpoint);
      setProfile(toProfile(data.profile));
      setPosts(data.posts.map((post) => toSocialPost(post)));
      setAchievements(data.achievements || []);
      setStats(
        data.stats || { trades: 0, winRate: 0, netPnl: 0, averageR: 0 },
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Profile failed to load.",
      );
    } finally {
      setLoading(false);
    }
  }, [profileUsername, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = useCallback(async (draft: Profile) => {
    const validation = validateUsername(draft.username);
    if (!validation.valid) {
      setError(validation.error);
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<{ profile: ProfileRecord }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setProfile(toProfile(response.profile));
      return true;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Profile was not saved.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const uploadProfileImage = useCallback(async (
    kind: "avatar" | "banner",
    file?: File,
  ) => {
    if (!file || !profile) return null;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append(kind, file);
      const response = await fetch(`/api/profile/${kind}`, {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const payload = (await response.json()) as {
        avatarUrl?: string;
        bannerUrl?: string;
        error?: string;
      };
      const url = kind === "avatar" ? payload.avatarUrl : payload.bannerUrl;
      if (!response.ok || !url) {
        throw new Error(payload.error || `${kind} upload failed.`);
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              ...(kind === "avatar" ? { avatarUrl: url } : { bannerUrl: url }),
            }
          : current,
      );
      if (kind === "avatar") {
        setPosts((current) =>
          current.map((post) =>
            post.userId === user?.id ? { ...post, avatar: url } : post,
          ),
        );
      }
      return url;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : `${kind} upload failed.`,
      );
      return null;
    } finally {
      setBusy(false);
    }
  }, [profile, user?.id]);

  const toggleFollow = useCallback(async () => {
    if (!profile || profile.id === user?.id) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<{
        following: boolean;
        followersCount: number;
      }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: response.following,
              followersCount: response.followersCount,
            }
          : current,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Follow failed.");
    } finally {
      setBusy(false);
    }
  }, [profile, user?.id]);

  const addAchievement = useCallback(async (input: {
    title: string;
    issuer: string;
    type: "funded" | "payout";
    imageUrl: string;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<{ achievement: ProfileAchievement }>(
        "/api/profile/achievements",
        { method: "POST", body: JSON.stringify(input) },
      );
      setAchievements((current) => [response.achievement, ...current]);
      return true;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Achievement save failed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const removeAchievement = useCallback(async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(
        `/api/profile/achievements?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      setAchievements((current) => current.filter((item) => item.id !== id));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Achievement remove failed.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const loadConnections = useCallback(async (type: "followers" | "following") => {
    if (!profile) return [];
    const response = await apiRequest<{ users: ConnectionUser[] }>(
      `/api/social/connections?userId=${encodeURIComponent(profile.id)}&type=${type}`,
    );
    return response.users;
  }, [profile]);

  return {
    user,
    configured,
    signOut,
    profile,
    posts,
    achievements,
    stats,
    loading,
    busy,
    error,
    setError,
    reload: load,
    saveProfile,
    uploadProfileImage,
    toggleFollow,
    addAchievement,
    removeAchievement,
    loadConnections,
  };
}
