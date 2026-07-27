"use client";

import { UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { XSpinner } from "@/components/app-loader";
import { TraderAvatar } from "@/components/trader-avatar";
import type { Profile } from "@/components/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedBadge } from "@/components/verified-badge";
import { apiRequest } from "@/lib/api-client";
import { ProfileAchievements } from "./profile-achievements";
import { ProfileHeader } from "./profile-header";
import { ProfilePosts, type ProfileTab } from "./profile-posts";
import {
  useProfileData,
  type ConnectionUser,
} from "./use-profile-data";

export function ProfilePage({
  onLogin,
  profileUsername,
}: {
  onLogin: () => void;
  profileUsername?: string;
}) {
  const router = useRouter();
  const data = useProfileData(profileUsername);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [connectionsType, setConnectionsType] = useState<
    "followers" | "following" | null
  >(null);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsActingId, setConnectionsActingId] = useState<string | null>(
    null,
  );

  if (!data.user) {
    return (
      <div className="grid min-h-[70dvh] place-items-center px-8 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-[#090909]">
            <UserRound className="size-7 text-zinc-500" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-white">Create your profile</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Sign in to publish trade reviews, follow traders and store achievements.
          </p>
          <Button onClick={onLogin} className="mt-5 bg-white text-black hover:bg-zinc-200">
            Sign in
          </Button>
          {!data.configured ? (
            <p className="mt-3 text-xs text-amber-300">Authentication is not configured.</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (data.loading && !data.profile) return <ProfileSkeleton />;

  if (!data.profile) {
    return (
      <div className="grid min-h-[70dvh] place-items-center text-sm text-zinc-500">
        Profile not found.
      </div>
    );
  }

  const isOwnProfile = data.profile.id === data.user.id;

  const openEdit = () => {
    if (!isOwnProfile) return;
    setDraft({ ...data.profile! });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    const saved = await data.saveProfile(draft);
    if (saved) setEditOpen(false);
  };

  const openConnections = async (type: "followers" | "following") => {
    setConnectionsType(type);
    setConnections([]);
    setConnectionsLoading(true);
    try {
      setConnections(await data.loadConnections(type));
    } catch (nextError) {
      data.setError(
        nextError instanceof Error ? nextError.message : "Connections failed.",
      );
    } finally {
      setConnectionsLoading(false);
    }
  };

  const toggleConnectionFollow = async (target: ConnectionUser) => {
    if (target.isSelf) return;
    setConnectionsActingId(target.id);
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
    } catch (nextError) {
      data.setError(
        nextError instanceof Error ? nextError.message : "Follow failed.",
      );
    } finally {
      setConnectionsActingId(null);
    }
  };

  return (
    <div className="min-h-full bg-black">
      {data.error ? (
        <div className="mx-auto mt-3 flex max-w-3xl items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          <span className="min-w-0 flex-1">{data.error}</span>
          <button
            type="button"
            onClick={() => data.setError(null)}
            className="grid size-8 place-items-center rounded-lg hover:bg-white/6"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-5 lg:py-6">
        <ProfileHeader
          profile={data.profile}
          stats={data.stats}
          isOwnProfile={isOwnProfile}
          busy={data.busy}
          onEdit={openEdit}
          onFollow={() => void data.toggleFollow()}
          onLogout={() => {
            void data.signOut();
            router.replace("/");
          }}
          onConnections={(type) => void openConnections(type)}
          onAvatar={(file) => void data.uploadProfileImage("avatar", file)}
          onBanner={(file) => void data.uploadProfileImage("banner", file)}
        />

        <ProfileAchievements
          achievements={data.achievements}
          isOwnProfile={isOwnProfile}
          busy={data.busy}
          onAdd={data.addAchievement}
          onRemove={(id) => void data.removeAchievement(id)}
          onError={(message) => data.setError(message)}
        />

        <ProfilePosts
          posts={data.posts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4 py-2">
              <Field label="Full name">
                <Input
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft({ ...draft, fullName: event.target.value })
                  }
                  maxLength={60}
                />
              </Field>
              <Field label="Username">
                <Input
                  value={draft.username}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      username: event.target.value.toLowerCase(),
                    })
                  }
                  maxLength={30}
                  autoCapitalize="none"
                />
              </Field>
              <Field label="Bio">
                <Textarea
                  value={draft.bio}
                  onChange={(event) =>
                    setDraft({ ...draft, bio: event.target.value })
                  }
                  maxLength={240}
                  className="min-h-28"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Trading style">
                  <Input
                    value={draft.tradingStyle}
                    onChange={(event) =>
                      setDraft({ ...draft, tradingStyle: event.target.value })
                    }
                    maxLength={60}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={draft.location}
                    onChange={(event) =>
                      setDraft({ ...draft, location: event.target.value })
                    }
                    maxLength={60}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-[#080808] p-3">
                <div>
                  <p className="text-sm font-medium text-white">Public trading stats</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Show win rate, P&L and execution statistics.
                  </p>
                </div>
                <Switch
                  checked={draft.statsVisible !== false}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, statsVisible: checked })
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={!draft || data.busy}>
              {data.busy ? <XSpinner size="sm" /> : null} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(connectionsType)}
        onOpenChange={(open) => {
          if (!open) setConnectionsType(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{connectionsType}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60dvh] overflow-y-auto">
            {connectionsLoading ? (
              <div className="grid min-h-40 place-items-center text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2">
                  <XSpinner size="sm" /> Loading
                </span>
              </div>
            ) : connections.length ? (
              <div className="space-y-1">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[.035]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setConnectionsType(null);
                        router.push(`/${encodeURIComponent(connection.username)}`);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <TraderAvatar
                        name={connection.fullName}
                        value={connection.avatarUrl}
                        className="size-10 shrink-0 text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <strong className="truncate text-sm text-white">
                            {connection.fullName}
                          </strong>
                          {connection.isVerified ? (
                            <VerifiedBadge size={14} />
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-zinc-600">
                          @{connection.username}
                        </span>
                      </span>
                    </button>
                    {!connection.isSelf ? (
                      <Button
                        variant={connection.isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={() => void toggleConnectionFollow(connection)}
                        disabled={connectionsActingId === connection.id}
                      >
                        {connectionsActingId === connection.id ? (
                          <XSpinner size="sm" />
                        ) : connection.isFollowing ? (
                          "Following"
                        ) : (
                          "Follow"
                        )}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-zinc-600">
                No connections yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-3 py-4 sm:px-5 lg:py-6">
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#090909]">
        <div className="h-28 bg-white/[.035] sm:h-44" />
        <div className="px-5 pb-6">
          <div className="-mt-10 size-24 rounded-full border-4 border-[#090909] bg-white/[.07] sm:-mt-14 sm:size-28" />
          <div className="mt-4 h-6 w-44 rounded bg-white/[.07]" />
          <div className="mt-3 h-4 w-28 rounded bg-white/[.04]" />
          <div className="mt-6 h-4 w-72 max-w-full rounded bg-white/[.04]" />
        </div>
      </div>
      <div className="h-48 rounded-2xl border border-white/8 bg-[#090909]" />
      <div className="h-64 rounded-2xl border border-white/8 bg-[#090909]" />
    </div>
  );
}
