"use client";

import { Bell, Check, Search, UserPlus, Users, X } from "lucide-react";
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

function compact(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function ago(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function openProfile(username: string) {
  const clean = username.replace(/^@/, "").toLowerCase();
  window.history.pushState(null, "", `/${clean}`);
  window.dispatchEvent(new Event("tradeup:open-profile"));
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
    <div className="fixed inset-0 isolate z-[2147483647] flex h-[100dvh] w-screen items-start justify-center overflow-y-auto bg-black/75 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[#07101d]/98 text-white shadow-2xl shadow-black/80">
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
  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanQuery = query.trim();

  const goToProfile = (username: string) => {
    openProfile(username);
    onClose();
  };

  useEffect(() => {
    let active = true;

    if (cleanQuery.length < 2) {
      setUsers([]);
      setSelected(null);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      apiRequest<{ users: SearchUser[] }>(`/api/social/search?q=${encodeURIComponent(cleanQuery)}`)
        .then((data) => {
          if (!active) return;
          setUsers(data.users);
          setSelected((current) => current ? data.users.find((item) => item.id === current.id) ?? data.users[0] ?? null : data.users[0] ?? null);
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
      window.clearTimeout(timer);
    };
  }, [cleanQuery]);

  const toggleFollow = async (target: SearchUser) => {
    setActingId(target.id);
    setError(null);
    try {
      const response = await apiRequest<{ following: boolean; followersCount: number }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: target.id }),
      });
      const apply = (item: SearchUser) => item.id === target.id ? { ...item, isFollowing: response.following, followersCount: response.followersCount } : item;
      setUsers((current) => current.map(apply));
      setSelected((current) => current ? apply(current) : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Follow failed.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <Modal title="Search traders" subtitle="Type at least 2 letters to find traders." onClose={onClose}>
      <div className="border-b border-white/8 p-4">
        <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 focus-within:border-cyan-300/50">
          <Search size={18} className="text-cyan-200" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or username" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
          {loading ? <XSpinner size="sm" /> : null}
        </div>
        {error ? <p className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
      </div>
      <div className="grid max-h-[70dvh] min-h-[420px] overflow-hidden sm:grid-cols-[1fr_1.05fr]">
        <div className="overflow-y-auto border-white/8 sm:border-r">
          {cleanQuery.length < 2 ? <div className="grid min-h-40 place-items-center px-6 text-center text-sm text-slate-500">Search yozing. Hozircha userlar ko'rsatilmaydi.</div> : null}
          {users.map((item) => (
            <button key={item.id} onClick={() => goToProfile(item.username)} className={`flex w-full items-center gap-3 border-b border-white/6 px-4 py-3 text-left transition ${selected?.id === item.id ? "bg-cyan-300/8" : "hover:bg-white/[.035]"}`}>
              <TraderAvatar name={item.fullName} value={item.avatarUrl} className="h-11 w-11 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-black">{item.fullName}</span>{item.isVerified ? <VerifiedBadge /> : null}</span>
                <span className="block truncate text-xs text-slate-500">@{item.username}</span>
              </span>
              {item.isFollowing ? <Check size={16} className="text-cyan-200" /> : null}
            </button>
          ))}
          {!loading && cleanQuery.length >= 2 && !users.length ? <div className="grid min-h-40 place-items-center px-6 text-center text-sm text-slate-500">No traders found.</div> : null}
        </div>
        <div className="overflow-y-auto p-4">
          {selected ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[.035] p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => goToProfile(selected.username)}><TraderAvatar name={selected.fullName} value={selected.avatarUrl} className="h-16 w-16 text-lg" /></button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => goToProfile(selected.username)} className="flex min-w-0 items-center gap-1.5 text-left"><h3 className="truncate text-lg font-black">{selected.fullName}</h3>{selected.isVerified ? <VerifiedBadge /> : null}</button>
                  <p className="truncate text-xs text-slate-500">@{selected.username}</p>
                  <p className="mt-2 inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-bold text-cyan-200">{selected.tradingStyle || "Trader"}</p>
                </div>
              </div>
              {selected.bio ? <p className="mt-4 text-sm leading-6 text-slate-300">{selected.bio}</p> : null}
              <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Followers</p><b className="mt-1 block text-xl">{compact(selected.followersCount)}</b></div><div className="rounded-2xl bg-black/15 p-3"><p className="text-[10px] uppercase tracking-[.18em] text-slate-500">Following</p><b className="mt-1 block text-xl">{compact(selected.followingCount)}</b></div></div>
              <button onClick={() => void toggleFollow(selected)} disabled={actingId === selected.id} className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition ${selected.isFollowing ? "border border-white/12 bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200" : "bg-white text-slate-950 hover:bg-slate-200"}`}>{actingId === selected.id ? <XSpinner size="sm" /> : selected.isFollowing ? <Check size={17} /> : <UserPlus size={17} />}{selected.isFollowing ? "Following" : "Follow"}</button>
            </div>
          ) : <div className="grid h-full place-items-center text-center text-sm text-slate-500">Search qilib user tanlang.</div>}
        </div>
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
    <Modal title="Notifications" subtitle="Follow alerts and account activity." onClose={onClose}>
      <div className="max-h-[70dvh] overflow-y-auto p-3">
        {loading ? <div className="grid min-h-52 place-items-center"><XSpinner size="lg" /></div> : null}
        {error ? <p className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
        {!loading && !items.length ? <div className="grid min-h-52 place-items-center px-6 text-center"><div><Bell className="mx-auto text-slate-600" size={34} /><h3 className="mt-3 text-lg font-black">No notifications yet</h3><p className="mt-1 text-sm text-slate-500">New follows will appear here.</p></div></div> : null}
        <div className="space-y-2">{items.map((item) => <article key={item.id} className={`flex gap-3 rounded-2xl border border-white/8 p-3 ${item.isRead ? "bg-white/[.025]" : "bg-cyan-300/8"}`}><button onClick={() => goActor(item.actor?.username)}><TraderAvatar name={item.actor?.fullName ?? "TradeUp"} value={item.actor?.avatarUrl ?? null} className="h-11 w-11 text-xs" /></button><div className="min-w-0 flex-1"><button onClick={() => goActor(item.actor?.username)} className="flex items-center gap-1.5 text-left text-sm font-bold text-white">{item.message}{item.actor?.isVerified ? <VerifiedBadge /> : null}</button><p className="mt-1 text-xs text-slate-500">{ago(item.createdAt)}</p></div></article>)}</div>
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
        <button onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-cyan-100 shadow-lg shadow-slate-950/20 backdrop-blur-xl hover:bg-white/[.08]" aria-label="Search traders"><Search size={18} /></button>
        <button onClick={() => setNotificationsOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-cyan-100 shadow-lg shadow-slate-950/20 backdrop-blur-xl hover:bg-white/[.08]" aria-label="Notifications"><Bell size={18} />{unread > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-[#0b1424]">{unread > 9 ? "9+" : unread}</span> : null}</button>
      </div>
      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}
      {notificationsOpen ? <NotificationsDialog onClose={() => setNotificationsOpen(false)} onRead={() => setUnread(0)} /> : null}
    </>
  );
}

export function SocialActionsCard() {
  return <section className="rounded-[24px] border border-white/9 bg-[#0b1220]/42 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-2xl"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Users size={18} /></div><div className="min-w-0 flex-1"><h2 className="text-sm font-black">People</h2><p className="text-[10px] text-slate-500">Search and notifications</p></div><SocialActions /></div></section>;
}
