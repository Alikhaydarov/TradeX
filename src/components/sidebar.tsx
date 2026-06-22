"use client";

import type { User } from "@supabase/supabase-js";
import {
  BarChart3,
  BookOpen,
  Home,
  LogIn,
  MessageCircle,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { SocialActions } from "./social-actions-v2";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import type { Section } from "./types";

const baseNav = [
  { id: "feed" as const, label: "Home", hint: "Market pulse", icon: Home },
  { id: "chat" as const, label: "Chat", hint: "Trader rooms", icon: MessageCircle },
  { id: "journal" as const, label: "Journal", hint: "Trade records", icon: BookOpen },
  { id: "backtest" as const, label: "Backtest", hint: "Hali ishlamaydi", icon: BarChart3, unavailable: true },
  { id: "account" as const, label: "Account", hint: "Profile settings", icon: UserRound },
];

function usernameFromUser(user: User | null) {
  const raw = String(
    user?.user_metadata.user_name ??
    user?.user_metadata.preferred_username ??
    user?.email?.split("@")[0] ??
    "profile",
  );

  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) || "profile";
}

export function Sidebar({
  active,
  onChange,
  onPost,
  onLogin,
  user,
  hideMobile = false,
  isAdmin = false,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onPost: () => void;
  onLogin: () => void;
  user: User | null;
  hideMobile?: boolean;
  isAdmin?: boolean;
}) {
  const [isVerified, setIsVerified] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Mehmon trader");
  const username = usernameFromUser(user);
  const handle = user ? `@${profileUsername || username}` : "Google bilan kirish";
  const avatar = typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  useEffect(() => {
    if (!user) return;

    let active = true;
    apiRequest<{ profile: { username?: string | null; is_verified?: boolean | null } }>("/api/profile")
      .then(({ profile }) => {
        if (!active) return;
        setIsVerified(Boolean(profile.is_verified));
        setProfileUsername(profile.username || "");
      })
      .catch(() => {
        if (!active) return;
        setIsVerified(false);
        setProfileUsername("");
      });

    return () => {
      active = false;
    };
  }, [user]);

  const nav = isAdmin
    ? [...baseNav, { id: "admin" as const, label: "Admin", hint: "User verification", icon: ShieldCheck }]
    : baseNav;

  const openProfile = () => {
    if (!user) return onLogin();
    onChange("account");
  };

  return (
    <>
      <aside className="fixed left-[max(0.75rem,calc((100vw-1560px)/2+0.75rem))] top-3 z-40 hidden h-[calc(100dvh-1.5rem)] w-[232px] shrink-0 flex-col rounded-xl border border-border bg-[#111111] p-3 shadow-2xl shadow-black/25 lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[.035]" aria-label="TradeWay bosh sahifa">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-800 text-lg font-black text-black shadow-lg shadow-black/40">TW</span>
          <span>
            <strong className="block text-base tracking-tight">TradeWay</strong>
            <small className="text-[11px] text-slate-500">Trader workspace</small>
          </span>
        </button>

        <nav className="mt-6 space-y-1.5">
          {nav.map((item) => {
            const { id, label, hint, icon: Icon } = item;
            const unavailable = "unavailable" in item && item.unavailable;
            const selected = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "bg-white/[.08] text-white ring-1 ring-white/15"
                    : "text-slate-500 hover:bg-white/[.025] hover:text-slate-300"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg transition-colors duration-100 ${selected ? "bg-white/14 text-zinc-200" : "bg-white/[.025] text-zinc-500 group-hover:bg-white/[.04] group-hover:text-zinc-300"}`}>
                  <Icon size={18} strokeWidth={selected ? 2.5 : 2} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <strong className="block text-sm">{label}</strong>
                    {unavailable ? <small className="rounded-md border border-amber-300/15 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-200">Soon</small> : null}
                  </span>
                  <small className="block truncate text-[10px] text-slate-500">{hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <button onClick={onPost} className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-black text-zinc-950 shadow-lg shadow-black/20 transition-colors hover:bg-zinc-200">
          <Plus size={18} /> Share a trade
        </button>

        <div className="mt-auto space-y-3">
          <div className="rounded-lg border border-border bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Social</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">Notifications</p>
              </div>
              <SocialActions />
            </div>
          </div>

          <button onClick={openProfile} className="flex w-full items-center gap-3 rounded-lg border border-border bg-white/[.025] p-2 text-left transition-colors hover:bg-white/[.05]">
            <TraderAvatar name={name} value={avatar} className="h-10 w-10 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1">
                <strong className="truncate text-xs">{name}</strong>
                {user && isVerified ? <VerifiedBadge size={13} /> : null}
              </span>
              <small className="block truncate text-[10px] text-slate-500">{handle}</small>
            </span>
            {!user ? <LogIn size={16} className="text-slate-500" /> : null}
          </button>
        </div>
      </aside>

      {!hideMobile && (
        <nav className="fixed inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] z-50 flex h-16 items-center justify-around rounded-xl border border-border bg-[#111111]/96 px-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:inset-x-3 sm:px-2 lg:hidden">
          {nav.map((item) => {
            const { id, label, icon: Icon } = item;
            const unavailable = "unavailable" in item && item.unavailable;
            return (
              <button key={id} onClick={() => onChange(id)} className={`relative grid h-11 w-11 place-items-center rounded-lg transition-colors duration-100 ${active === id ? "bg-white/[.09] text-zinc-100 ring-1 ring-white/15" : "text-zinc-500"}`} aria-label={unavailable ? `${label} hali ishlamaydi` : label}>
                <Icon size={21} strokeWidth={active === id ? 2.6 : 2} />
                {unavailable ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-300" /> : null}
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
