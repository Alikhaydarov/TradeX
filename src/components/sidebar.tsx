"use client";

import type { User } from "@supabase/supabase-js";
import {
  BarChart3,
  Bell,
  BookOpen,
  Home,
  LogIn,
  MessageCircle,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { TraderAvatar } from "./trader-avatar";
import type { Section } from "./types";

const baseNav = [
  { id: "feed" as const, label: "Home", hint: "Community feed", icon: Home },
  { id: "chat" as const, label: "Rooms", hint: "Private chats", icon: MessageCircle },
  { id: "journal" as const, label: "Journal", hint: "Trading history", icon: BookOpen },
  { id: "backtest" as const, label: "Lab", hint: "Strategy testing", icon: BarChart3 },
  { id: "account" as const, label: "Profile", hint: "Account settings", icon: UserRound },
];

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
  const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Guest trader");
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "Sign in with Google";
  const avatar = typeof user?.user_metadata.avatar_url === "string"
    ? user.user_metadata.avatar_url
    : null;

  const nav = isAdmin
    ? [...baseNav, { id: "admin" as const, label: "Admin", hint: "User verification", icon: ShieldCheck }]
    : baseNav;

  return (
    <>
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[238px] shrink-0 flex-col rounded-[28px] border border-white/9 bg-[#0b1220]/48 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left" aria-label="TradeUp home">
          <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-[linear-gradient(135deg,rgba(180,110,45,.95)_0%,rgba(92,42,102,.95)_55%,rgba(194,48,132,.95)_100%)] text-lg font-black shadow-lg shadow-pink-950/35">TU</span>
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
                    ? "bg-[linear-gradient(90deg,rgba(180,110,45,.20),rgba(194,48,132,.16))] text-white ring-1 ring-white/10"
                    : "text-slate-400 hover:bg-white/[.045] hover:text-slate-100"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.10)]" : "bg-white/[.035]"}`}>
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

        <button onClick={onPost} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,rgba(180,110,45,.95)_0%,rgba(92,42,102,.95)_55%,rgba(194,48,132,.95)_100%)] py-3 text-sm font-bold text-white shadow-lg shadow-pink-950/30 transition hover:brightness-110">
          <Plus size={18} /> New idea
        </button>

        <div className="mt-auto rounded-2xl border border-white/8 bg-white/[.025] p-2">
          <button onClick={() => user ? onChange("account") : onLogin()} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[.04]">
            <TraderAvatar name={name} value={avatar} className="h-10 w-10 text-xs" />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs">{name}</strong>
              <small className="block truncate text-[10px] text-slate-500">{handle}</small>
            </span>
            {user ? <Bell size={16} className="text-slate-500" /> : <LogIn size={16} className="text-slate-500" />}
          </button>
        </div>
      </aside>

      {!hideMobile && (
        <nav className="fixed inset-x-3 bottom-3 z-50 flex h-[78px] items-center justify-around rounded-[30px] border border-white/15 bg-[linear-gradient(90deg,rgba(180,110,45,.88)_0%,rgba(92,42,102,.88)_55%,rgba(194,48,132,.88)_100%)] px-2 shadow-[0_14px_45px_rgba(0,0,0,.42)] backdrop-blur-2xl lg:hidden">
          {nav.map(({ id, label, icon: Icon }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex h-[58px] min-w-0 flex-1 flex-col items-center justify-center rounded-[24px] px-2 transition ${
                  selected
                    ? "border border-white/10 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_8px_24px_rgba(0,0,0,.24)] backdrop-blur-xl"
                    : "text-white/75 hover:bg-white/[.07] hover:text-white"
                }`}
                aria-label={label}
              >
                <Icon size={22} strokeWidth={selected ? 2.6 : 2.1} />
                <span className="mt-1 max-w-full truncate text-[11px] font-medium leading-none">{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
