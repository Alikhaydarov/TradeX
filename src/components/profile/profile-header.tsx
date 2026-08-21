"use client";

import { Camera, Check, EyeOff, LogOut, MapPin, PenLine, TrendingUp, UserPlus } from "lucide-react";
import type { RefObject } from "react";
import { formatCount } from "@/lib/social-format";
import { XSpinner } from "../app-loader";
import { MediaImage } from "../media-image";
import { TraderAvatar } from "../trader-avatar";
import { VerifiedBadge } from "../verified-badge";
import type { ProfileView, TradingStats } from "./profile-types";

function formatMoneyCompact(value: number) {
  const sign = value >= 0 ? "+" : "-";
  const amount = Math.abs(value);
  return `${sign}$${new Intl.NumberFormat("en-US", {
    notation: amount >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function ProfileHeader({
  profile, stats, isOwnProfile, saved, uploadingBanner, bannerInputRef,
  postCount, followLoading, onBannerFile, onSignOut, onOpenEdit,
  onToggleFollow, onOpenConnections,
}: {
  profile: ProfileView;
  stats: TradingStats;
  isOwnProfile: boolean;
  saved: boolean;
  uploadingBanner: boolean;
  bannerInputRef: RefObject<HTMLInputElement | null>;
  postCount: number;
  followLoading: boolean;
  onBannerFile: (file?: File) => void;
  onSignOut: () => void;
  onOpenEdit: () => void;
  onToggleFollow: () => void;
  onOpenConnections: (type: "followers" | "following") => void;
}) {
  return (
    <section className="overflow-hidden border-b border-border bg-card sm:rounded-lg sm:border">
      <div className="relative h-20 overflow-hidden bg-[linear-gradient(135deg,#111111,#202020)] sm:h-28">
        {profile.bannerUrl ? <MediaImage src={profile.bannerUrl} alt={`${profile.fullName} banner`} className="h-full w-full object-cover" /> : null}
        {isOwnProfile ? <>
          <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => onBannerFile(event.target.files?.[0])} />
          <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/55 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-60" aria-label="Change banner">
            {uploadingBanner ? <XSpinner size="sm" /> : <Camera size={14} />}
          </button>
        </> : null}
      </div>
      <div className="px-4 pb-4 sm:px-5">
        <div className="-mt-9 flex items-end justify-between gap-3 sm:-mt-11">
          <TraderAvatar name={profile.fullName} value={profile.avatarUrl} className="h-20 w-20 rounded-full border-4 border-card bg-black text-xl shadow-xl sm:h-24 sm:w-24 sm:text-2xl" />
          {isOwnProfile ? <div className="flex items-center gap-2">
            <button onClick={onSignOut} className="grid size-9 place-items-center rounded-lg border border-border text-ink-mute hover:bg-white/[.04] hover:text-zinc-200" aria-label="Sign out"><LogOut size={15} /></button>
            <button onClick={onOpenEdit} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white/[.025] px-3 text-xs font-bold text-white transition-colors hover:bg-white/[.06]"><PenLine size={14} /> Edit</button>
          </div> : <button onClick={onToggleFollow} disabled={followLoading} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black transition-colors ${profile.isFollowing ? "border border-border bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200" : "bg-white text-zinc-950 hover:bg-zinc-200"}`}>
            {followLoading ? <XSpinner size="sm" /> : profile.isFollowing ? <Check size={14} /> : <UserPlus size={14} />}{profile.isFollowing ? "Following" : "Follow"}
          </button>}
        </div>
        <div className="mt-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-xl font-black leading-7 sm:text-2xl">{profile.fullName}</h2>
            {profile.isVerified ? <VerifiedBadge size={20} /> : null}
            {saved ? <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Saved</span> : null}
          </div>
          <p className="text-xs text-ink-mute">@{profile.username}</p>
          {profile.bio ? <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-5 text-zinc-200">{profile.bio}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-mute">
            {profile.location ? <p className="flex items-center gap-1"><MapPin size={13} /> {profile.location}</p> : null}
            <p className="flex items-center gap-1"><TrendingUp size={13} /> {profile.tradingStyle}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-mute">
            <button onClick={() => onOpenConnections("followers")} className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"><b className="font-black text-white">{formatCount(profile.followersCount ?? 0)}</b> Followers</button>
            <button onClick={() => onOpenConnections("following")} className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"><b className="font-black text-white">{formatCount(profile.followingCount ?? 0)}</b> Following</button>
            <span><b className="font-black text-white">{postCount}</b> Posts</span>
          </div>
        </div>
        {profile.statsVisible !== false || isOwnProfile ? <div className="mt-4">
          {isOwnProfile && profile.statsVisible === false ? <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-ink-subtle"><EyeOff size={11} /> Boshqalarga yashirilgan &mdash; faqat siz ko&apos;rasiz</p> : null}
          <div className="grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border bg-surface-raised">
            {[["Trades", String(stats.trades)], ["Win", `${stats.winRate}%`], ["P&L", formatMoneyCompact(stats.netPnl)], ["Avg R", `${stats.averageR.toFixed(2)}R`]].map(([label, value]) => <div key={label} className="min-w-0 px-2 py-2.5 text-center">
              <strong className="block truncate font-mono text-xs text-zinc-100">{value}</strong>
              <span className="mt-0.5 block text-[8px] font-bold uppercase text-ink-subtle">{label}</span>
            </div>)}
          </div>
        </div> : null}
      </div>
    </section>
  );
}
