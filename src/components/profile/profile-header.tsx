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
  profile,
  stats,
  isOwnProfile,
  saved,
  uploadingBanner,
  bannerInputRef,
  postCount,
  followLoading,
  onBannerFile,
  onSignOut,
  onOpenEdit,
  onToggleFollow,
  onOpenConnections,
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
  const pnlTone =
    stats.netPnl > 0
      ? "text-emerald-300"
      : stats.netPnl < 0
        ? "text-rose-300"
        : "text-white";

  const statsItems = [
    { label: "Trades", value: String(stats.trades), tone: "text-white" },
    { label: "Win rate", value: `${stats.winRate}%`, tone: "text-white" },
    { label: "Net P&L", value: formatMoneyCompact(stats.netPnl), tone: pnlTone },
    { label: "Average R", value: `${stats.averageR.toFixed(2)}R`, tone: "text-white" },
  ];

  return (
    <section className="overflow-hidden border-y border-xborder bg-xsurface shadow-[inset_0_1px_0_rgba(255,255,255,.025)] sm:rounded-2xl sm:border">
      <div className="relative h-28 overflow-hidden bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,.08),transparent_36%),linear-gradient(135deg,#050505,#111111)] sm:h-40">
        {profile.bannerUrl ? (
          <>
            <MediaImage
              src={profile.bannerUrl}
              alt={`${profile.fullName} banner`}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
          </>
        ) : null}

        {isOwnProfile ? (
          <>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => onBannerFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl border border-white/10 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 disabled:opacity-60"
              aria-label="Change banner"
            >
              {uploadingBanner ? <XSpinner size="sm" /> : <Camera size={15} />}
            </button>
          </>
        ) : null}
      </div>

      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-12">
          <TraderAvatar
            name={profile.fullName}
            value={profile.avatarUrl}
            className="h-20 w-20 rounded-full border-[5px] border-xsurface bg-black text-xl shadow-2xl ring-1 ring-white/10 sm:h-24 sm:w-24 sm:text-2xl"
          />

          {isOwnProfile ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onSignOut}
                className="grid size-9 place-items-center rounded-xl border border-xborder bg-xpanel text-xmuted-strong transition hover:border-xborder-strong hover:bg-xraised hover:text-white"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
              <button
                onClick={onOpenEdit}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-xborder bg-xpanel px-3 text-xs font-bold text-white transition hover:border-xborder-strong hover:bg-xraised"
              >
                <PenLine size={14} /> Edit profile
              </button>
            </div>
          ) : (
            <button
              onClick={onToggleFollow}
              disabled={followLoading}
              className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${
                profile.isFollowing
                  ? "border border-xborder bg-xpanel text-white hover:border-rose-400/20 hover:bg-rose-400/[.06] hover:text-rose-200"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {followLoading ? (
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

        <div className="mt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
              {profile.fullName}
            </h2>
            {profile.isVerified ? <VerifiedBadge size={20} /> : null}
            {saved ? (
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[.07] px-2 py-1 text-[10px] font-bold text-emerald-300">
                Saved
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-xmuted">@{profile.username}</p>

          {profile.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-zinc-200">
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-xmuted">
            {profile.location ? (
              <p className="flex items-center gap-1.5">
                <MapPin size={13} /> {profile.location}
              </p>
            ) : null}
            <p className="flex items-center gap-1.5">
              <TrendingUp size={13} /> {profile.tradingStyle}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-xmuted">
            <button
              onClick={() => onOpenConnections("followers")}
              className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <b className="font-black text-white">
                {formatCount(profile.followersCount ?? 0)}
              </b>{" "}
              Followers
            </button>
            <button
              onClick={() => onOpenConnections("following")}
              className="rounded-lg text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <b className="font-black text-white">
                {formatCount(profile.followingCount ?? 0)}
              </b>{" "}
              Following
            </button>
            <span>
              <b className="font-black text-white">{postCount}</b> Posts
            </span>
          </div>
        </div>

        {profile.statsVisible !== false || isOwnProfile ? (
          <div className="mt-5">
            {isOwnProfile && profile.statsVisible === false ? (
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-xmuted">
                <EyeOff size={11} /> Hidden from other users
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statsItems.map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 rounded-xl border border-xborder bg-xpanel px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.02)]"
                >
                  <span className="block text-[9px] font-bold uppercase tracking-[.12em] text-xmuted">
                    {item.label}
                  </span>
                  <strong className={`mt-1.5 block truncate font-mono text-sm font-black ${item.tone}`}>
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
