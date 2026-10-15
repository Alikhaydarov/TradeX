"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  LoaderCircle,
  MapPin,
  MessageCircle,
  UserRoundPlus,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi } from "@/lib/client-api";
import { profileOptions, type TraderProfileData } from "@/lib/social-data";
import { SocialPost, initials } from "./social-post";
import { DataLoader } from "./data-loader";
import { ProfileConnections } from "./profile-connections";

export function TraderProfile({ username }: { username: string }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<"posts" | "reposts" | "media">("posts");
  const [connections, setConnections] = useState<
    "followers" | "following" | null
  >(null);
  const query = useQuery(profileOptions(username));
  const reposts = useQuery({
    ...profileOptions(username, "reposts"),
    enabled: tab === "reposts",
  });
  const data = query.data;
  const follow = useMutation({
    mutationKey: ["follow", username],
    mutationFn: (active: boolean) =>
      clientApi<{ isFollowing: boolean; followers: number | null }>(
        `/api/community/profile/${encodeURIComponent(username)}/follow`,
        { method: "POST", body: JSON.stringify({ active }) },
      ),
    onMutate: async (active) => {
      await client.cancelQueries({
        queryKey: ["social", "profile", username.toLowerCase()],
      });
      const previous = client.getQueryData(profileOptions(username).queryKey);
      client.setQueriesData<TraderProfileData>(
        { queryKey: ["social", "profile", username.toLowerCase()] },
        (current) =>
          current && {
            ...current,
            isFollowing: active,
            followers: Math.max(
              0,
              current.followers + Number(active) - Number(current.isFollowing),
            ),
          },
      );
      return previous;
    },
    onSuccess: (result) => {
      client.setQueriesData<TraderProfileData>(
        { queryKey: ["social", "profile", username.toLowerCase()] },
        (current) =>
          current && {
            ...current,
            isFollowing: result.isFollowing,
            followers: result.followers ?? current.followers,
          },
      );
      void client.invalidateQueries({
        predicate: (item) =>
          item.queryKey[0] === "social" &&
          item.queryKey[1] === "profile" &&
          item.queryKey[2] !== username.toLowerCase(),
        refetchType: "none",
      });
      void client.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (_error, _active, previous) => {
      if (previous)
        client.setQueriesData<TraderProfileData>(
          { queryKey: ["social", "profile", username.toLowerCase()] },
          (current) =>
            current && {
              ...current,
              isFollowing: previous.isFollowing,
              followers: previous.followers,
            },
        );
    },
  });
  if (query.isPending) return <DataLoader label="Loading trader" />;
  if (!data)
    return (
      <div className="profile-not-found">
        <h1>Profile unavailable</h1>
        <p role="alert">{query.error?.message}</p>
        <button type="button" onClick={() => void query.refetch()}>
          Retry
        </button>
        <Link href="/community">Back to community</Link>
      </div>
    );
  const { profile, posts, isSelf, isFollowing, followers, following } = data;
  const visiblePosts =
    tab === "reposts"
      ? (reposts.data?.posts ?? [])
      : tab === "media"
        ? posts.filter((post) => post.image_url)
        : posts;
  const joined = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(profile.created_at));
  return (
    <div className="trader-profile">
      <Link href="/community" className="profile-back">
        <ArrowLeft size={16} />
        Back to community
      </Link>
      {(follow.error || query.error) && (
        <div role="alert" className="trade-error">
          {follow.error?.message || query.error?.message}
        </div>
      )}
      <section className="trader-profile-card">
        <div className="trader-profile-cover">
          <span>TRADOXY / TRADER PROFILE</span>
        </div>
        <div className="trader-profile-content">
          <div className="trader-profile-top">
            <div className="trader-profile-avatar">
              {profile.avatar_url?.startsWith("http") ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={90}
                  height={90}
                  unoptimized
                />
              ) : (
                initials(profile.full_name || profile.username)
              )}
            </div>
            {isSelf ? (
              <Link href="/settings/profile" className="profile-follow-button">
                Edit profile
              </Link>
            ) : (
              <button
                type="button"
                className={`profile-follow-button${isFollowing ? " following" : ""}`}
                onClick={() => {
                  if (!follow.isPending) follow.mutate(!isFollowing);
                }}
                disabled={follow.isPending}
                aria-pressed={isFollowing}
              >
                {follow.isPending ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <UserRoundPlus size={15} />
                )}
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
          <h1>
            {profile.full_name}
            {profile.is_verified && (
              <BadgeCheck
                className="profile-verified-icon"
                size={20}
                aria-label="Verified"
              />
            )}
          </h1>
          <p className="profile-username">@{profile.username}</p>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-meta">
            {profile.trading_style && <span>{profile.trading_style}</span>}
            {profile.location && (
              <span>
                <MapPin size={13} />
                {profile.location}
              </span>
            )}
            <span>
              <CalendarDays size={13} />
              Joined {joined}
            </span>
          </div>
          <div className="profile-counts">
            <button
              type="button"
              className="min-h-11 hover:underline"
              onClick={() => setConnections("following")}
              aria-haspopup="dialog"
            >
              <strong>{following}</strong> Following
            </button>
            <button
              type="button"
              className="min-h-11 hover:underline"
              onClick={() => setConnections("followers")}
              aria-haspopup="dialog"
            >
              <strong>{followers}</strong> Followers
            </button>
          </div>
        </div>
      </section>
      <div className="profile-content-tabs" aria-label="Profile posts">
        {(["posts", "reposts", "media"] as const).map((view) => (
          <button
            type="button"
            key={view}
            aria-pressed={tab === view}
            onClick={() => setTab(view)}
          >
            {view === "posts"
              ? "Posts"
              : view === "reposts"
                ? "Reposts"
                : "Media"}
            {view !== "reposts" && (
              <span>
                {view === "posts"
                  ? posts.length
                  : posts.filter((post) => post.image_url).length}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "reposts" && reposts.isPending ? (
        <DataLoader label="Loading reposts" />
      ) : tab === "reposts" && reposts.isError ? (
        <div role="alert" className="community-error">
          {reposts.error.message}
          <button type="button" onClick={() => void reposts.refetch()}>
            Retry
          </button>
        </div>
      ) : visiblePosts.length ? (
        <div className="community-list">
          {visiblePosts.map((post) => (
            <SocialPost key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="community-empty">
          <MessageCircle size={24} />
          <h2>
            {tab === "media"
              ? "No media shared yet."
              : tab === "reposts"
                ? "No reposts yet."
                : "Every trader starts somewhere."}
          </h2>
          <p>
            {tab === "reposts"
              ? "Reposted ideas will appear here."
              : "Trading notes shared by this trader will appear here."}
          </p>
        </div>
      )}
      {connections && (
        <ProfileConnections
          key={username}
          username={username}
          initialTab={connections}
          onClose={() => setConnections(null)}
        />
      )}
    </div>
  );
}
