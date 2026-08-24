"use client";

import {
  Bell,
  Check,
  Heart,
  MessageCircle,
  Repeat2,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "@/lib/api-client";
import { profilePath } from "@/lib/navigation";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TraderAvatar } from "./trader-avatar";
import { Spinner } from "./ui/spinner";

type SearchUser = {
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
};

type NotificationItem = {
  id: string;
  type?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityId?: string | null;
  entityType?: string | null;
  actor: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    isVerified?: boolean;
  } | null;
};

function ago(value: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  return `${weeks}w`;
}

/**
 * These used to call window.history.pushState directly and then dispatch a
 * synthetic event to "tell" the app to move.
 *
 * The App Router never learned about either. openProfile fired
 * "tradeup:open-profile", which nothing has listened for since the move off the
 * single-page shell, so opening a trader from search or notifications only
 * rewrote the address bar. The rest dispatched a synthetic popstate, which the
 * router cannot resolve against the null history state pushState left behind,
 * so it fell back to a full document reload.
 */
function useSocialNavigation() {
  const router = useRouter();

  const toProfile = useCallback(
    (username: string) => router.push(profilePath(username)),
    [router],
  );
  const prefetchProfile = useCallback(
    (username: string) => router.prefetch(profilePath(username)),
    [router],
  );

  const toFeedPost = useCallback(
    (postId?: string | null) => {
      router.push(postId ? `/#post-${postId}` : "/");
      if (!postId) return;
      window.setTimeout(() => {
        document
          .getElementById(`post-${postId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 280);
    },
    [router],
  );

  return { toProfile, prefetchProfile, toFeedPost, push: router.push };
}

function notificationMeta(type?: string) {
  if (type === "community_invite")
    return { icon: Users, tint: "text-white", label: "Community invite" };
  if (type === "post_like")
    return { icon: Heart, tint: "text-rose-300", label: "Like" };
  if (type === "post_reply")
    return { icon: MessageCircle, tint: "text-sky-300", label: "Reply" };
  if (type === "post_repost")
    return { icon: Repeat2, tint: "text-emerald-300", label: "Repost" };
  if (type === "follow")
    return { icon: UserPlus, tint: "text-amber-300", label: "Follow" };
  return { icon: Bell, tint: "text-ink-strong", label: "Alert" };
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const body = document.body.style.overflow;
    const html = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = body;
      document.documentElement.style.overflow = html;
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 isolate z-[2147483647] flex min-h-dvh w-full items-start justify-center overflow-y-auto bg-black/82 px-2 py-[max(.5rem,env(safe-area-inset-top))] sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex min-h-0 max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-surface text-white shadow-2xl shadow-black/80 sm:h-[min(92dvh,760px)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[30px]">
        <header className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-6">{title}</h2>
            <p className="mt-1 text-xs text-ink-mute">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-ink-soft transition hover:bg-surface-raised hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { prefetchProfile, toProfile } = useSocialNavigation();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanQuery = query.trim();

  const goToProfile = (username: string) => {
    onClose();
    toProfile(username);
  };

  useEffect(() => {
    let active = true;

    if (cleanQuery.length < 2) {
      const timer = window.setTimeout(() => {
        if (!active) return;
        setUsers([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      apiRequest<{ users: SearchUser[] }>(
        `/api/social/search?q=${encodeURIComponent(cleanQuery)}`,
        { cacheMs: 15_000 },
      )
        .then((data) => {
          if (!active) return;
          setUsers(data.users);
        })
        .catch((err) => {
          if (active)
            setError(err instanceof Error ? err.message : "Search failed.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [cleanQuery, prefetchProfile]);

  return (
    <Modal
      title="Search traders"
      subtitle="Find accounts, preview profiles and jump in fast."
      onClose={onClose}
    >
      <form
        className="border-b border-white/8 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (users[0]) goToProfile(users[0].username);
        }}
      >
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ink-strong"
          />
          <Input
            autoFocus
            type="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && users[0]) {
                event.preventDefault();
                goToProfile(users[0].username);
              }
            }}
            placeholder="Search by name or username"
            className="h-12 pl-11 pr-20 text-[16px]"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {loading ? <Spinner /> : null}
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </Button>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {cleanQuery.length < 2 ? (
          <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-ink-mute">
            Type at least 2 letters to search live accounts.
          </div>
        ) : null}
        {users.map((item) => (
          <button
            key={item.id}
            type="button"
            onPointerDown={() => prefetchProfile(item.username)}
            onMouseEnter={() => prefetchProfile(item.username)}
            onFocus={() => prefetchProfile(item.username)}
            onClick={() => goToProfile(item.username)}
            className="flex min-h-[84px] w-full touch-manipulation items-center gap-3 border-b border-white/6 px-4 py-3.5 text-left transition hover:bg-surface active:bg-surface-raised"
          >
            <TraderAvatar
              name={item.fullName}
              value={item.avatarUrl}
              className="h-12 w-12 text-xs"
            />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[15px] font-black">
                  {item.fullName}
                </span>
              </span>
              <span className="block truncate text-xs text-ink-mute">
                @{item.username}
              </span>
              {item.bio ? (
                <span className="mt-1 block truncate text-xs text-ink-soft">
                  {item.bio}
                </span>
              ) : (
                <span className="mt-1 block truncate text-xs text-ink-subtle">
                  {item.tradingStyle || "Trader"}
                </span>
              )}
              <span className="mt-1 block truncate text-[11px] text-ink-subtle">
                {item.followersCount.toLocaleString("en-US")} followers /{" "}
                {item.followingCount.toLocaleString("en-US")} following
              </span>
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.isFollowing ? "border-white/15 text-ink-strong" : "border-white/8 text-ink-mute"}`}
            >
              {item.isFollowing ? "Following" : item.tradingStyle || "Trader"}
            </span>
          </button>
        ))}
        {!loading && cleanQuery.length >= 2 && !users.length ? (
          <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-ink-mute">
            No matching users found.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function NotificationsDialog({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead: () => void;
}) {
  const { toProfile, toFeedPost, push } = useSocialNavigation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ notifications: NotificationItem[] }>(
      "/api/social/notifications",
    )
      .then((data) => {
        if (!active) return;
        setItems(data.notifications);
        void apiRequest<{ success: boolean }>("/api/social/notifications", {
          method: "PATCH",
        })
          .then(onRead)
          .catch(() => undefined);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Notifications failed.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onRead]);

  const goActor = (item: NotificationItem) => {
    if (item.entityType === "post" && item.entityId) {
      toFeedPost(item.entityId);
      onClose();
      return;
    }
    if (!item.actor?.username) return;
    toProfile(item.actor.username);
    onClose();
  };

  const respondToInvite = async (
    item: NotificationItem,
    decision: "accept" | "decline",
  ) => {
    if (!item.entityId) return;
    setRespondingId(item.id);
    setError(null);
    try {
      await apiRequest<{ accepted: boolean }>("/api/community", {
        method: "POST",
        body: JSON.stringify({
          action: "respond_invite",
          communityId: item.entityId,
          decision,
        }),
      });
      setItems((current) =>
        current.filter((notification) => notification.id !== item.id),
      );
      window.dispatchEvent(new Event("tradox:community-membership-changed"));
      if (decision === "accept") {
        push("/community");
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invitation response failed.",
      );
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <Modal
      title="Notifications"
      subtitle="Replies, reposts, likes and follow activity."
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid min-h-52 place-items-center">
            <Spinner className="size-8 text-ink-strong" />
          </div>
        ) : null}
        {error ? (
          <div className="p-4">
            <p className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          </div>
        ) : null}
        {!loading && !items.length ? (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-surface">
                <Bell className="text-ink-mute" size={26} />
              </span>
              <h3 className="mt-4 text-lg font-black">No notifications yet</h3>
              <p className="mt-1 max-w-xs text-sm leading-6 text-ink-mute">
                Likes, replies, reposts and follows will show up here.
              </p>
            </div>
          </div>
        ) : null}
        {items.map((item) => {
          const meta = notificationMeta(item.type);
          const Icon = meta.icon;
          if (item.type === "community_invite")
            return (
              <article
                key={item.id}
                className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,.055),transparent_65%)] px-4 py-5"
              >
                <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <TraderAvatar
                      name={item.actor?.fullName ?? "Tradoxy"}
                      value={item.actor?.avatarUrl ?? null}
                      className="h-12 w-12 text-xs"
                    />
                    <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-zinc-700 bg-white text-black">
                      <Users size={11} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[15px] font-black">
                        {item.actor?.fullName ?? "Community owner"}
                      </p>
                      <span className="shrink-0 text-[10px] text-ink-subtle">
                        {ago(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-ink-strong">
                      {item.message}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-ink-subtle">
                      Accept to unlock this private trading desk. A Pro plan is
                      not required for members.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        disabled={respondingId === item.id}
                        onClick={() => void respondToInvite(item, "accept")}
                        className="h-10 rounded-xl bg-white px-5 text-black hover:bg-zinc-200"
                      >
                        {respondingId === item.id ? (
                          <Spinner className="size-4" />
                        ) : (
                          <Check size={15} />
                        )}{" "}
                        Accept
                      </Button>
                      <Button
                        disabled={respondingId === item.id}
                        variant="outline"
                        onClick={() => void respondToInvite(item, "decline")}
                        className="h-10 rounded-xl border-white/10 bg-transparent px-5 text-ink-strong hover:bg-white/[.06] hover:text-white"
                      >
                        <X size={15} /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goActor(item)}
              className={`flex w-full gap-3 border-b border-white/6 px-4 py-3.5 text-left transition hover:bg-white/[.04] active:bg-white/[.06] ${item.isRead ? "bg-transparent" : "bg-white/[.04]"}`}
            >
              <div className="relative">
                <TraderAvatar
                  name={item.actor?.fullName ?? "Tradoxy"}
                  value={item.actor?.avatarUrl ?? null}
                  className="h-12 w-12 shrink-0 text-xs"
                />
                <span
                  className={`absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-[#171717] bg-surface ${meta.tint}`}
                >
                  <Icon size={11} />
                </span>
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[15px] font-black text-white">
                    {item.actor?.fullName ?? "Tradoxy"}
                  </span>
                  {!item.isRead ? (
                    <span className="size-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-mute">
                  {item.actor?.username ? `@${item.actor.username}` : "system"}{" "}
                  - {meta.label} - {ago(item.createdAt)}
                </span>
                <span className="mt-1 block line-clamp-2 text-sm leading-5 text-ink-strong">
                  {item.message}
                </span>
                <span className="mt-2 inline-flex rounded-full border border-white/8 px-2 py-1 text-[10px] font-bold text-ink-mute">
                  {item.entityType === "post" && item.entityId
                    ? "Open post"
                    : "Open profile"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function SocialActions({
  className = "",
  compact = false,
  expandedSearch = false,
}: {
  className?: string;
  compact?: boolean;
  expandedSearch?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = () => {
    apiRequest<{ unreadCount: number }>("/api/social/notifications?mode=count")
      .then((data) => setUnread(data.unreadCount))
      .catch(() => setUnread(0));
  };

  useEffect(() => {
    const timer = window.setTimeout(loadUnread, 400);
    return () => window.clearTimeout(timer);
  }, []);

  // The old version kept a 20s interval running in background tabs and also
  // refetched on both `focus` and `visibilitychange`, so returning to the tab
  // fired the same request two or three times. useVisibleInterval stops the
  // timer while hidden and refetches exactly once on return.
  useVisibleInterval(loadUnread, 30_000);

  useEffect(() => {
    window.addEventListener("tradox:notifications-changed", loadUnread);
    return () =>
      window.removeEventListener("tradox:notifications-changed", loadUnread);
  }, []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
        return;
      event.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  return (
    <>
      <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={`items-center rounded-xl border border-white/10 bg-surface text-zinc-100 transition hover:border-white/15 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${expandedSearch ? "hidden h-9 w-[clamp(180px,18vw,260px)] justify-start gap-2.5 px-3 text-xs text-ink-soft xl:flex" : `grid place-items-center ${compact ? "size-9" : "size-10"}`}`}
          aria-label="Search traders"
          title="Search traders"
        >
          <Search size={compact ? 16 : 17} strokeWidth={1.9} />
          {expandedSearch ? (
            <>
              <span className="flex-1 text-left">Search traders</span>
              <kbd className="rounded border border-white/10 bg-black px-1.5 py-0.5 font-sans text-[10px] text-ink-subtle">
                ⌘ K
              </kbd>
            </>
          ) : null}
        </button>
        {expandedSearch ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={`grid place-items-center rounded-xl border border-white/10 bg-surface text-zinc-100 transition hover:bg-surface-raised xl:hidden ${compact ? "size-9" : "size-10"}`}
            aria-label="Search traders"
          >
            <Search size={compact ? 16 : 17} strokeWidth={1.9} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className={`relative grid place-items-center rounded-xl border border-white/10 bg-surface text-zinc-100 transition hover:border-white/15 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${compact ? "size-9" : "size-10"}`}
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
          title="Notifications"
        >
          <Bell size={compact ? 16 : 17} strokeWidth={1.9} />
          {unread > 0 ? (
            <span
              className={`absolute grid place-items-center rounded-full bg-rose-500 px-1 font-black text-white ring-2 ring-[#090909] ${compact ? "-right-1 -top-1 min-h-4 min-w-4 text-[10px]" : "-right-1 -top-1 min-h-5 min-w-5 text-[10px]"}`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </div>
      {searchOpen ? (
        <SearchDialog onClose={() => setSearchOpen(false)} />
      ) : null}
      {notificationsOpen ? (
        <NotificationsDialog
          onClose={() => setNotificationsOpen(false)}
          onRead={() => setUnread(0)}
        />
      ) : null}
    </>
  );
}

export function SocialActionsCard() {
  return (
    <section className="rounded-[24px] border border-white/9 bg-surface p-4 shadow-xl shadow-black/30">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-raised text-ink-strong">
          <Users size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black">People</h2>
          <p className="text-[10px] text-ink-mute">Search and notifications</p>
        </div>
        <SocialActions />
      </div>
    </section>
  );
}
