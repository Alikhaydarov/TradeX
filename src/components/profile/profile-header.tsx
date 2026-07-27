"use client";

import {
  Camera,
  Check,
  EyeOff,
  LogOut,
  MapPin,
  PenLine,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { useRef } from "react";

import { XSpinner } from "@/components/app-loader";
import { MediaImage } from "@/components/media-image";
import { TraderAvatar } from "@/components/trader-avatar";
import type { Profile } from "@/components/types";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatCount } from "@/lib/social-format";
import type { ProfileStats } from "./use-profile-data";

function money(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(Math.abs(value))}`;
}

export function ProfileHeader({
  profile,
  stats,
  postsCount,
  isOwnProfile,
  busy,
  onEdit,
  onFollow,
  onLogout,
  onConnections,
  onAvatar,
  onBanner,
}: {
  profile: Profile & { isFollowing?: boolean };
  stats: ProfileStats;
  postsCount: number;
  isOwnProfile: boolean;
  busy: boolean;
  onEdit: () => void;
  onFollow: () => void;
  onLogout: () => void;
  onConnections: (type: "followers" | "following") => void;
  onAvatar: (file?: File) => void;
  onBanner: (file?: File) => void;
}) {
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const bannerRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="overflow-hidden border-b border-border bg-card sm:rounded-lg sm:border">
      <div className="relative h-20 overflow-hidden bg-[linear-gradient(135deg,#111111,#202020)] sm:h-28">
        {profile.bannerUrl ? (
          <MediaImage
            src={profile.bannerUrl}
            alt={`${profile.fullName} banner`}
            className="h-full w-full object-cover"
          />
        ) : null}
        {isOwnProfile ? (
          <>
            <input
              ref={bannerRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => onBanner(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              disabled={busy}
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/55 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-60"
              aria-label="Change banner"
            >
              {busy ? <XSpinner size="sm" /> : <Camera size={14} />}
            </button>
          </>
        ) : null}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <div className="-mt-9 flex items-end justify-between gap-3 sm:-mt-11">
          <div className="relative">
            <TraderAvatar
              name={profile.fullName}
              value={profile.avatarUrl}
              className="size-20 rounded-full border-4 border-card bg-black text-xl shadow-xl sm:size-24 sm:text-2xl"
            />
            {isOwnProfile ? (
              <>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => onAvatar(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={busy}
                  className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-card bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
                  aria-label="Change avatar"
                >
                  <Camera size={13} />
                </button>
              </>
            ) : null}
          </div>

          {isOwnProfile ? (
            <div className="flex items-center gap-2 pb-1">
              <button
                type="button"
                onClick={onLogout}
                className="grid size-9 place-items-center rounded-lg border border-border text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white/[.025] px-3 text-xs font-bold text-white transition-colors hover:bg-white/[.06]"
              >
                <PenLine size={14} /> Edit
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onFollow}
              disabled={busy}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-black transition-colors ${
                profile.isFollowing
                  ? "border border-border bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200"
                  : "bg-white text-zinc-950 hover:bg-zinc-200"
              }`}
            >
              {busy ? (
                <XSpinner size="sm" />
              ) : profile.isFollowing ? (
                <Check size={14} />
              ) : (
                <UserPlus size={14} />
              )}
              {profile.isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-black leading-7 text-white sm:text-2xl">
              {profile.fullName}
            </h1>
            {profile.isVerified ? <VerifiedBadge size={20} /> : null}
          </div>
          <p className="text-xs text-zinc-500">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-5 text-zinc-200">
              {profile.bio}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500">
            {profile.location ? (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {profile.location}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <TrendingUp size={13} /> {profile.tradingStyle}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => onConnections("followers")}
              className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <b className="font-black text-white">{formatCount(profile.followersCount ?? 0)}</b>{" "}
              Followers
            </button>
            <button
              type="button"
              onClick={() => onConnections("following")}
              className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <b className="font-black text-white">{formatCount(profile.followingCount ?? 0)}</b>{" "}
              Following
            </button>
            <span>
              <b className="font-black text-white">{postsCount}</b> Posts
            </span>
          </div>
        </div>

        {profile.statsVisible !== false || isOwnProfile ? (
          <div className="mt-4">
            {isOwnProfile && profile.statsVisible === false ? (
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-zinc-600">
                <EyeOff size={11} /> Hidden from others — only you can see this
              </p>
            ) : null}
            <div className="grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border bg-[#111111]">
              <Stat label="Trades" value={String(stats.trades)} />
              <Stat label="Win" value={`${stats.winRate}%`} />
              <Stat label="P&L" value={money(stats.netPnl)} tone={stats.netPnl} />
              <Stat label="Avg R" value={`${stats.averageR.toFixed(2)}R`} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number;
}) {
  return (
    <div className="min-w-0 px-2 py-2.5 text-center">
      <strong
        className={`block truncate font-mono text-xs ${
          tone === undefined
            ? "text-zinc-100"
            : tone >= 0
              ? "text-emerald-300"
              : "text-rose-300"
        }`}
      >
        {value}
      </strong>
      <span className="mt-0.5 block text-[8px] font-bold uppercase text-zinc-600">
        {label}
      </span>
    </div>
  );
}
