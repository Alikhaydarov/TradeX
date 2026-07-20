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
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "@/lib/api-client";
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

function openProfile(username: string) {
  const clean = username.replace(/^@/, "").toLowerCase();
  window.history.pushState(null, "", `/${clean}`);
  window.dispatchEvent(new Event("tradeup:open-profile"));
}

function openFeedPost(postId?: string | null) {
  window.history.pushState(null, "", postId ? `/#post-${postId}` : "/");
  window.dispatchEvent(new Event("popstate"));
  if (!postId) return;
  window.setTimeout(() => {
    document
      .getElementById(`post-${postId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 280);
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
  return { icon: Bell, tint: "text-zinc-300", label: "Alert" };
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
    <div className="fixed inset-0 isolate z-[2147483647] flex h-[100dvh] w-screen items-start justify-center overflow-y-auto bg-black/82 p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4 sm:pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex h-[min(92dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#050505] text-white shadow-2xl shadow-black/80">
        <header className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-6">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0d0d0d] text-slate-400 transition hover:bg-[#151515] hover:text-white"
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
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanQuery = query.trim();

  const goToProfile = (username: string) => {
    onClose();
    window.setTimeout(() => openProfile(username), 0);
  };

  useEffect(() => {
    let active = true;
    const resetTimer = window.setTimeout(() => {
      if (!active) return;
      setUsers([]);
    }, 0);

    if (cleanQuery.length < 2) {
      const timer = window.setTimeout(() => {
        if (!active) return;
        setLoading(false);
        setError(null);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(resetTimer);
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      apiRequest<{ users: SearchUser[] }>(
        `/api/social/search?q=${encodeURIComponent(cleanQuery)}`,
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
      window.clearTimeout(resetTimer);
      window.clearTimeout(timer);
    };
  }, [cleanQuery]);

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
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-zinc-300"
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
      <div className="min-h-[360px] flex-1 overflow-y-auto overscroll-contain">
        {cleanQuery.length < 2 ? (
          <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-zinc-500">
            Type at least 2 letters to search live accounts.
          </div>
        ) : null}
        {users.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goToProfile(item.username)}
            className="flex min-h-[84px] w-full touch-manipulation items-center gap-3 border-b border-white/6 px-4 py-3.5 text-left transition hover:bg-[#0d0d0d] active:bg-[#141414]"
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
              <span className="block truncate text-xs text-slate-500">
                @{item.username}
              </span>
              {item.bio ? (
                <span className="mt-1 block truncate text-xs text-slate-400">
                  {item.bio}
                </span>
              ) : (
                <span className="mt-1 block truncate text-xs text-slate-600">
                  {item.tradingStyle || "Trader"}
                </span>
              )}
              <span className="mt-1 block truncate text-[11px] text-zinc-600">
                {item.followersCount.toLocaleString("en-US")} followers /{" "}
                {item.followingCount.toLocaleString("en-US")} following
              </span>
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.isFollowing ? "border-white/15 text-zinc-300" : "border-white/8 text-zinc-500"}`}
            >
              {item.isFollowing ? "Following" : item.tradingStyle || "Trader"}
            </span>
          </button>
        ))}
        {!loading && cleanQuery.length >= 2 && !users.length ? (
          <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-slate-500">
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
      openFeedPost(item.entityId);
      onClose();
      return;
    }
    if (!item.actor?.username) return;
    openProfile(item.actor.username);
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
        window.history.pushState(null, "", "/community");
        window.dispatchEvent(new Event("popstate"));
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
      <div className="max-h-[70dvh] min-h-[320px] overflow-y-auto">
        {loading ? (
          <div className="grid min-h-52 place-items-center">
            <Spinner className="size-8 text-zinc-300" />
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
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-[#0d0d0d]">
                <Bell className="text-slate-500" size={26} />
              </span>
              <h3 className="mt-4 text-lg font-black">No notifications yet</h3>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
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
                      name={item.actor?.fullName ?? "TradeWay"}
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
                      <span className="shrink-0 text-[10px] text-zinc-600">
                        {ago(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-zinc-300">
                      {item.message}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-zinc-600">
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
                        className="h-10 rounded-xl border-white/10 bg-transparent px-5 text-zinc-300 hover:bg-white/[.06] hover:text-white"
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
                  name={item.actor?.fullName ?? "TradeWay"}
                  value={item.actor?.avatarUrl ?? null}
                  className="h-12 w-12 shrink-0 text-xs"
                />
                <span
                  className={`absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-[#171717] bg-[#0f1011] ${meta.tint}`}
                >
                  <Icon size={11} />
                </span>
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[15px] font-black text-white">
                    {item.actor?.fullName ?? "TradeWay"}
                  </span>
                  {!item.isRead ? (
                    <span className="size-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {item.actor?.username ? `@${item.actor.username}` : "system"}{" "}
                  - {meta.label} - {ago(item.createdAt)}
                </span>
                <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-300">
                  {item.message}
                </span>
                <span className="mt-2 inline-flex rounded-full border border-white/8 px-2 py-1 text-[10px] font-bold text-zinc-500">
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
    const refresh = () => {
      if (document.visibilityState === "visible") loadUnread();
    };
    const timer = window.setTimeout(loadUnread, 400);
    const interval = window.setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
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
          className={`items-center rounded-xl border border-white/10 bg-[#090909] text-zinc-100 transition hover:border-white/15 hover:bg-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${expandedSearch ? "hidden h-9 w-[clamp(180px,18vw,260px)] justify-start gap-2.5 px-3 text-xs text-zinc-400 xl:flex" : `grid place-items-center ${compact ? "size-9" : "size-10"}`}`}
          aria-label="Search traders"
          title="Search traders"
        >
          <Search size={compact ? 16 : 17} strokeWidth={1.9} />
          {expandedSearch ? (
            <>
              <span className="flex-1 text-left">Search traders</span>
              <kbd className="rounded border border-white/10 bg-black px-1.5 py-0.5 font-sans text-[9px] text-zinc-600">
                ⌘ K
              </kbd>
            </>
          ) : null}
        </button>
        {expandedSearch ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={`grid place-items-center rounded-xl border border-white/10 bg-[#090909] text-zinc-100 transition hover:bg-[#111111] xl:hidden ${compact ? "size-9" : "size-10"}`}
            aria-label="Search traders"
          >
            <Search size={compact ? 16 : 17} strokeWidth={1.9} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className={`relative grid place-items-center rounded-xl border border-white/10 bg-[#090909] text-zinc-100 transition hover:border-white/15 hover:bg-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${compact ? "size-9" : "size-10"}`}
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
          title="Notifications"
        >
          <Bell size={compact ? 16 : 17} strokeWidth={1.9} />
          {unread > 0 ? (
            <span
              className={`absolute grid place-items-center rounded-full bg-rose-500 px-1 font-black text-white ring-2 ring-[#090909] ${compact ? "-right-1 -top-1 min-h-4 min-w-4 text-[9px]" : "-right-1 -top-1 min-h-5 min-w-5 text-[10px]"}`}
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
    <section className="rounded-[24px] border border-white/9 bg-[#0a0a0a] p-4 shadow-xl shadow-black/30">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#111111] text-zinc-300">
          <Users size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black">People</h2>
          <p className="text-[10px] text-slate-500">Search and notifications</p>
        </div>
        <SocialActions />
      </div>
    </section>
  );
}
