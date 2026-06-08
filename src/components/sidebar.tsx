"use client";

import type { User } from "@supabase/supabase-js";
import {
  BarChart2,
  Bell,
  BookOpen,
  Check,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { XSpinner } from "./app-loader";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { Section } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchUser {
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
}

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    isVerified?: boolean;
  } | null;
}

type SidePanel = "search" | "notifications" | "profile" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
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

// ─── Search Panel ─────────────────────────────────────────────────────────────

function SearchPanel({ onOpenProfile }: { onOpenProfile?: (username: string) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      apiRequest<{ users: SearchUser[] }>(`/api/social/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          if (!active) return;
          setUsers(data.users);
          setSelected((cur) => (cur ? data.users.find((u) => u.id === cur.id) ?? cur : data.users[0] ?? null));
        })
        .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Search failed."); })
        .finally(() => { if (active) setLoading(false); });
    }, query.trim() ? 220 : 50);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const toggleFollow = async (target: SearchUser) => {
    setActingId(target.id);
    setError(null);
    try {
      const res = await apiRequest<{ following: boolean; followersCount: number }>("/api/social/follow", {
        method: "POST",
        body: JSON.stringify({ targetUserId: target.id }),
      });
      const apply = (u: SearchUser) =>
        u.id === target.id ? { ...u, isFollowing: res.following, followersCount: res.followersCount } : u;
      setUsers((cur) => cur.map(apply));
      setSelected((cur) => (cur ? apply(cur) : cur));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Follow failed.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/8 p-4">
        <h2 className="text-lg font-black">Search traders</h2>
        <p className="mt-0.5 text-xs text-slate-500">Find accounts and follow traders.</p>
        <div className="mt-3 flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3 focus-within:border-cyan-300/50">
          <Search size={16} className="shrink-0 text-cyan-200" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or username…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          {loading && <XSpinner size="sm" />}
        </div>
        {error && <p className="mt-2 rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className={`flex w-full items-center gap-3 border-b border-white/6 px-4 py-3 text-left transition ${
              selected?.id === u.id ? "bg-cyan-300/8" : "hover:bg-white/[.035]"
            }`}
          >
            <TraderAvatar name={u.fullName} value={u.avatarUrl} className="h-10 w-10 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-sm font-black">{u.fullName}</span>
                {u.isVerified && <VerifiedBadge />}
              </span>
              <span className="block truncate text-xs text-slate-500">@{u.username}</span>
            </span>
            {u.isFollowing && <Check size={14} className="shrink-0 text-cyan-300" />}
          </button>
        ))}
        {!loading && !users.length && (
          <div className="grid min-h-40 place-items-center px-6 text-center text-sm text-slate-500">
            No traders found.
          </div>
        )}
      </div>

      {/* Selected preview */}
      {selected && (
        <div className="border-t border-white/8 p-4">
          <div className="rounded-[22px] border border-white/10 bg-white/[.035] p-4">
            <div className="flex items-start gap-3">
              <button onClick={() => onOpenProfile?.(selected.username)}>
                <TraderAvatar name={selected.fullName} value={selected.avatarUrl} className="h-14 w-14 text-base" />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => onOpenProfile?.(selected.username)}
                  className="flex items-center gap-1 text-left"
                >
                  <span className="truncate text-base font-black">{selected.fullName}</span>
                  {selected.isVerified && <VerifiedBadge />}
                </button>
                <p className="text-xs text-slate-500">@{selected.username}</p>
              </div>
            </div>
            {selected.bio && <p className="mt-3 text-sm leading-5 text-slate-300">{selected.bio}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/15 p-2.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Followers</p>
                <b className="mt-0.5 block text-lg">{compact(selected.followersCount)}</b>
              </div>
              <div className="rounded-xl bg-black/15 p-2.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Following</p>
                <b className="mt-0.5 block text-lg">{compact(selected.followingCount)}</b>
              </div>
            </div>
            <button
              onClick={() => void toggleFollow(selected)}
              disabled={actingId === selected.id}
              className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition ${
                selected.isFollowing
                  ? "border border-white/12 bg-white/[.04] text-white hover:bg-rose-400/10 hover:text-rose-200"
                  : "bg-white text-slate-950 hover:bg-slate-200"
              }`}
            >
              {actingId === selected.id ? (
                <XSpinner size="sm" />
              ) : selected.isFollowing ? (
                <><Check size={15} /> Following</>
              ) : (
                <><UserPlus size={15} /> Follow</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

function NotificationsPanel({ onRead }: { onRead: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ notifications: NotificationItem[] }>("/api/social/notifications")
      .then((data) => {
        if (!active) return;
        setItems(data.notifications);
        void apiRequest<{ success: boolean }>("/api/social/notifications", { method: "PATCH" })
          .then(onRead)
          .catch(() => undefined);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Failed."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onRead]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 p-4">
        <h2 className="text-lg font-black">Notifications</h2>
        <p className="mt-0.5 text-xs text-slate-500">Follow alerts and account activity.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading && <div className="grid min-h-52 place-items-center"><XSpinner size="lg" /></div>}
        {error && <p className="rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
        {!loading && !items.length && (
          <div className="grid min-h-52 place-items-center px-6 text-center">
            <div>
              <Bell className="mx-auto text-slate-600" size={30} />
              <h3 className="mt-3 text-base font-black">No notifications yet</h3>
              <p className="mt-1 text-sm text-slate-500">New follows will appear here.</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <article
              key={item.id}
              className={`flex gap-3 rounded-2xl border border-white/8 p-3 ${item.isRead ? "bg-white/[.025]" : "bg-cyan-300/8"}`}
            >
              <TraderAvatar
                name={item.actor?.fullName ?? "TradeUp"}
                value={item.actor?.avatarUrl ?? null}
                className="h-10 w-10 shrink-0 text-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                  {item.message}
                  {item.actor?.isVerified && <VerifiedBadge />}
                </p>
                <p className="mt-1 text-xs text-slate-500">{ago(item.createdAt)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Panel ────────────────────────────────────────────────────────────

function ProfilePanel({ user, onNavigate }: { user: User; onNavigate: (section: Section) => void }) {
  const name = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Trader");
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const email = user.email ?? "";

  const links: { label: string; section: Section; icon: React.ReactNode }[] = [
    { label: "Feed", section: "feed", icon: <Home size={16} /> },
    { label: "Chat", section: "chat", icon: <MessageSquare size={16} /> },
    { label: "Journal", section: "journal", icon: <BookOpen size={16} /> },
    { label: "Backtest", section: "backtest", icon: <BarChart2 size={16} /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/8 p-4">
        <h2 className="text-lg font-black">Profile</h2>
        <p className="mt-0.5 text-xs text-slate-500">Your account overview.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-[22px] border border-white/10 bg-white/[.035] p-4">
          <div className="flex items-center gap-3">
            <TraderAvatar name={name} value={avatarUrl} className="h-14 w-14 text-base" />
            <div className="min-w-0">
              <p className="truncate font-black">{name}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("account")}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-slate-950 hover:bg-slate-200 transition"
          >
            <UserRound size={15} /> View full profile
          </button>
        </div>

        <div className="mt-4 space-y-1">
          {links.map((link) => (
            <button
              key={link.section}
              onClick={() => onNavigate(link.section)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/[.06] hover:text-white transition"
            >
              <span className="text-slate-500">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  active: Section;
  onChange: (section: Section) => void;
  onPost: () => void;
  onLogin: () => void;
  onOpenProfile?: (username: string) => void;
  user: User;
  hideMobile?: boolean;
  isAdmin?: boolean;
}

export function Sidebar({
  active,
  onChange,
  onOpenProfile,
  user,
  hideMobile,
  isAdmin,
}: SidebarProps) {
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [unread, setUnread] = useState(0);

  const loadUnread = () => {
    apiRequest<{ unreadCount: number }>("/api/social/notifications?mode=count")
      .then((d) => setUnread(d.unreadCount))
      .catch(() => setUnread(0));
  };

  useEffect(() => {
    const timer = window.setTimeout(loadUnread, 600);
    const interval = window.setInterval(loadUnread, 30_000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, []);

  const togglePanel = (panel: SidePanel) =>
    setSidePanel((cur) => (cur === panel ? null : panel));

  const navItems: { section: Section; icon: React.ReactNode; label: string }[] = [
    { section: "feed",      icon: <Home size={20} />,         label: "Feed" },
    { section: "chat",      icon: <MessageSquare size={20} />, label: "Chat" },
    { section: "journal",   icon: <BookOpen size={20} />,     label: "Journal" },
    { section: "backtest",  icon: <BarChart2 size={20} />,    label: "Backtest" },
    ...(isAdmin ? [{ section: "admin" as Section, icon: <ShieldCheck size={20} />, label: "Admin" }] : []),
  ];

  const name = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "T");
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const panelTitle = sidePanel === "search" ? "Search" : sidePanel === "notifications" ? "Notifications" : "Profile";

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className={`sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 lg:flex ${sidePanel ? "w-[340px]" : "w-[72px]"} transition-all duration-300`}>
        {/* Icon rail */}
        <nav className="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 rounded-[28px] border border-white/9 bg-[#0b1220]/60 py-4 backdrop-blur-2xl">
          {/* Logo */}
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-sm font-black shadow-lg shadow-blue-950/30">
            TU
          </div>

          {/* Main nav */}
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = active === item.section;
              return (
                <button
                  key={item.section}
                  onClick={() => onChange(item.section)}
                  title={item.label}
                  className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
                    isActive
                      ? "bg-cyan-300/15 text-cyan-200"
                      : "text-slate-500 hover:bg-white/[.06] hover:text-slate-200"
                  }`}
                >
                  {item.icon}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-300" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search, Notifications, Profile */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => togglePanel("search")}
              title="Search"
              className={`grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidePanel === "search"
                  ? "bg-cyan-300/15 text-cyan-200"
                  : "text-slate-500 hover:bg-white/[.06] hover:text-slate-200"
              }`}
            >
              <Search size={20} />
            </button>

            <button
              onClick={() => togglePanel("notifications")}
              title="Notifications"
              className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidePanel === "notifications"
                  ? "bg-cyan-300/15 text-cyan-200"
                  : "text-slate-500 hover:bg-white/[.06] hover:text-slate-200"
              }`}
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-[#0b1424]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            <button
              onClick={() => togglePanel("profile")}
              title="Profile"
              className={`grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidePanel === "profile"
                  ? "bg-cyan-300/15 text-cyan-200"
                  : "text-slate-500 hover:bg-white/[.06] hover:text-slate-200"
              }`}
            >
              <TraderAvatar name={name} value={avatarUrl} className="h-8 w-8 text-xs" />
            </button>
          </div>
        </nav>

        {/* Slide-in panel */}
        {sidePanel && (
          <div className="ml-2 flex h-full flex-1 flex-col overflow-hidden rounded-[28px] border border-white/9 bg-[#0b1220]/80 text-white backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <span className="text-sm font-black text-slate-300">{panelTitle}</span>
              <button
                onClick={() => setSidePanel(null)}
                className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-white/[.06] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidePanel === "search" && <SearchPanel onOpenProfile={onOpenProfile} />}
              {sidePanel === "notifications" && <NotificationsPanel onRead={() => setUnread(0)} />}
              {sidePanel === "profile" && <ProfilePanel user={user} onNavigate={(s) => { onChange(s); setSidePanel(null); }} />}
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile bottom nav ── */}
      {!hideMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-white/8 bg-[#08111f]/90 px-2 backdrop-blur-2xl lg:hidden">
          {navItems.map((item) => {
            const isActive = active === item.section;
            return (
              <button
                key={item.section}
                onClick={() => onChange(item.section)}
                className={`flex flex-col items-center gap-1 px-3 py-1 ${
                  isActive ? "text-cyan-300" : "text-slate-500"
                }`}
              >
                {item.icon}
                <span className="text-[9px] font-bold">{item.label}</span>
              </button>
            );
          })}

          {/* Mobile search/notifications */}
          <button
            onClick={() => togglePanel("search")}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${sidePanel === "search" ? "text-cyan-300" : "text-slate-500"}`}
          >
            <Search size={20} />
            <span className="text-[9px] font-bold">Search</span>
          </button>
          <button
            onClick={() => togglePanel("notifications")}
            className={`relative flex flex-col items-center gap-1 px-3 py-1 ${sidePanel === "notifications" ? "text-cyan-300" : "text-slate-500"}`}
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute right-1 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-0.5 text-[8px] font-black text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            <span className="text-[9px] font-bold">Alerts</span>
          </button>
        </nav>
      )}

      {/* Mobile panel overlay */}
      {sidePanel && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#08111f] text-white lg:hidden">
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
            <button onClick={() => setSidePanel(null)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/[.06]">
              <X size={18} />
            </button>
            <span className="font-black">{panelTitle}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {sidePanel === "search" && <SearchPanel onOpenProfile={(u) => { onOpenProfile?.(u); setSidePanel(null); }} />}
            {sidePanel === "notifications" && <NotificationsPanel onRead={() => setUnread(0)} />}
            {sidePanel === "profile" && <ProfilePanel user={user} onNavigate={(s) => { onChange(s); setSidePanel(null); }} />}
          </div>
        </div>
      )}
    </>
  );
}
