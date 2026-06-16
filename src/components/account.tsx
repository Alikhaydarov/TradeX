"use client";

import {
  Bookmark,
  Camera,
  Check,
  Eye,
  Heart,
  ImageIcon,
  LogOut,
  MapPin,
  MessageCircle,
  PenLine,
  ShieldCheck,
  TrendingUp,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { XSpinner } from "./app-loader";
import { useAuth } from "./auth-context";
import { SocialActionsCard } from "./social-actions";
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

interface PostRecord {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  author_is_verified?: boolean | null;
  image_url?: string | null;
  symbol: string | null;
  side: "LONG" | "SHORT" | null;
  entry_price: string | null;
  target_price: string | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  views_count?: number | null;
  created_at: string;
}

type ProfileTab = "posts" | "replies" | "media" | "saved";

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "posts", label: "Posts" },
  { id: "replies", label: "Replies" },
  { id: "media", label: "Media" },
  { id: "saved", label: "Saved" },
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

function formatAccountTime(createdAt: Date) {
  const minutes = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function toPost(record: PostRecord): Post {
  const createdAt = new Date(record.created_at);

  return {
    id: record.id,
    userId: record.user_id,
    name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.slice(0, 2).toUpperCase(),
    time: formatAccountTime(createdAt),
    text: record.content,
    imageUrl: record.image_url ?? null,
    symbol: record.symbol ?? undefined,
    side: record.side ?? undefined,
    price: record.entry_price ?? undefined,
    target: record.target_price ?? undefined,
    likes: record.likes_count,
    replies: record.replies_count,
    reposts: record.reposts_count,
    views: record.views_count ?? 0,
    isVerified: Boolean(record.author_is_verified),
  };
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function EmptyTab({ tab }: { tab: ProfileTab }) {
  const title = tab === "posts" ? "No posts yet" : tab === "replies" ? "No replies yet" : tab === "media" ? "No media yet" : "No saved posts yet";
  const description = tab === "posts" ? "Posts will appear here." : tab === "media" ? "Image posts will appear here." : "This section will be ready soon.";

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
      ? apiRequest<{ profile: ProfileRecord; posts: PostRecord[] }>(`/api/profile/${profileUsername}`)
      : Promise.allSettled([
        apiRequest<{ profile: ProfileRecord }>("/api/profile"),
        apiRequest<{ posts: PostRecord[] }>("/api/feed-posts"),
      ]).then(([profileResult, postsResult]) => {
        if (profileResult.status !== "fulfilled") throw profileResult.reason;
        const myProfile = profileResult.value.profile;
        const myPosts = postsResult.status === "fulfilled" ? postsResult.value.posts.filter((post) => post.user_id === user.id) : [];
        return { profile: myProfile, posts: myPosts };
      });

    load
      .then((data) => {
        if (!active) return;
        setProfile(toProfile(data.profile));
        setPosts(data.posts.map(toPost));
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Profile failed to load.");
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
      window.clearTimeout(startTimer);
    };
  }, [user, profileUsername]);

  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-[#0c1424]/50 px-4 backdrop-blur-2xl">
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
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-[#0c1424]/50 px-4 backdrop-blur-2xl">
          <h1 className="text-xl font-extrabold">Profile</h1>
        </header>
        <div className="grid min-h-[calc(100dvh-4rem)] place-items-center px-6 text-center">
          <XSpinner size="lg" />
        </div>
      </>
    );
  }

  if (!profile) {
    return <div className="grid min-h-[70vh] place-items-center text-slate-500">Profile topilmadi.</div>;
  }

  const isOwnProfile = profile.id === user.id;
  const mediaPosts = posts.filter((post) => post.imageUrl);
  const visiblePosts = activeTab === "posts" ? posts : activeTab === "media" ? mediaPosts : [];

  const openEdit = () => {
    if (!isOwnProfile) return;
    setDraftProfile(profile);
    setEditOpen(true);
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
    <article key={post.id} className="border-b border-white/8 px-4 py-4 last:border-b-0 hover:bg-white/[.025] sm:px-5">
      <div className="flex gap-3">
        <TraderAvatar name={post.name} value={post.avatar} className="h-10 w-10 shrink-0 rounded-2xl text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-black text-white">{post.name}</p>
            {post.isVerified ? <VerifiedBadge /> : null}
          </div>
          <p className="truncate text-xs text-slate-500">{post.handle} · {post.time}</p>
          {post.text ? <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-slate-100">{post.text}</p> : null}
          {post.imageUrl ? (
            <div className="mt-3 flex max-h-[520px] min-h-40 w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-black/25">
              <img src={post.imageUrl} alt="Post media" className="max-h-[520px] max-w-full object-contain object-center" loading="lazy" />
            </div>
          ) : null}
          <div className="mt-3 flex max-w-md items-center justify-between text-slate-500">
            <span className="flex items-center gap-1.5 text-[12px]"><MessageCircle size={16} />{post.replies}</span>
            <span className="flex items-center gap-1.5 text-[12px]"><Heart size={16} />{post.likes}</span>
            <span className="flex items-center gap-1.5 text-[12px]"><Eye size={16} />{formatCount(post.views)}</span>
            <span className="flex items-center gap-1.5 text-[12px]"><Bookmark size={16} /></span>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,.35),rgba(2,6,23,.8))]">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/8 bg-[#0c1424]/60 px-4 backdrop-blur-2xl">
        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/8 text-cyan-200"><UserRound size={17} /></div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black leading-5">TradeX Profile</h1>
          <p className="text-[11px] text-slate-500">{posts.length} posts</p>
        </div>
        {isOwnProfile ? (
          <button onClick={() => void signOut()} className="ml-auto hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/[.06] sm:flex"><LogOut size={15} /> Sign out</button>
        ) : null}
      </header>

      {loadingProfile ? <div className="fixed inset-x-0 top-14 z-30 grid place-items-center bg-[#0b1220]/65 py-3 backdrop-blur-xl"><div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-bold text-slate-200"><XSpinner size="sm" /> Updating</div></div> : null}
      {error && <div className="mx-auto mt-3 max-w-5xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-5 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="hidden xl:block"><SocialActionsCard /></div>
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[.045] shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <div className="h-32 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,.35),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(139,92,246,.26),transparent_28%),linear-gradient(135deg,#0f172a,#111827_48%,#082f49)]" />
            <div className="px-5 pb-5">
              <div className="-mt-14 flex items-end justify-between gap-3">
                <TraderAvatar name={profile.fullName} value={profile.avatarUrl} className="h-28 w-28 rounded-[30px] border-4 border-[#0b1220] bg-black text-3xl shadow-xl" />
                {isOwnProfile ? (
                  <button onClick={openEdit} className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/8 px-4 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-300/12"><PenLine size={14} /> Edit profile</button>
                ) : (
                  <button onClick={() => void toggleFollow()} disabled={followLoading} className={`mb-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${profile.isFollowing ? "border border-white/15 bg-white/[.04] text-white" : "bg-white text-slate-950"}`}>{followLoading ? <XSpinner size="sm" /> : profile.isFollowing ? <Check size={14} /> : <UserPlus size={14} />}{profile.isFollowing ? "Following" : "Follow"}</button>
                )}
              </div>

              <div className="mt-4">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-2xl font-black leading-7">{profile.fullName}</h2>
                  {profile.isVerified ? <VerifiedBadge className="h-5 w-5" /> : null}
                  {saved && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Saved</span>}
                </div>
                <p className="text-sm text-slate-500">@{profile.username}</p>
                {profile.bio ? <p className="mt-4 text-sm leading-6 text-slate-200">{profile.bio}</p> : null}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                  <button onClick={() => openConnections("followers")} className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40">
                    <b className="font-black text-white">{formatCount(profile.followersCount ?? 0)}</b> Followers
                  </button>
                  <button onClick={() => openConnections("following")} className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40">
                    <b className="font-black text-white">{formatCount(profile.followingCount ?? 0)}</b> Following
                  </button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  {profile.location ? <p className="flex items-center gap-2"><MapPin size={16} /> {profile.location}</p> : null}
                  <p className="flex items-center gap-2"><TrendingUp size={16} /> {profile.tradingStyle}</p>
                  <p className="flex items-center gap-2"><ShieldCheck size={16} /> TradeX member</p>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <main className="min-w-0">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[.035] shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
            <div className="grid grid-cols-4 border-b border-white/8">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-2 py-4 text-xs font-black transition sm:text-sm ${active ? "text-white" : "text-slate-500 hover:bg-white/[.03] hover:text-slate-300"}`}>{tab.label}{active ? <span className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-cyan-300" /> : null}</button>;
              })}
            </div>
            {loadingProfile ? <div className="grid min-h-64 place-items-center text-slate-500"><XSpinner size="lg" /></div> : visiblePosts.length ? <div>{visiblePosts.map(renderPost)}</div> : <EmptyTab tab={activeTab} />}
          </section>
        </main>
      </div>

      {editOpen && draftProfile ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-[30px] border border-white/10 bg-[#0b1220] text-white shadow-2xl shadow-black/60">
            <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/8 bg-[#0b1220]/90 px-4 backdrop-blur-xl">
              <button onClick={() => setEditOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.08]" aria-label="Close"><X size={18} /></button>
              <h3 className="text-lg font-black">Edit profile</h3>
              <button onClick={() => void save()} className="ml-auto rounded-full bg-white px-5 py-2 text-sm font-black text-black hover:bg-slate-200">{saved ? "Saved" : "Save"}</button>
            </div>
            <div className="h-36 bg-gradient-to-br from-cyan-950 via-slate-900 to-violet-950" />
            <div className="px-5 pb-6">
              <div className="-mt-14 flex items-end">
                <div className="relative">
                  <TraderAvatar name={draftProfile.fullName} value={draftProfile.avatarUrl} className="h-28 w-28 rounded-[28px] border-4 border-[#0b1220] text-2xl" />
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute inset-0 grid place-items-center rounded-[28px] bg-black/45 text-white">{uploadingAvatar ? <XSpinner size="sm" /> : <Camera size={24} />}</button>
                </div>
                <button onClick={() => void signOut()} className="ml-auto mb-3 flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white/[.06]"><LogOut size={15} /> Sign out</button>
              </div>
              {error && <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
              <div className="mt-5 grid gap-4">
                <label className="text-xs text-slate-500">Name<input value={draftProfile.fullName} onChange={(event) => setDraftProfile({ ...draftProfile, fullName: event.target.value })} className="mt-1 block w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
                <label className="text-xs text-slate-500">Username<div className="mt-1 flex rounded-2xl border border-white/15 px-4 focus-within:border-cyan-400"><span className="py-3 text-slate-500">@</span><input value={draftProfile.username} onChange={(event) => setDraftProfile({ ...draftProfile, username: event.target.value.replace(/\s/g, "") })} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></div></label>
                <label className="text-xs text-slate-500">Avatar URL<input value={draftProfile.avatarUrl ?? ""} onChange={(event) => setDraftProfile({ ...draftProfile, avatarUrl: event.target.value })} placeholder="https://..." className="mt-1 block w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
                <label className="text-xs text-slate-500">Trading style<select value={draftProfile.tradingStyle} onChange={(event) => setDraftProfile({ ...draftProfile, tradingStyle: event.target.value })} className="mt-1 block w-full rounded-2xl border border-white/15 bg-[#050b16] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"><option>Price Action</option><option>Scalping</option><option>Swing Trading</option><option>Algorithmic</option></select></label>
                <label className="text-xs text-slate-500">Location<div className="mt-1 flex rounded-2xl border border-white/15 px-4 focus-within:border-cyan-400"><MapPin className="mt-3 text-slate-500" size={16} /><input value={draftProfile.location} onChange={(event) => setDraftProfile({ ...draftProfile, location: event.target.value })} placeholder="Korea" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none" /></div></label>
                <label className="text-xs text-slate-500">Bio<textarea value={draftProfile.bio} onChange={(event) => setDraftProfile({ ...draftProfile, bio: event.target.value })} maxLength={160} className="mt-1 min-h-24 w-full resize-none rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" placeholder="Write something about your trading journey..." /></label>
              </div>
              <button onClick={() => void save()} className="mt-5 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-slate-200">{saved ? <Check size={17} /> : null}{saved ? "Saved" : "Save changes"}</button>
            </div>
          </div>
        </div>
      ) : null}
      {connectionsOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
          <div className="absolute inset-0" onClick={() => setConnectionsOpen(null)} aria-hidden="true" />
          <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[30px] border border-white/10 bg-[#07101d]/98 text-white shadow-2xl shadow-black/80">
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
