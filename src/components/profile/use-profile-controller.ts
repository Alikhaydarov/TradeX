"use client";

import { useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { hasVerifiedPremiumAccess } from "@/lib/premium-plan";
import { toSocialPost, type SocialPostRecord } from "@/lib/social-format";
import { validateUsername } from "@/lib/username";
import { useAuth } from "../auth-context";
import type { Post, Profile } from "../types";
import type {
  Achievement,
  ConnectionUser,
  ProfileTab,
  ProfileView,
  TradingStats,
} from "./profile-types";

interface ProfileRecord {
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
}

type PostRecord = SocialPostRecord;

const EMPTY_STATS: TradingStats = {
  trades: 0,
  winRate: 0,
  netPnl: 0,
  averageR: 0,
};

function toProfile(data: ProfileRecord): ProfileView {
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

export interface ProfileSeed {
  profile: ProfileRecord;
  posts: PostRecord[];
  achievements?: Achievement[];
  stats?: TradingStats;
}

export function useProfileController(
  profileUsername?: string,
  seed?: ProfileSeed,
) {
  const { user, configured, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileView | null>(
    () => (seed ? toProfile(seed.profile) : null),
  );
  const [draftProfile, setDraftProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>(
    () => (seed ? seed.posts.map((post) => toSocialPost(post)) : []),
  );
  const [achievements, setAchievements] = useState<Achievement[]>(
    () => seed?.achievements ?? [],
  );
  const [viewingAchievement, setViewingAchievement] =
    useState<Achievement | null>(null);
  const [stats, setStats] = useState<TradingStats>(
    () => seed?.stats ?? EMPTY_STATS,
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [loadingProfile, setLoadingProfile] = useState(!seed);
  const [editOpen, setEditOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState<
    "followers" | "following" | null
  >(null);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsActingId, setConnectionsActingId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementIssuer, setAchievementIssuer] = useState("");
  const [achievementType, setAchievementType] = useState<"funded" | "payout">(
    "funded",
  );
  const [achievementImage, setAchievementImage] = useState("");
  const [achievementBusy, setAchievementBusy] = useState(false);
  const viewedPosts = useRef<Set<string>>(new Set());
  const pendingPostViews = useRef<Set<string>>(new Set());
  const postViewRetries = useRef<Map<string, number>>(new Map());
  const postViewRetryTimers = useRef<Set<number>>(new Set());
  const viewObserver = useRef<IntersectionObserver | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const seededRef = useRef(Boolean(seed));

  useEffect(
    () => () => {
      viewObserver.current?.disconnect();
      postViewRetryTimers.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      postViewRetryTimers.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setLoadingProfile(false), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    // With a server-resolved seed on screen there is nothing to wait for, so
    // the refresh runs silently instead of tearing the page back to a skeleton.
    const startTimer = window.setTimeout(() => {
      if (!active) return;
      if (!seededRef.current) setLoadingProfile(true);
      seededRef.current = false;
      setError(null);
    }, 0);

    const request = profileUsername
      ? apiRequest<{
          profile: ProfileRecord;
          posts: PostRecord[];
          achievements?: Achievement[];
          stats?: TradingStats;
        }>(`/api/profile/${profileUsername}`, { cacheMs: 30_000 })
      : apiRequest<{
          profile: ProfileRecord;
          posts: PostRecord[];
          achievements?: Achievement[];
          stats?: TradingStats;
        }>("/api/profile", { cacheMs: 30_000 });

    request
      .then((data) => {
        if (!active) return;
        setProfile(toProfile(data.profile));
        setPosts(data.posts.map((post) => toSocialPost(post)));
        setAchievements(data.achievements ?? []);
        setStats(data.stats ?? EMPTY_STATS);
      })
      .catch((nextError) => {
        if (active) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Profile failed to load.",
          );
        }
      })
      .finally(() => {
        if (!active) return;
        setLoadingProfile(false);
        window.dispatchEvent(new Event("tradeup:profile-ready"));
      });

    return () => {
      active = false;
      window.clearTimeout(startTimer);
    };
  }, [profileUsername, user]);

  const isOwnProfile = Boolean(profile && user && profile.id === user.id);

  const openEdit = () => {
    if (!profile || !isOwnProfile) return;
    setDraftProfile(profile);
    setEditOpen(true);
  };

  const uploadAchievementImage = async (file?: File) => {
    if (!file) return;
    setAchievementBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/journal/image", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.imageUrl) {
        throw new Error(payload.error || "Certificate upload failed.");
      }
      setAchievementImage(payload.imageUrl);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Certificate upload failed.",
      );
    } finally {
      setAchievementBusy(false);
    }
  };

  const addAchievement = async () => {
    if (!achievementTitle.trim() || !achievementImage) return;
    setAchievementBusy(true);
    try {
      const { achievement } = await apiRequest<{ achievement: Achievement }>(
        "/api/profile/achievements",
        {
          method: "POST",
          body: JSON.stringify({
            title: achievementTitle,
            issuer: achievementIssuer,
            type: achievementType,
            imageUrl: achievementImage,
          }),
        },
      );
      setAchievements((current) => [achievement, ...current]);
      setAchievementOpen(false);
      setAchievementTitle("");
      setAchievementIssuer("");
      setAchievementImage("");
      setAchievementType("funded");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Achievement save failed.",
      );
    } finally {
      setAchievementBusy(false);
    }
  };

  const removeAchievement = async (id: string) => {
    try {
      await apiRequest(
        `/api/profile/achievements?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      setAchievements((current) =>
        current.filter((item) => item.id !== id),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Achievement remove failed.",
      );
    }
  };

  const save = async () => {
    if (!draftProfile || !isOwnProfile) return;
    const usernameCheck = validateUsername(draftProfile.username);
    if (!usernameCheck.valid) {
      setError(usernameCheck.error);
      return;
    }

    setError(null);
    try {
      const { profile: data } = await apiRequest<{ profile: ProfileRecord }>(
        "/api/profile",
        { method: "PATCH", body: JSON.stringify(draftProfile) },
      );
      setProfile(toProfile(data));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      setEditOpen(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Profile was not saved.",
      );
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !profile || !user || !isOwnProfile) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as {
        avatarUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.avatarUrl) {
        throw new Error(payload.error || "Avatar upload failed.");
      }
      const nextProfile = {
        ...(draftProfile ?? profile),
        avatarUrl: payload.avatarUrl,
      };
      setDraftProfile(nextProfile);
      setProfile(nextProfile);
      setPosts((current) =>
        current.map((post) =>
          post.userId === user.id
            ? { ...post, avatar: payload.avatarUrl || post.avatar }
            : post,
        ),
      );
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Avatar upload failed.",
      );
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const uploadBanner = async (file?: File) => {
    if (!file || !profile || !isOwnProfile) return;
    setUploadingBanner(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("banner", file);
      const response = await fetch("/api/profile/banner", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as {
        bannerUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.bannerUrl) {
        throw new Error(payload.error || "Banner upload failed.");
      }
      const nextProfile = {
        ...(draftProfile ?? profile),
        bannerUrl: payload.bannerUrl,
      };
      setDraftProfile(nextProfile);
      setProfile(nextProfile);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Banner upload failed.",
      );
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const toggleFollow = async () => {
    if (!profile || isOwnProfile) return;
    setFollowLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{
        following: boolean;
        followersCount: number;
      }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setProfile({
        ...profile,
        isFollowing: response.following,
        followersCount: response.followersCount,
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Follow failed.",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const openConnections = (type: "followers" | "following") => {
    if (!profile) return;
    setConnectionsOpen(type);
    setConnections([]);
    setConnectionsLoading(true);
    setError(null);
    void apiRequest<{ users: ConnectionUser[] }>(
      `/api/social/connections?userId=${profile.id}&type=${type}`,
    )
      .then((response) => setConnections(response.users))
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Connections failed.",
        ),
      )
      .finally(() => setConnectionsLoading(false));
  };

  const toggleConnectionFollow = async (target: ConnectionUser) => {
    if (target.isSelf) return;
    setConnectionsActingId(target.id);
    setError(null);
    try {
      const response = await apiRequest<{
        following: boolean;
        followersCount: number;
      }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: target.id }),
      });
      setConnections((current) =>
        current.map((item) =>
          item.id === target.id
            ? {
                ...item,
                isFollowing: response.following,
                followersCount: response.followersCount,
              }
            : item,
        ),
      );
      if (profile && target.id === profile.id) {
        setProfile({
          ...profile,
          isFollowing: response.following,
          followersCount: response.followersCount,
        });
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Follow failed.",
      );
    } finally {
      setConnectionsActingId(null);
    }
  };

  const recordPostView = (postId: string) => {
    if (
      !user ||
      viewedPosts.current.has(postId) ||
      pendingPostViews.current.has(postId)
    ) {
      return;
    }
    pendingPostViews.current.add(postId);
    void apiRequest<{ success: boolean; views?: number | null }>(
      "/api/post-actions",
      {
        method: "POST",
        body: JSON.stringify({ action: "view", postId }),
      },
    )
      .then((response) => {
        viewedPosts.current.add(postId);
        postViewRetries.current.delete(postId);
        if (typeof response.views !== "number") return;
        setPosts((current) =>
          current.map((item) =>
            item.id === postId
              ? { ...item, views: response.views as number }
              : item,
          ),
        );
      })
      .catch(() => {
        const attempts = postViewRetries.current.get(postId) ?? 0;
        if (attempts >= 2) return;
        postViewRetries.current.set(postId, attempts + 1);
        const timer = window.setTimeout(() => {
          postViewRetryTimers.current.delete(timer);
          recordPostView(postId);
        }, 1200 * (attempts + 1));
        postViewRetryTimers.current.add(timer);
      })
      .finally(() => {
        pendingPostViews.current.delete(postId);
      });
  };

  const observePostView = (node: HTMLElement | null, postId: string) => {
    if (!node || !user) return;
    if (!viewObserver.current) {
      viewObserver.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
              const id = entry.target.getAttribute("data-post-id");
              if (id) recordPostView(id);
            }
          }
        },
        { threshold: [0.55] },
      );
    }
    node.setAttribute("data-post-id", postId);
    viewObserver.current.observe(node);
  };

  return {
    user,
    configured,
    signOut,
    profile,
    draftProfile,
    setDraftProfile,
    posts,
    achievements,
    viewingAchievement,
    setViewingAchievement,
    stats,
    activeTab,
    setActiveTab,
    loadingProfile,
    editOpen,
    setEditOpen,
    saved,
    uploadingAvatar,
    uploadingBanner,
    followLoading,
    connectionsOpen,
    setConnectionsOpen,
    connections,
    connectionsLoading,
    connectionsActingId,
    error,
    achievementOpen,
    setAchievementOpen,
    achievementTitle,
    setAchievementTitle,
    achievementIssuer,
    setAchievementIssuer,
    achievementType,
    setAchievementType,
    achievementImage,
    achievementBusy,
    avatarInputRef,
    bannerInputRef,
    isOwnProfile,
    openEdit,
    uploadAchievementImage,
    addAchievement,
    removeAchievement,
    save,
    uploadAvatar,
    uploadBanner,
    toggleFollow,
    openConnections,
    toggleConnectionFollow,
    observePostView,
  };
}
