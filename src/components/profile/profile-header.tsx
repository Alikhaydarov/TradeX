"use client";

import {
  Camera,
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
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
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
    <section className="overflow-hidden border-b border-white/8 bg-[#090909] sm:rounded-lg sm:border">
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
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg border border-white/10 bg-black/60 text-white backdrop-blur hover:bg-black/80 disabled:opacity-50"
              aria-label="Change banner"
            >
              {busy ? <XSpinner size="sm" /> : <Camera className="size-4" />}
            </button>
          </>
        ) : null}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-14">
          <div className="relative">
            <TraderAvatar
              name={profile.fullName}
              value={profile.avatarUrl}
              className="size-20 rounded-full border-4 border-[#090909] bg-black text-xl shadow-xl sm:size-24 sm:text-2xl"
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
                  className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-[#090909] bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
                  aria-label="Change avatar"
                >
                  <Camera className="size-3.5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <>
                <Button variant="outline" onClick={onEdit} className="border-white/10">
                  <PenLine className="size-4" /> Edit profile
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={onFollow}
                disabled={busy}
                className={
                  profile.isFollowing
                    ? "border border-white/10 bg-transparent text-white hover:bg-white/6"
                    : "bg-white text-black hover:bg-zinc-200"
                }
              >
                {busy ? <XSpinner size="sm" /> : <UserPlus className="size-4" />}
                {profile.isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-[-0.025em] text-white sm:text-2xl">
              {profile.fullName}
            </h1>
            {profile.isVerified ? <VerifiedBadge size={18} /> : null}
          </div>
          <p className="mt-1 text-sm text-zinc-600">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-6 text-zinc-300">
              {profile.bio}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            {profile.tradingStyle ? (
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="size-3.5" /> {profile.tradingStyle}
              </span>
            ) : null}
            {profile.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {profile.location}
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => onConnections("following")}
              className="text-zinc-500 hover:text-white"
            >
              <strong className="text-white">{profile.followingCount || 0}</strong>{" "}
              following
            </button>
            <button
              type="button"
              onClick={() => onConnections("followers")}
              className="text-zinc-500 hover:text-white"
            >
              <strong className="text-white">{profile.followersCount || 0}</strong>{" "}
              followers
            </button>
          </div>
        </div>

        {profile.statsVisible !== false ? (
          <div className="mt-4 grid grid-cols-4 divide-x divide-white/8 overflow-hidden rounded-lg border border-white/8 bg-[#111111]">
            <Stat label="Trades" value={String(stats.trades)} />
            <Stat label="Win rate" value={`${stats.winRate}%`} />
            <Stat
              label="Net P&L"
              value={money(stats.netPnl)}
              tone={stats.netPnl}
            />
            <Stat label="Average R" value={`${stats.averageR.toFixed(2)}R`} />
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
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate font-mono text-xs font-semibold ${
          tone === undefined
            ? "text-zinc-100"
            : tone >= 0
              ? "text-emerald-300"
              : "text-rose-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
