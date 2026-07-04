"use client";

import {
  Award,
  Bookmark,
  Camera,
  Check,
  Eye,
  Heart,
  ImageIcon,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  PenLine,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { formatCount, toSocialPost, type SocialPostRecord } from "@/lib/social-format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { XSpinner } from "./app-loader";
import { InstrumentBadge } from "./instrument-badge";
import { useAuth } from "./auth-context";
import { MediaImage } from "./media-image";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { Post, Profile } from "./types";

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
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
}

interface ConnectionUser {
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

type PostRecord = SocialPostRecord;

interface Achievement {
  id: string;
  title: string;
  issuer: string;
  achievement_type: "funded" | "payout";
  image_url: string;
  issued_at: string | null;
}

interface TradingStats {
  trades: number;
  winRate: number;
  netPnl: number;
  averageR: number;
}

interface PremiumStatus {
  isPremium: boolean;
  aiEnabled: boolean;
  traderoxEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
}

type ProfileTab = "posts" | "media";

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "posts", label: "Posts" },
  { id: "media", label: "Media" },
];

function toProfile(data: ProfileRecord): Profile & { isFollowing?: boolean } {
  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    bio: data.bio ?? "",
    tradingStyle: data.trading_style ?? "Price Action",
    location: data.location ?? "",
    followersCount: data.followersCount ?? 0,
    followingCount: data.followingCount ?? 0,
    isVerified: Boolean(data.is_verified),
    isFollowing: Boolean(data.isFollowing),
  };
}

function formatMoneyCompact(value: number) {
  const sign = value >= 0 ? "+" : "-";
  const amount = Math.abs(value);
  return `${sign}$${new Intl.NumberFormat("en-US", {
    notation: amount >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function EmptyTab({ tab }: { tab: ProfileTab }) {
  const title = tab === "posts" ? "No posts yet" : "No media yet";
  const description = tab === "posts" ? "Posts will appear here." : "Image posts will appear here.";

  return (
    <div className="grid min-h-64 place-items-center px-8 text-center">
      <div>
        <ImageIcon className="mx-auto text-slate-600" size={36} />
        <h3 className="mt-4 text-2xl font-black">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function openProfileRoute(username: string) {
  const clean = username.replace(/^@/, "").toLowerCase();
  window.history.pushState(null, "", `/${clean}`);
  window.dispatchEvent(new Event("tradeup:open-profile"));
}

export function Account({ onLogin, profileUsername }: { onLogin: () => void; profileUsername?: string }) {
  const { user, configured, signOut } = useAuth();
  const [profile, setProfile] = useState<(Profile & { isFollowing?: boolean }) | null>(null);
  const [draftProfile, setDraftProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [viewingAchievement, setViewingAchievement] = useState<Achievement | null>(null);
  const [stats, setStats] = useState<TradingStats>({ trades: 0, winRate: 0, netPnl: 0, averageR: 0 });
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState<"followers" | "following" | null>(null);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsActingId, setConnectionsActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementIssuer, setAchievementIssuer] = useState("");
  const [achievementType, setAchievementType] = useState<"funded" | "payout">("funded");
  const [achievementImage, setAchievementImage] = useState("");
  const [achievementBusy, setAchievementBusy] = useState(false);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setLoadingProfile(false), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    const startTimer = window.setTimeout(() => {
      if (!active) return;
      setLoadingProfile(true);
      setError(null);
    }, 0);

    const load = profileUsername
      ? apiRequest<{ profile: ProfileRecord; posts: PostRecord[]; achievements?: Achievement[]; stats?: TradingStats }>(`/api/profile/${profileUsername}`)
      : apiRequest<{ profile: ProfileRecord; posts: PostRecord[]; achievements?: Achievement[]; stats?: TradingStats }>("/api/profile");

    load
      .then((data) => {
        if (!active) return;
        setProfile(toProfile(data.profile));
        setPosts(data.posts.map((post) => toSocialPost(post)));
        setAchievements(data.achievements ?? []);
        setStats(data.stats ?? { trades: 0, winRate: 0, netPnl: 0, averageR: 0 });
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Profile failed to load.");
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
  }, [user, profileUsername]);

  useEffect(() => {
    if (!user || profileUsername) {
      setPremium(null);
      return;
    }
    let active = true;
    apiRequest<PremiumStatus>("/api/premium/status")
      .then((status) => { if (active) setPremium(status); })
      .catch(() => { if (active) setPremium({ isPremium: false, aiEnabled: false, traderoxEnabled: false, autoSyncEnabled: false, isVerified: false }); });
    return () => { active = false; };
  }, [user, profileUsername]);

  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-[#171717]/50 px-4 backdrop-blur-2xl">
          <h1 className="text-xl font-extrabold">Profile</h1>
        </header>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[.04] backdrop-blur-2xl">
            <UserRound size={36} className="text-xmuted" />
          </div>
          <h2 className="mt-6 text-2xl font-black">Create your profile</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-xmuted">Sign in with Google to save your posts, chats, and trading profile in the cloud.</p>
          <button onClick={onLogin} className="mt-6 rounded-full bg-white px-7 py-3 font-bold text-black">Sign in with Google</button>
          {!configured && <p className="mt-4 text-xs text-amber-300">Demo mode is active.</p>}
        </div>
      </>
    );
  }

  if (loadingProfile && !profile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="h-14 border-b border-border bg-card" />
        <div className="mx-auto max-w-3xl animate-pulse px-3 py-4 sm:px-5">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="h-32 bg-white/[.035] sm:h-44" />
            <div className="px-5 pb-6">
              <div className="-mt-10 size-24 rounded-full border-4 border-card bg-zinc-800 sm:-mt-14 sm:size-28" />
              <div className="mt-4 h-6 w-44 rounded bg-zinc-800" />
              <div className="mt-3 h-4 w-28 rounded bg-zinc-900" />
              <div className="mt-6 h-4 w-72 max-w-full rounded bg-zinc-900" />
            </div>
          </div>
          <div className="mt-3 h-48 rounded-lg border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="grid min-h-[70vh] place-items-center text-slate-500">Profile not found.</div>;
  }

  const isOwnProfile = profile.id === user.id;
  const mediaPosts = posts.filter((post) => post.imageUrl || post.chartImageUrl || post.shareImageUrl);
  const visiblePosts = activeTab === "posts" ? posts : activeTab === "media" ? mediaPosts : [];

  const openEdit = () => {
    if (!isOwnProfile) return;
    setDraftProfile(profile);
    setEditOpen(true);
  };

  const uploadAchievementImage = async (file?: File) => {
    if (!file) return;
    setAchievementBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/journal/image", { method: "POST", body: form });
      const payload = await response.json() as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "Certificate upload failed.");
      setAchievementImage(payload.imageUrl);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Certificate upload failed.");
    } finally {
      setAchievementBusy(false);
    }
  };

  const addAchievement = async () => {
    if (!achievementTitle.trim() || !achievementImage) return;
    setAchievementBusy(true);
    try {
      const { achievement } = await apiRequest<{ achievement: Achievement }>("/api/profile/achievements", {
        method: "POST",
        body: JSON.stringify({ title: achievementTitle, issuer: achievementIssuer, type: achievementType, imageUrl: achievementImage }),
      });
      setAchievements((current) => [achievement, ...current]);
      setAchievementOpen(false);
      setAchievementTitle(""); setAchievementIssuer(""); setAchievementImage(""); setAchievementType("funded");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Achievement save failed.");
    } finally {
      setAchievementBusy(false);
    }
  };

  const removeAchievement = async (id: string) => {
    try {
      await apiRequest(`/api/profile/achievements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setAchievements((current) => current.filter((item) => item.id !== id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Achievement remove failed.");
    }
  };

  const save = async () => {
    if (!draftProfile || !isOwnProfile) return;
    setError(null);
    try {
      const { profile: data } = await apiRequest<{ profile: ProfileRecord }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(draftProfile),
      });
      setProfile(toProfile(data));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      setEditOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Profile was not saved.");
    }
  };

  const uploadAvatar = async (file: File | undefined) => {
    if (!file || !isOwnProfile) return;
    setUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", credentials: "same-origin", body: formData });
      const payload = (await response.json()) as { avatarUrl?: string; error?: string };
      if (!response.ok || !payload.avatarUrl) throw new Error(payload.error || "Avatar upload failed.");

      const nextProfile = { ...(draftProfile ?? profile), avatarUrl: payload.avatarUrl };
      setDraftProfile(nextProfile);
      setProfile(nextProfile);
      setPosts((current) => current.map((post) => post.userId === user.id ? { ...post, avatar: payload.avatarUrl || post.avatar } : post));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleFollow = async () => {
    if (isOwnProfile) return;
    setFollowLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ following: boolean; followersCount: number }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setProfile({ ...profile, isFollowing: response.following, followersCount: response.followersCount });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Follow failed.");
    } finally {
      setFollowLoading(false);
    }
  };

  const openConnections = (type: "followers" | "following") => {
    setConnectionsOpen(type);
    setConnections([]);
    setConnectionsLoading(true);
    setError(null);
    apiRequest<{ users: ConnectionUser[] }>(`/api/social/connections?userId=${profile.id}&type=${type}`)
      .then((response) => setConnections(response.users))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Connections failed."))
      .finally(() => setConnectionsLoading(false));
  };

  const toggleConnectionFollow = async (target: ConnectionUser) => {
    if (target.isSelf) return;
    setConnectionsActingId(target.id);
    setError(null);
    try {
      const response = await apiRequest<{ following: boolean; followersCount: number }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: target.id }),
      });
      setConnections((current) => current.map((item) => item.id === target.id ? { ...item, isFollowing: response.following, followersCount: response.followersCount } : item));
      if (target.id === profile.id) setProfile({ ...profile, isFollowing: response.following, followersCount: response.followersCount });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Follow failed.");
    } finally {
      setConnectionsActingId(null);
    }
  };

  const renderPost = (post: Post) => (
    <article key={post.id} className="group border-b border-white/8 bg-[#171717] px-4 py-5 last:border-b-0 transition hover:bg-white/[.025] sm:px-6">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-4">
        <TraderAvatar name={post.name} value={post.avatar} className="mt-1 h-10 w-10 shrink-0 rounded-full text-xs ring-2 ring-white/5 transition group-hover:ring-white/15 sm:h-12 sm:w-12" />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-5 sm:text-sm">
            <p className="max-w-full truncate font-black text-white">{post.name}</p>
            {post.isVerified ? <VerifiedBadge /> : null}
            <p className="truncate text-xs text-slate-500">{post.handle}</p>
            <span className="text-xs text-slate-700">/</span>
            <p className="text-xs text-slate-500">{post.time}</p>
          </div>
          {post.symbol ? <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"><InstrumentBadge symbol={post.symbol} compact className="mr-auto rounded-xl bg-white/[.03]" /><span className="text-[10px] font-black text-zinc-300">{post.side}</span><span className={post.result === "WIN" ? "text-[10px] font-black text-emerald-300" : post.result === "LOSS" ? "text-[10px] font-black text-rose-300" : "text-[10px] font-black text-zinc-300"}>{post.result}</span>{typeof post.pnl === "number" ? <strong className={post.pnl >= 0 ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{post.pnl >= 0 ? "+" : ""}${post.pnl.toFixed(2)}</strong> : null}</div> : null}
          {post.text ? <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-slate-50">{post.text}</p> : null}
          {post.imageUrls?.length ? <div className={`mt-3 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 ${post.imageUrls.length === 1 ? "grid-cols-1" : post.imageUrls.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>{post.imageUrls.slice(0, 4).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="grid min-h-40 place-items-center overflow-hidden bg-black/90"><MediaImage src={url} alt={`Trade media ${index + 1}`} className="h-full max-h-[520px] w-full object-cover" /></a>)}</div> : post.imageUrl ? <a href={post.imageUrl} target="_blank" rel="noreferrer" className="mt-3 grid min-h-40 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/90"><MediaImage src={post.imageUrl} alt="Post media" className="max-h-[520px] max-w-full object-contain" /></a> : null}
          <div className="mt-3 grid max-w-md grid-cols-4 text-slate-500">
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-zinc-300"><MessageCircle size={16} />{post.replies}</span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-rose-200"><Heart size={16} />{post.likes}</span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-slate-300"><Eye size={16} />{formatCount(post.views)}</span>
            <span className="flex h-8 items-center gap-1.5 rounded-full text-[12px] transition hover:text-zinc-300"><Bookmark size={16} /></span>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className="min-h-full bg-[#0b0b0b]">
      {error && <div className="mx-auto mt-3 max-w-5xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="mx-auto max-w-3xl px-0 sm:px-4 sm:py-3">
        <section className="overflow-hidden border-b border-border bg-card sm:rounded-lg sm:border">
          <div className="h-20 bg-[linear-gradient(135deg,#111111,#202020)] sm:h-28" />
          <div className="px-4 pb-4 sm:px-5">
            <div className="-mt-9 flex items-end justify-between gap-3 sm:-mt-11">
              <TraderAvatar name={profile.fullName} value={profile.avatarUrl} className="h-20 w-20 rounded-full border-4 border-card bg-black text-xl shadow-xl sm:h-24 sm:w-24 sm:text-2xl" />
              {isOwnProfile ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => void signOut()} className="grid size-9 place-items-center rounded-lg border border-border text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200" aria-label="Sign out"><LogOut size={15} /></button>
                  <button onClick={openEdit} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white/[.025] px-3 text-xs font-bold text-white transition-colors hover:bg-white/[.06]"><PenLine size={14} /> Edit</button>
                </div>
              ) : (
                <button onClick={() => void toggleFollow()} disabled={followLoading} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black transition-colors ${profile.isFollowing ? "border border-border bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200" : "bg-white text-zinc-950 hover:bg-zinc-200"}`}>{followLoading ? <XSpinner size="sm" /> : profile.isFollowing ? <Check size={14} /> : <UserPlus size={14} />}{profile.isFollowing ? "Following" : "Follow"}</button>
              )}
            </div>

            <div className="mt-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-xl font-black leading-7 sm:text-2xl">{profile.fullName}</h2>
                {profile.isVerified ? <VerifiedBadge className="h-4 w-4" /> : null}
                {saved && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Saved</span>}
              </div>
              <p className="text-xs text-zinc-500">@{profile.username}</p>
              {profile.bio ? <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-5 text-zinc-200">{profile.bio}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500">
                {profile.location ? <p className="flex items-center gap-1"><MapPin size={13} /> {profile.location}</p> : null}
                <p className="flex items-center gap-1"><TrendingUp size={13} /> {profile.tradingStyle}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                <button onClick={() => openConnections("followers")} className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
                  <b className="font-black text-white">{formatCount(profile.followersCount ?? 0)}</b> Followers
                </button>
                <button onClick={() => openConnections("following")} className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
                  <b className="font-black text-white">{formatCount(profile.followingCount ?? 0)}</b> Following
                </button>
                <span><b className="font-black text-white">{posts.length}</b> Posts</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border bg-[#111111]">
              {[
                ["Trades", String(stats.trades)],
                ["Win", `${stats.winRate}%`],
                ["P&L", formatMoneyCompact(stats.netPnl)],
                ["Avg R", `${stats.averageR.toFixed(2)}R`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 px-2 py-2.5 text-center">
                  <strong className="block truncate font-mono text-xs text-zinc-100">{value}</strong>
                  <span className="mt-0.5 block text-[8px] font-bold uppercase text-zinc-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isOwnProfile ? (
          <section className="mt-2 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg border ${premium?.isPremium ? "border-sky-300/20 bg-sky-400/10 text-sky-300" : "border-white/10 bg-white/[.04] text-zinc-400"}`}>
                {premium?.isPremium ? <Sparkles size={18} /> : <LockKeyhole size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black">TradeWay Premium</h3>
                  {premium?.isVerified ? <VerifiedBadge size={15} /> : null}
                  {premium?.isPremium ? <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-black text-sky-300">Premium active</span> : <span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] font-black text-zinc-400">Free plan</span>}
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Verified badge, AI trade coaching and MT5 Auto Sync live in one clean workspace.
                </p>
              </div>
            </div>

            {!premium?.isPremium ? (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-white/8 bg-[#111111] p-3 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-xs leading-5 text-zinc-400">
                  Upgrade when you want AI review, blue verification and account-level sync in one flow.
                </p>
                <button
                  type="button"
                  onClick={() => { window.history.pushState(null, "", "/pricing"); window.dispatchEvent(new Event("popstate")); }}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                >
                  Upgrade
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["Verified", premium.isVerified ? "Enabled" : "Pending"],
                    ["AI enabled", premium.aiEnabled ? "Enabled" : "Off"],
                    ["Auto Sync", premium.autoSyncEnabled ? "Enabled" : "Off"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/8 bg-[#111111] px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">{label}</p>
                      <p className="mt-1 text-sm font-black text-zinc-100">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-white/8 bg-[#111111] p-3">
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Billing & access</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    MT5 is connected inside each trading account settings, so every imported trade lands in the correct journal and account workspace.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { window.history.pushState(null, "", "/journal"); window.dispatchEvent(new Event("popstate")); }}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-black text-zinc-200 transition hover:bg-white/[.06]"
                    >
                      Open journal accounts
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setBillingLoading(true);
                        setError(null);
                        try {
                          const response = await apiRequest<{ url: string }>("/api/stripe/portal", { method: "POST" });
                          window.location.assign(response.url);
                        } catch (nextError) {
                          setError(nextError instanceof Error ? nextError.message : "Billing portal is not ready yet.");
                        } finally {
                          setBillingLoading(false);
                        }
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-black text-black transition hover:bg-zinc-200"
                    >
                      {billingLoading ? <XSpinner size="sm" /> : null}
                      Manage billing
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {(achievements.length > 0 || isOwnProfile) ? <section className="mt-2 border-y border-border bg-card px-4 py-3 sm:rounded-lg sm:border">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-amber-300/15 bg-amber-300/[.06] text-amber-200"><Award size={15} /></span>
            <div className="min-w-0">
              <h3 className="text-sm font-black">Achievements</h3>
              <p className="truncate text-[10px] text-muted-foreground">{achievements.length} certificates</p>
            </div>
            {isOwnProfile ? <Button onClick={() => setAchievementOpen(true)} variant="ghost" size="sm" className="ml-auto"><Plus size={14} /> Add</Button> : null}
          </div>
          {achievements.length ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {achievements.map((item) => (
                <article key={item.id} className="group relative w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-[#111111] sm:w-40">
                  <button type="button" onClick={() => setViewingAchievement(item)} className="block w-full text-left">
                  <MediaImage src={item.image_url} alt={item.title} className="aspect-[16/10] w-full object-cover" />
                  <div className="p-2.5">
                    <span className={`text-[9px] font-black uppercase ${item.achievement_type === "payout" ? "text-emerald-300" : "text-amber-200"}`}>{item.achievement_type}</span>
                    <h4 className="mt-1 truncate text-xs font-bold">{item.title}</h4>
                  </div>
                  </button>
                  {isOwnProfile ? <button onClick={() => void removeAchievement(item.id)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/70 text-zinc-300 opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100" aria-label="Remove achievement"><Trash2 size={14} /></button> : null}
                </article>
              ))}
            </div>
          ) : null}
        </section> : null}

        <section className="border-b border-border bg-card sm:mt-2 sm:overflow-hidden sm:rounded-lg sm:border">
          <div className="relative z-10 grid grid-cols-2 border-b border-border bg-card">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative min-w-0 px-2 py-3 text-xs font-black transition-colors ${active ? "text-white" : "text-zinc-500 hover:bg-white/[.03] hover:text-zinc-300"}`}>{tab.label}{active ? <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-white" /> : null}</button>;
            })}
          </div>
          {loadingProfile ? <div className="grid min-h-48 place-items-center text-slate-500"><XSpinner size="lg" /></div> : visiblePosts.length ? <div className="relative z-0">{visiblePosts.map(renderPost)}</div> : <EmptyTab tab={activeTab} />}
        </section>
      </div>

      <Dialog open={achievementOpen} onOpenChange={setAchievementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add achievement</DialogTitle>
            <DialogDescription>Upload a funded or payout certificate.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-xs text-muted-foreground">Type<Select value={achievementType} onValueChange={(value) => setAchievementType(value as "funded" | "payout")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="funded">Funded</SelectItem><SelectItem value="payout">Payout</SelectItem></SelectContent></Select></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Title<Input value={achievementTitle} onChange={(event) => setAchievementTitle(event.target.value)} placeholder="100K Funded Account" /></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Issuer<Input value={achievementIssuer} onChange={(event) => setAchievementIssuer(event.target.value)} placeholder="FTMO" /></label>
            <label className="grid gap-2 text-xs text-muted-foreground">Certificate image<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAchievementImage(event.target.files?.[0])} /></label>
            {achievementImage ? <MediaImage src={achievementImage} alt="Certificate preview" className="max-h-48 w-full rounded-lg border border-border object-contain" /> : null}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setAchievementOpen(false)}>Cancel</Button>
            <Button disabled={achievementBusy || !achievementTitle.trim() || !achievementImage} onClick={() => void addAchievement()}>{achievementBusy ? <XSpinner size="sm" /> : <Award size={15} />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingAchievement)} onOpenChange={(open) => { if (!open) setViewingAchievement(null); }}>
        <DialogContent className="max-h-[96dvh] max-w-[min(1100px,calc(100vw-1rem))] overflow-hidden bg-black p-0 sm:max-w-[min(1100px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-white/10 bg-[#171717] px-4 py-3 pr-14 text-left">
            <DialogTitle>{viewingAchievement?.title}</DialogTitle>
            <DialogDescription>{viewingAchievement?.issuer || viewingAchievement?.achievement_type}</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[calc(96dvh-72px)] place-items-center overflow-auto p-2 sm:p-4">
            {viewingAchievement ? <MediaImage src={viewingAchievement.image_url} alt={viewingAchievement.title} className="max-h-[calc(96dvh-104px)] max-w-full object-contain" /> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen && Boolean(draftProfile)} onOpenChange={setEditOpen}>
        {draftProfile ? (
          <DialogContent className="max-h-[calc(100dvh-.5rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl" showCloseButton>
            <DialogHeader className="sticky top-0 z-20 border-b border-white/8 bg-[#171717]/95 px-5 py-4 text-left backdrop-blur-xl">
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>Profil ma&apos;lumotlari va trading uslubingizni yangilang.</DialogDescription>
            </DialogHeader>
            <div className="h-36 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
            <div className="px-5 pb-6">
              <div className="-mt-14 flex items-end">
                <div className="relative">
                  <TraderAvatar name={draftProfile.fullName} value={draftProfile.avatarUrl} className="h-28 w-28 rounded-[28px] border-4 border-[#171717] text-2xl" />
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
                  <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute inset-0 h-full w-full rounded-[28px] bg-black/45 text-white hover:bg-black/55">{uploadingAvatar ? <XSpinner size="sm" /> : <Camera size={24} />}</Button>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void signOut()} className="ml-auto mb-3 rounded-full"><LogOut size={15} /> Sign out</Button>
              </div>
              {error && <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
              <div className="mt-5 grid gap-4">
                <div className="grid gap-2"><Label htmlFor="profile-name">Name</Label><Input id="profile-name" value={draftProfile.fullName} onChange={(event) => setDraftProfile({ ...draftProfile, fullName: event.target.value })} /></div>
                <div className="grid gap-2"><Label htmlFor="profile-username">Username</Label><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">@</span><Input id="profile-username" value={draftProfile.username} onChange={(event) => setDraftProfile({ ...draftProfile, username: event.target.value.replace(/\s/g, "") })} className="pl-8" /></div></div>
                <div className="grid gap-2"><Label htmlFor="profile-avatar">Avatar URL</Label><Input id="profile-avatar" value={draftProfile.avatarUrl ?? ""} onChange={(event) => setDraftProfile({ ...draftProfile, avatarUrl: event.target.value })} placeholder="https://..." /></div>
                <div className="grid gap-2"><Label>Trading style</Label><Select value={draftProfile.tradingStyle} onValueChange={(value) => setDraftProfile({ ...draftProfile, tradingStyle: value })}><SelectTrigger className="w-full"><SelectValue placeholder="Choose your trading style" /></SelectTrigger><SelectContent><SelectItem value="Price Action">Price Action</SelectItem><SelectItem value="Scalping">Scalping</SelectItem><SelectItem value="Swing Trading">Swing Trading</SelectItem><SelectItem value="Algorithmic">Algorithmic</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="profile-location">Location</Label><div className="relative"><MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><Input id="profile-location" value={draftProfile.location} onChange={(event) => setDraftProfile({ ...draftProfile, location: event.target.value })} placeholder="Korea" className="pl-10" /></div></div>
                <div className="grid gap-2"><Label htmlFor="profile-bio">Bio</Label><Textarea id="profile-bio" value={draftProfile.bio} onChange={(event) => setDraftProfile({ ...draftProfile, bio: event.target.value })} maxLength={160} className="min-h-28" placeholder="Write something about your trading journey..." /><span className="text-right text-[11px] text-slate-600">{draftProfile.bio.length}/160</span></div>
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 border-t border-white/8 bg-[#171717]/95 px-5 py-4 backdrop-blur-xl">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => void save()}>{saved ? <Check size={17} /> : null}{saved ? "Saved" : "Save changes"}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      {connectionsOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
          <div className="absolute inset-0" onClick={() => setConnectionsOpen(null)} aria-hidden="true" />
          <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[30px] border border-white/10 bg-[#171717]/98 text-white shadow-2xl shadow-black/80">
            <header className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black leading-6">{connectionsOpen === "followers" ? "Followers" : "Following"}</h2>
                <p className="mt-1 truncate text-xs text-slate-500">@{profile.username}</p>
              </div>
              <button onClick={() => setConnectionsOpen(null)} className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[.05] text-slate-400 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <div className="max-h-[70dvh] overflow-y-auto p-2">
              {connectionsLoading ? <div className="grid min-h-52 place-items-center"><XSpinner size="lg" /></div> : null}
              {!connectionsLoading && !connections.length ? (
                <div className="grid min-h-52 place-items-center px-6 text-center">
                  <div>
                    <UserRound className="mx-auto text-slate-600" size={34} />
                    <h3 className="mt-3 text-lg font-black">No users yet</h3>
                    <p className="mt-1 text-sm text-slate-500">List will appear here.</p>
                  </div>
                </div>
              ) : null}
              {connections.map((item) => (
                <article key={item.id} className="flex gap-3 rounded-2xl border-b border-white/6 px-3 py-3 last:border-b-0 hover:bg-white/[.035]">
                  <button onClick={() => { openProfileRoute(item.username); setConnectionsOpen(null); }}>
                    <TraderAvatar name={item.fullName} value={item.avatarUrl} className="h-12 w-12 text-xs" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => { openProfileRoute(item.username); setConnectionsOpen(null); }} className="flex min-w-0 items-center gap-1.5 text-left">
                      <span className="truncate text-sm font-black">{item.fullName}</span>
                      {item.isVerified ? <VerifiedBadge /> : null}
                    </button>
                    <p className="truncate text-xs text-slate-500">@{item.username}</p>
                    {item.bio ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{item.bio}</p> : null}
                    <p className="mt-1 text-[11px] text-slate-600">{formatCount(item.followersCount)} followers</p>
                  </div>
                  {!item.isSelf ? (
                    <button
                      onClick={() => void toggleConnectionFollow(item)}
                      disabled={connectionsActingId === item.id}
                      className={`mt-1 h-9 shrink-0 rounded-full px-4 text-xs font-black transition ${item.isFollowing ? "border border-white/12 bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200" : "bg-white text-slate-950 hover:bg-slate-200"}`}
                    >
                      {connectionsActingId === item.id ? "..." : item.isFollowing ? "Following" : "Follow"}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

