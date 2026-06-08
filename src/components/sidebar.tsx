"use client";

import {
  Bell,
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TraderAvatar } from "./trader-avatar";
import { useAuth } from "./auth-context";
import { apiRequest } from "@/lib/api-client";
import type { Section } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
}

interface Notification {
  id: string;
  type: string;
  actorName: string;
  actorAvatar: string | null;
  message: string;
  createdAt: string;
  read: boolean;
}

// ─── Search Panel ────────────────────────────────────────────────────────────

function SearchPanel({ onOpenProfile }: { onOpenProfile: (username: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(() => {
      setLoading(true);
      apiRequest<{ users: SearchUser[] }>(`/api/social/search?q=${encodeURIComponent(query)}`)
        .then((d) => setResults(d.users ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
  }, [query]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-400">Qidirish</h2>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3">
        <Search size={14} className="shrink-0 text-slate-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Foydalanuvchi qidirish…"
          className="flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>
      {loading && <p className="text-center text-xs text-slate-600">Izlanmoqda…</p>}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => onOpenProfile(u.username)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[.05]"
              >
                <TraderAvatar name={u.fullName} value={u.avatarUrl} className="h-9 w-9 shrink-0 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-bold">
                    {u.fullName}
                    {u.isVerified && <ShieldCheck size={13} className="shrink-0 text-cyan-400" />}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">@{u.username}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center text-xs text-slate-600">Hech narsa topilmadi</p>
      )}
    </div>
  );
}

// ─── Notifications Panel ─────────────────────────────────────────────────────

function NotificationsPanel() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ notifications: Notification[] }>("/api/social/notifications")
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-400">Bildirishnomalar</h2>
      {loading && <p className="text-center text-xs text-slate-600">Yuklanmoqda…</p>}
      {!loading && items.length === 0 && (
        <p className="text-center text-xs text-slate-600">Bildirishnoma yo'q</p>
      )}
      <ul className="flex flex-col gap-1">
        {items.map((n) => (
          <li key={n.id} className={`flex items-start gap-3 rounded-2xl p-3 ${n.read ? "" : "bg-white/[.04]"}`}>
            <TraderAvatar name={n.actorName} value={n.actorAvatar} className="h-9 w-9 shrink-0 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 text-slate-200">{n.message}</p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                {new Date(n.createdAt).toLocaleDateString("uz-UZ")}
              </p>
            </div>
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Profile Panel ───────────────────────────────────────────────────────────

function ProfilePanel({
  user,
  onChange,
}: {
  user: { user_metadata: Record<string, unknown>; id: string };
  onChange: (section: Section) => void;
}) {
  const name = String(user.user_metadata.full_name ?? user.user_metadata.name ?? "Trader");
  const avatar = typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-400">Profil</h2>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
        <TraderAvatar name={name} value={avatar} className="h-12 w-12 shrink-0 text-xs" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-[11px] text-slate-500">Hisobni boshqarish</p>
        </div>
      </div>
      <button
        onClick={() => onChange("account")}
        className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold transition hover:bg-white/[.07]"
      >
        <User size={15} /> Profilni ko'rish
      </button>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

type PanelTab = "search" | "notifications" | "profile" | null;

interface SidebarProps {
  active: Section;
  onChange: (section: Section) => void;
  onPost: () => void;
  onLogin: () => void;
  onOpenProfile: (username: string) => void;
  user: { user_metadata: Record<string, unknown>; id: string } | null;
  hideMobile?: boolean;
  isAdmin?: boolean;
}

export function Sidebar({
  active,
  onChange,
  onOpenProfile,
  user,
  hideMobile = false,
  isAdmin = false,
}: SidebarProps) {
  const [panel, setPanel] = useState<PanelTab>(null);
  const [unread, setUnread] = useState(0);

  // Load unread notification count
  useEffect(() => {
    if (!user) return;
    apiRequest<{ notifications: Notification[] }>("/api/social/notifications")
      .then((d) => setUnread((d.notifications ?? []).filter((n) => !n.read).length))
      .catch(() => {});
  }, [user]);

  const togglePanel = (tab: PanelTab) =>
    setPanel((prev) => (prev === tab ? null : tab));

  const handleSectionClick = (section: Section) => {
    setPanel(null);
    onChange(section);
  };

  const handleOpenProfile = (username: string) => {
    setPanel(null);
    onOpenProfile(username);
  };

  // Main nav items
  const navItems: { section: Section; icon: React.ReactNode; label: string }[] = [
    { section: "feed",     icon: <LayoutDashboard size={20} />, label: "Feed" },
    { section: "chat",     icon: <MessageSquare size={20} />,   label: "Chatlar" },
    { section: "journal",  icon: <BookOpen size={20} />,        label: "Jurnal" },
    { section: "backtest", icon: <TrendingUp size={20} />,      label: "Backtest" },
  ];

  if (isAdmin) {
    navItems.push({ section: "admin", icon: <ShieldCheck size={20} />, label: "Admin" });
  }

  // Panel trigger items (Search, Notifications, Profile) — visible on desktop only
  const panelItems: { tab: PanelTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { tab: "search",        icon: <Search size={20} />,  label: "Qidirish" },
    { tab: "notifications", icon: <Bell size={20} />,    label: "Bildirishnomalar", badge: unread },
    { tab: "profile",       icon: <User size={20} />,    label: "Profil" },
  ];

  const name = user ? String(user.user_metadata.full_name ?? user.user_metadata.name ?? "T") : "T";
  const avatar = user && typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-row lg:gap-0">
        {/* Icon column */}
        <nav className="flex w-[72px] flex-col items-center gap-1 py-4">
          {/* Logo */}
          <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-[11px] font-black shadow-lg shadow-blue-950/40">
            TX
          </div>

          {/* Main sections */}
          {navItems.map(({ section, icon, label }) => (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              title={label}
              className={`grid h-10 w-10 place-items-center rounded-2xl transition-all ${
                active === section && panel === null
                  ? "bg-cyan-400/15 text-cyan-300"
                  : "text-slate-500 hover:bg-white/[.06] hover:text-slate-300"
              }`}
            >
              {icon}
            </button>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Panel triggers: Search, Notifications, Profile */}
          {panelItems.map(({ tab, icon, label, badge }) => (
            <button
              key={tab}
              onClick={() => togglePanel(tab)}
              title={label}
              className={`relative grid h-10 w-10 place-items-center rounded-2xl transition-all ${
                panel === tab
                  ? "bg-cyan-400/15 text-cyan-300"
                  : "text-slate-500 hover:bg-white/[.06] hover:text-slate-300"
              }`}
            >
              {icon}
              {badge !== undefined && badge > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-black text-slate-950">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          ))}

          {/* Avatar at bottom */}
          {user && (
            <button
              onClick={() => togglePanel("profile")}
              title="Profil"
              className="mt-2"
            >
              <TraderAvatar name={name} value={avatar} className="h-9 w-9 text-[10px]" />
            </button>
          )}
        </nav>

        {/* Slide-out panel */}
        {panel !== null && (
          <div className="w-72 overflow-y-auto rounded-r-[28px] border-l border-white/8 bg-[#0d1627]/60 backdrop-blur-xl">
            {panel === "search" && <SearchPanel onOpenProfile={handleOpenProfile} />}
            {panel === "notifications" && <NotificationsPanel />}
            {panel === "profile" && user && <ProfilePanel user={user} onChange={onChange} />}
          </div>
        )}
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      {!hideMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-white/8 bg-[#0b1220]/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-2xl lg:hidden">
          {navItems.map(({ section, icon, label }) => (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-bold transition-colors ${
                active === section
                  ? "text-cyan-300"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
          {/* Search on mobile */}
          <button
            onClick={() => togglePanel(panel === "search" ? null : "search")}
            aria-label="Qidirish"
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-bold transition-colors ${
              panel === "search" ? "text-cyan-300" : "text-slate-600 hover:text-slate-400"
            }`}
          >
            <Search size={20} />
            Qidirish
          </button>
        </nav>
      )}

      {/* Mobile panel overlay */}
      {panel !== null && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setPanel(null)}>
          <div
            className="absolute bottom-16 left-0 right-0 rounded-t-[28px] border-t border-white/10 bg-[#0d1627] pb-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {panel === "search" && <SearchPanel onOpenProfile={handleOpenProfile} />}
            {panel === "notifications" && <NotificationsPanel />}
            {panel === "profile" && user && <ProfilePanel user={user} onChange={onChange} />}
          </div>
        </div>
      )}
    </>
  );
}
