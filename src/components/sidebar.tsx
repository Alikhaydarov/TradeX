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
  { id: "backtest" as const, label: "Backtest", hint: "Strategy lab", icon: BarChart3 },
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
      <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[232px] shrink-0 flex-col rounded-[22px] border border-white/8 bg-[#111111]/92 p-3 shadow-2xl shadow-black/25 backdrop-blur-2xl lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left" aria-label="TradeWay bosh sahifa">
          <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-800 text-lg font-black text-black shadow-lg shadow-black/40">TW</span>
          <span>
            <strong className="block text-base tracking-tight">TradeWay</strong>
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
                    ? "bg-white/[.08] text-white ring-1 ring-white/15"
                    : "text-slate-500 hover:bg-white/[.025] hover:text-slate-300"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors duration-100 ${selected ? "bg-white/14 text-zinc-300" : "bg-white/[.025] text-slate-500 group-hover:bg-white/[.04] group-hover:text-slate-300"}`}>
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

        <button onClick={onPost} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition hover:bg-slate-200">
          <Plus size={18} /> New post
        </button>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Social</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">Notifications</p>
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
        <nav className="fixed inset-x-3 bottom-3 z-50 flex h-16 items-center justify-around rounded-2xl border border-white/10 bg-[#111111]/88 px-2 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:hidden">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onChange(id)} className={`grid h-11 w-11 place-items-center rounded-xl transition-colors duration-100 ${active === id ? "bg-white/[.08] text-zinc-300 ring-1 ring-white/15" : "text-slate-600"}`} aria-label={label}>
              <Icon size={21} strokeWidth={active === id ? 2.6 : 2} />
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
