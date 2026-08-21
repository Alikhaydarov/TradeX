"use client";

import { UserRound, X } from "lucide-react";

import { formatCount } from "@/lib/social-format";
import { XSpinner } from "../app-loader";
import { TraderAvatar } from "../trader-avatar";
import type { ConnectionUser, ProfileView } from "./profile-types";

export function ProfileConnectionsDialog({
  type,
  profile,
  users,
  loading,
  actingId,
  onClose,
  onOpenProfile,
  onToggleFollow,
}: {
  type: "followers" | "following" | null;
  profile: ProfileView;
  users: ConnectionUser[];
  loading: boolean;
  actingId: string | null;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
  onToggleFollow: (user: ConnectionUser) => void;
}) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/92 p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[30px] border border-white/10 bg-surface-raised/98 text-white shadow-2xl shadow-black/80">
        <header className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-6">
              {type === "followers" ? "Followers" : "Following"}
            </h2>
            <p className="mt-1 truncate text-xs text-zinc-500">
              @{profile.username}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-zinc-400 hover:bg-surface-raised hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[70dvh] overflow-y-auto p-2">
          {loading ? (
            <div className="grid min-h-52 place-items-center">
              <XSpinner size="lg" />
            </div>
          ) : null}
          {!loading && !users.length ? (
            <div className="grid min-h-52 place-items-center px-6 text-center">
              <div>
                <UserRound className="mx-auto text-zinc-600" size={34} />
                <h3 className="mt-3 text-lg font-black">No users yet</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  List will appear here.
                </p>
              </div>
            </div>
          ) : null}
          {users.map((item) => (
            <article
              key={item.id}
              className="flex gap-3 rounded-2xl border-b border-white/6 px-3 py-3 last:border-b-0 hover:bg-white/[.035]"
            >
              <button onClick={() => onOpenProfile(item.username)}>
                <TraderAvatar
                  name={item.fullName}
                  value={item.avatarUrl}
                  className="h-12 w-12 text-xs"
                />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => onOpenProfile(item.username)}
                  className="flex min-w-0 items-center gap-1.5 text-left"
                >
                  <span className="truncate text-sm font-black">
                    {item.fullName}
                  </span>
                </button>
                <p className="truncate text-xs text-zinc-500">
                  @{item.username}
                </p>
                {item.bio ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                    {item.bio}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-zinc-600">
                  {formatCount(item.followersCount)} followers
                </p>
              </div>
              {!item.isSelf ? (
                <button
                  onClick={() => onToggleFollow(item)}
                  disabled={actingId === item.id}
                  className={`mt-1 h-9 shrink-0 rounded-full px-4 text-xs font-black transition ${
                    item.isFollowing
                      ? "border border-white/12 bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200"
                      : "bg-white text-zinc-950 hover:bg-zinc-200"
                  }`}
                >
                  {actingId === item.id
                    ? "..."
                    : item.isFollowing
                      ? "Following"
                      : "Follow"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
