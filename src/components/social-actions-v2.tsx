"use client";

import { Bell, Search, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "@/lib/api-client";
import { XSpinner } from "./app-loader";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";

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
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; username: string; fullName: string; avatarUrl: string | null; isVerified?: boolean } | null;
};

function ago(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
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

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
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
    <div className="fixed inset-0 isolate z-[2147483647] flex h-[100dvh] w-screen items-start justify-center overflow-y-auto bg-black/75 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:p-4 sm:pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 flex h-[min(92dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#171717]/98 text-white shadow-2xl shadow-black/80">
        <header className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-6">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[.05] text-slate-400 hover:text-white" aria-label="Close">
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
      apiRequest<{ users: SearchUser[] }>(`/api/social/search?q=${encodeURIComponent(cleanQuery)}`)
        .then((data) => {
          if (!active) return;
          setUsers(data.users);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Search failed.");
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
    <Modal title="Search" subtitle="Find TradeWay accounts by name or username." onClose={onClose}>
      <form
        className="border-b border-white/8 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (users[0]) goToProfile(users[0].username);
        }}
      >
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 focus-within:border-zinc-500">
          <Search size={18} className="text-zinc-300" />
          <input
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
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-slate-500"
          />
          {loading ? <XSpinner size="sm" /> : null}
          {query ? <button type="button" onClick={() => setQuery("")} className="grid size-7 place-items-center rounded-full bg-white/[.06] text-slate-400 hover:text-white" aria-label="Clear search"><X size={14} /></button> : null}
        </div>
        {error ? <p className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
      </form>
      <div className="min-h-[360px] flex-1 overflow-y-auto overscroll-contain">
          {cleanQuery.length < 2 ? <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-slate-500">Kamida 2 ta harf yozing.</div> : null}
          {users.map((item) => (
            <button key={item.id} type="button" onClick={() => goToProfile(item.username)} className="flex min-h-[76px] w-full touch-manipulation items-center gap-3 border-b border-white/6 px-4 py-3.5 text-left transition hover:bg-white/[.045] active:bg-white/[.06]">
              <TraderAvatar name={item.fullName} value={item.avatarUrl} className="h-12 w-12 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[15px] font-black">{item.fullName}</span>{item.isVerified ? <VerifiedBadge /> : null}</span>
                <span className="block truncate text-xs text-slate-500">@{item.username}</span>
                {item.bio ? <span className="mt-1 block truncate text-xs text-slate-400">{item.bio}</span> : <span className="mt-1 block truncate text-xs text-slate-600">{item.tradingStyle || "Trader"}</span>}
              </span>
              {item.isFollowing ? <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold text-zinc-300">Following</span> : null}
            </button>
          ))}
          {!loading && cleanQuery.length >= 2 && !users.length ? <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-slate-500">User topilmadi.</div> : null}
      </div>
    </Modal>
  );
}

function NotificationsDialog({ onClose, onRead }: { onClose: () => void; onRead: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ notifications: NotificationItem[] }>("/api/social/notifications")
      .then((data) => {
        if (!active) return;
        setItems(data.notifications);
        void apiRequest<{ success: boolean }>("/api/social/notifications", { method: "PATCH" }).then(onRead).catch(() => undefined);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Notifications failed.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onRead]);

  const goActor = (username: string | undefined) => {
    if (!username) return;
    openProfile(username);
    onClose();
  };

  return (
    <Modal title="Notifications" subtitle="Recent account activity." onClose={onClose}>
      <div className="max-h-[70dvh] min-h-[320px] overflow-y-auto">
        {loading ? <div className="grid min-h-52 place-items-center"><XSpinner size="lg" /></div> : null}
        {error ? <div className="p-4"><p className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p></div> : null}
        {!loading && !items.length ? (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-white/[.035]">
                <Bell className="text-slate-500" size={26} />
              </span>
              <h3 className="mt-4 text-lg font-black">No notifications yet</h3>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Follows and account activity will show up here.</p>
            </div>
          </div>
        ) : null}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goActor(item.actor?.username)}
            className={`flex w-full gap-3 border-b border-white/6 px-4 py-3.5 text-left transition hover:bg-white/[.04] active:bg-white/[.06] ${item.isRead ? "bg-transparent" : "bg-white/[.04]"}`}
          >
            <TraderAvatar name={item.actor?.fullName ?? "TradeWay"} value={item.actor?.avatarUrl ?? null} className="h-12 w-12 shrink-0 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[15px] font-black text-white">{item.actor?.fullName ?? "TradeWay"}</span>
                {item.actor?.isVerified ? <VerifiedBadge /> : null}
                {!item.isRead ? <span className="size-2 rounded-full bg-white" /> : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                {item.actor?.username ? `@${item.actor.username}` : "system"} - {ago(item.createdAt)}
              </span>
              <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-300">{item.message}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function SocialActions({ className = "" }: { className?: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = () => {
    apiRequest<{ unreadCount: number }>("/api/social/notifications?mode=count").then((data) => setUnread(data.unreadCount)).catch(() => setUnread(0));
  };

  useEffect(() => {
    const timer = window.setTimeout(loadUnread, 600);
    const interval = window.setInterval(loadUnread, 30000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, []);

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <button onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-zinc-100 shadow-lg shadow-slate-950/20 backdrop-blur-xl hover:bg-white/[.08]" aria-label="Search traders"><Search size={18} /></button>
        <button onClick={() => setNotificationsOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-zinc-100 shadow-lg shadow-slate-950/20 backdrop-blur-xl hover:bg-white/[.08]" aria-label="Notifications"><Bell size={18} />{unread > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-[#171717]">{unread > 9 ? "9+" : unread}</span> : null}</button>
      </div>
      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}
      {notificationsOpen ? <NotificationsDialog onClose={() => setNotificationsOpen(false)} onRead={() => setUnread(0)} /> : null}
    </>
  );
}

export function SocialActionsCard() {
  return <section className="rounded-[24px] border border-white/9 bg-[#171717]/42 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-2xl"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[.06] text-zinc-300"><Users size={18} /></div><div className="min-w-0 flex-1"><h2 className="text-sm font-black">People</h2><p className="text-[10px] text-slate-500">Search and notifications</p></div><SocialActions /></div></section>;
}
