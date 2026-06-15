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
  { id: "feed" as const, label: "Pulse", hint: "Community feed", icon: Home },
  { id: "chat" as const, label: "Rooms", hint: "Trader suhbatlari", icon: MessageCircle },
  { id: "journal" as const, label: "Journal", hint: "Natijalar tarixi", icon: BookOpen },
  { id: "backtest" as const, label: "Lab", hint: "Strategiya sinovi", icon: BarChart3 },
  { id: "account" as const, label: "Profil", hint: "Account va sozlama", icon: UserRound },
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
  onOpenProfile,
  user,
  hideMobile = false,
  isAdmin = false,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onPost: () => void;
  onLogin: () => void;
  onOpenProfile?: (username: string) => void;
  user: User | null;
  hideMobile?: boolean;
  isAdmin?: boolean;
}) {
  const [isVerified, setIsVerified] = useState(false);
  const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Mehmon trader");
  const username = usernameFromUser(user);
  const handle = user ? `@${username}` : "Google bilan kirish";
  const avatar = typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  useEffect(() => {
    if (!user) return;

    let active = true;
    apiRequest<{ profile: { is_verified?: boolean | null } }>("/api/profile")
      .then(({ profile }) => {
        if (active) setIsVerified(Boolean(profile.is_verified));
      })
      .catch(() => {
        if (active) setIsVerified(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const nav = isAdmin
    ? [...baseNav, { id: "admin" as const, label: "Admin", hint: "User galochkalari", icon: ShieldCheck }]
    : baseNav;

  const openProfile = () => {
    if (!user) return onLogin();
    if (onOpenProfile) onOpenProfile(username);
    else onChange("account");
  };

  return (
    <>
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[238px] shrink-0 flex-col rounded-[28px] border border-white/9 bg-[#0b1220]/48 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left" aria-label="TradeUp bosh sahifa">
          <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-lg font-black shadow-lg shadow-blue-950/50">TU</span>
          <span>
            <strong className="block text-base tracking-tight">TradeUp</strong>
            <small className="text-[11px] text-slate-500">Trader workspace</small>
          </span>
        </button>

        <nav className="mt-6 space-y-1.5">
          {nav.map(({ id, label, hint, icon: Icon }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                  selected
                    ? "bg-gradient-to-r from-blue-500/20 to-violet-500/10 text-white ring-1 ring-blue-400/20"
                    : "text-slate-400 hover:bg-white/[.045] hover:text-slate-100"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? "bg-blue-400/15 text-cyan-300" : "bg-white/[.035]"}`}>
                  <Icon size={18} strokeWidth={selected ? 2.5 : 2} />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm">{label}</strong>
                  <small className="block truncate text-[10px] text-slate-500">{hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <button onClick={onPost} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110">
          <Plus size={18} /> Yangi g&apos;oya
        </button>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Social</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">Search va notification</p>
              </div>
              <SocialActions />
            </div>
          </div>

          <button onClick={openProfile} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-2 text-left hover:bg-white/[.04]">
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
        <nav className="fixed inset-x-3 bottom-3 z-50 flex h-16 items-center justify-around rounded-2xl border border-white/10 bg-[#0b1220]/62 px-2 shadow-2xl backdrop-blur-2xl lg:hidden">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onChange(id)} className={`grid h-11 w-11 place-items-center rounded-xl ${active === id ? "bg-blue-500/20 text-cyan-300" : "text-slate-500"}`} aria-label={label}>
              <Icon size={21} strokeWidth={active === id ? 2.6 : 2} />
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
