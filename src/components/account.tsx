"use client";

import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  Eye,
  Heart,
  Link2,
  LogOut,
  MapPin,
  MessageCircle,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { XSpinner } from "./app-loader";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import type { Post, Profile } from "./types";

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  trading_style: string;
  location: string;
}

interface PostRecord {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
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

function profileFromUser(user: NonNullable<ReturnType<typeof useAuth>["user"]>): Profile {
  const fullName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? "Trader");
  return {
    id: user.id,
    username: String(user.user_metadata.user_name ?? user.email?.split("@")[0] ?? "trader"),
    fullName,
    avatarUrl: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    bio: "Trading is a business",
    tradingStyle: "Price Action",
    location: "",
  };
}

function toProfile(data: ProfileRecord): Profile {
  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    tradingStyle: data.trading_style,
    location: data.location,
  };
}

function toPost(record: PostRecord): Post {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(record.created_at).getTime()) / 60000));
  return {
    id: record.id,
    userId: record.user_id,
    name: record.author_name,
    handle: record.author_handle.startsWith("@") ? record.author_handle : `@${record.author_handle}`,
    avatar: record.author_avatar || record.author_name.slice(0, 2).toUpperCase(),
    time: minutes < 1 ? "hozir" : minutes < 60 ? `${minutes}m` : new Date(record.created_at).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }),
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
  };
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

export function Account({ onLogin }: { onLogin: () => void }) {
  const { user, configured, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftProfile, setDraftProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setError(null);

    apiRequest<{ profile: ProfileRecord }>("/api/profile")
      .then(({ profile: data }) => {
        if (active) setProfile(toProfile(data));
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      });

    setLoadingPosts(true);
    apiRequest<{ posts: PostRecord[] }>("/api/feed-posts")
      .then((data) => {
        if (!active) return;
        setPosts(data.posts.filter((post) => post.user_id === user.id).map(toPost));
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoadingPosts(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-black/60 px-4 backdrop-blur-2xl">
          <h1 className="text-xl font-extrabold">Profile</h1>
        </header>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[.04] backdrop-blur-2xl">
            <UserRound size={36} className="text-xmuted" />
          </div>
          <h2 className="mt-6 text-2xl font-black">Profilingizni yarating</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-xmuted">
            Google orqali ro&apos;yxatdan o&apos;ting. Postlar, chat va trading profilingiz cloud&apos;da saqlanadi.
          </p>
          <button onClick={onLogin} className="mt-6 rounded-full bg-white px-7 py-3 font-bold text-black">
            Google orqali kirish
          </button>
          {!configured && <p className="mt-4 text-xs text-amber-300">Hozir demo rejim faol.</p>}
        </div>
      </>
    );
  }

  const activeProfile = profile?.id === user.id ? profile : profileFromUser(user);
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "2026";

  const openEdit = () => {
    setDraftProfile(activeProfile);
    setEditOpen(true);
  };

  const save = async () => {
    if (!draftProfile) return;
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
      setError(nextError instanceof Error ? nextError.message : "Profil saqlanmadi.");
    }
  };

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
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

      const payload = (await response.json()) as { avatarUrl?: string; error?: string };
      if (!response.ok || !payload.avatarUrl) throw new Error(payload.error || "Rasm yuklanmadi.");

      const nextProfile = { ...(draftProfile ?? activeProfile), avatarUrl: payload.avatarUrl };
      setDraftProfile(nextProfile);
      setProfile(nextProfile);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Rasm yuklanmadi.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const profilePosts = useMemo(() => posts.filter((post) => post.userId === user.id), [posts, user.id]);
  const mediaPosts = profilePosts.filter((post) => post.imageUrl);

  return (
    <div className="min-h-full bg-black/10">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-white/8 bg-black/70 px-4 backdrop-blur-2xl">
        <ArrowLeft size={18} className="text-slate-300" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black leading-5">{activeProfile.fullName}</h1>
          <p className="text-[11px] text-slate-500">{profilePosts.length} posts</p>
        </div>
        <button onClick={() => void signOut()} className="ml-auto hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/[.06] sm:flex">
          <LogOut size={15} /> Chiqish
        </button>
      </header>

      {error && <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="mx-auto max-w-3xl border-x border-white/8 bg-black/20">
        <div className="h-44 bg-[radial-gradient(circle_at_28%_45%,rgba(14,165,233,.20),transparent_22%),linear-gradient(135deg,#050505,#090f17_55%,#101827)] sm:h-52" />

        <section className="px-4 pb-4">
          <div className="-mt-16 flex items-end justify-between gap-3">
            <div className="relative">
              <TraderAvatar name={activeProfile.fullName} value={activeProfile.avatarUrl} className="h-32 w-32 rounded-full border-4 border-black bg-black text-3xl" />
              <button
                onClick={openEdit}
                className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl hover:bg-slate-900"
                aria-label="Profil rasmini almashtirish"
              >
                <Camera size={16} />
              </button>
            </div>
            <button onClick={openEdit} className="mb-2 rounded-full border border-slate-500 px-5 py-2 text-sm font-black text-white hover:bg-white/[.06]">
              Edit profile
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black leading-7">{activeProfile.fullName}</h2>
              {saved && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Saved</span>}
            </div>
            <p className="text-sm text-slate-500">@{activeProfile.username}</p>
            {activeProfile.bio ? <p className="mt-4 text-[15px] leading-6 text-slate-100">{activeProfile.bio}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              {activeProfile.location ? <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {activeProfile.location}</span> : null}
              <span className="inline-flex items-center gap-1.5 text-sky-400"><Link2 size={16} /> tradeup.community</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} /> Joined {joinedDate}</span>
            </div>

            <div className="mt-4 flex items-center gap-5 text-sm text-slate-500">
              <span><b className="text-white">{profilePosts.length}</b> Posts</span>
              <span><b className="text-white">{mediaPosts.length}</b> Media</span>
              <span><b className="text-white">{activeProfile.tradingStyle}</b></span>
            </div>
          </div>
        </section>

        <div className="mx-4 mb-3 rounded-3xl bg-emerald-700/70 p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black">You aren&apos;t verified yet</h3>
              <p className="mt-1 text-sm leading-6 text-emerald-50/90">Get verified for boosted replies, analytics, and more. Upgrade your TradeUp profile now.</p>
              <button className="mt-3 rounded-full bg-white px-5 py-2 text-sm font-black text-black">Get verified</button>
            </div>
            <button className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10" aria-label="Yopish"><X size={16} /></button>
          </div>
        </div>

        <nav className="grid grid-cols-5 border-b border-white/8 text-sm font-bold text-slate-500">
          <button className="relative py-4 text-white after:absolute after:bottom-0 after:left-1/2 after:h-1 after:w-14 after:-translate-x-1/2 after:rounded-full after:bg-sky-500">Posts</button>
          <button className="py-4 hover:bg-white/[.04]">Replies</button>
          <button className="py-4 hover:bg-white/[.04]">Highlights</button>
          <button className="py-4 hover:bg-white/[.04]">Media</button>
          <button className="py-4 hover:bg-white/[.04]">Likes</button>
        </nav>

        {loadingPosts ? (
          <div className="grid min-h-64 place-items-center text-slate-500"><XSpinner size="lg" /></div>
        ) : profilePosts.length ? (
          <div>
            {profilePosts.map((post, index) => (
              <article key={post.id} className="border-b border-white/8 px-4 py-4 hover:bg-white/[.025]">
                {index === 0 && <div className="mb-2 flex items-center gap-2 pl-12 text-[12px] font-bold text-slate-500">Pinned</div>}
                <div className="flex gap-3">
                  <TraderAvatar name={post.name} value={post.avatar} className="h-10 w-10 shrink-0 rounded-full text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm"><b className="text-white">{post.name}</b> <span className="text-slate-500">{post.handle} · {post.time}</span></p>
                      <Settings2 size={16} className="shrink-0 text-slate-500" />
                    </div>
                    {post.text ? <p className="mt-1 whitespace-pre-line text-[15px] leading-6 text-slate-100">{post.text}</p> : null}
                    {post.imageUrl ? (
                      <div className="mt-3 flex max-h-[560px] min-h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                        <img src={post.imageUrl} alt="Post rasmi" className="max-h-[560px] max-w-full object-contain object-center" loading="lazy" />
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
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center px-8 text-center">
            <div>
              <h3 className="text-2xl font-black">Hali post yo&apos;q</h3>
              <p className="mt-2 text-sm text-slate-500">Siz yozgan postlar shu yerda X.com profilidek ko&apos;rinadi.</p>
            </div>
          </div>
        )}
      </div>

      {editOpen && draftProfile ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-black text-white shadow-2xl shadow-black/60">
            <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/8 bg-black/85 px-4 backdrop-blur-xl">
              <button onClick={() => setEditOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.08]" aria-label="Yopish"><X size={18} /></button>
              <h3 className="text-lg font-black">Edit profile</h3>
              <button onClick={() => void save()} className="ml-auto rounded-full bg-white px-5 py-2 text-sm font-black text-black hover:bg-slate-200">
                {saved ? "Saved" : "Save"}
              </button>
            </div>

            <div className="h-36 bg-gradient-to-br from-slate-900 via-sky-950 to-black" />
            <div className="px-5 pb-6">
              <div className="-mt-14 flex items-end">
                <div className="relative">
                  <TraderAvatar name={draftProfile.fullName} value={draftProfile.avatarUrl} className="h-28 w-28 rounded-full border-4 border-black text-2xl" />
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white">
                    {uploadingAvatar ? <XSpinner size="sm" /> : <Camera size={24} />}
                  </button>
                </div>
                <button onClick={() => void signOut()} className="ml-auto mb-3 flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white/[.06]">
                  <LogOut size={15} /> Chiqish
                </button>
              </div>

              {error && <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

              <div className="mt-5 grid gap-4">
                <label className="text-xs text-slate-500">Name
                  <input value={draftProfile.fullName} onChange={(event) => setDraftProfile({ ...draftProfile, fullName: event.target.value })} className="mt-1 block w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-sky-500" />
                </label>
                <label className="text-xs text-slate-500">Username
                  <div className="mt-1 flex rounded-2xl border border-white/15 px-4 focus-within:border-sky-500"><span className="py-3 text-slate-500">@</span><input value={draftProfile.username} onChange={(event) => setDraftProfile({ ...draftProfile, username: event.target.value.replace(/\s/g, "") })} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></div>
                </label>
                <label className="text-xs text-slate-500">Avatar URL
                  <input value={draftProfile.avatarUrl ?? ""} onChange={(event) => setDraftProfile({ ...draftProfile, avatarUrl: event.target.value })} placeholder="https://..." className="mt-1 block w-full rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-sky-500" />
                </label>
                <label className="text-xs text-slate-500">Trading style
                  <select value={draftProfile.tradingStyle} onChange={(event) => setDraftProfile({ ...draftProfile, tradingStyle: event.target.value })} className="mt-1 block w-full rounded-2xl border border-white/15 bg-[#050505] px-4 py-3 text-sm text-white outline-none focus:border-sky-500">
                    <option>Price Action</option><option>Scalping</option><option>Swing Trading</option><option>Algorithmic</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">Location
                  <div className="mt-1 flex rounded-2xl border border-white/15 px-4 focus-within:border-sky-500"><MapPin className="mt-3 text-slate-500" size={16} /><input value={draftProfile.location} onChange={(event) => setDraftProfile({ ...draftProfile, location: event.target.value })} placeholder="Korea" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none" /></div>
                </label>
                <label className="text-xs text-slate-500">Bio
                  <textarea value={draftProfile.bio} onChange={(event) => setDraftProfile({ ...draftProfile, bio: event.target.value })} maxLength={160} className="mt-1 min-h-24 w-full resize-none rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-sky-500" placeholder="Trading tajribangiz haqida..." />
                </label>
              </div>

              <button onClick={() => void save()} className="mt-5 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-slate-200">
                {saved ? <Check size={17} /> : null}{saved ? "Saved" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
