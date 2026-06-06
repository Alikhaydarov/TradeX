"use client";

import type { User } from "@supabase/supabase-js";
import { BarChart3, Bell, BookOpen, Home, LogIn, MessageCircle, Search, UserRound } from "lucide-react";
import type { Section } from "./types";

const nav = [
  { id: "feed" as const, label: "Bosh sahifa", icon: Home },
  { id: "chat" as const, label: "Chat", icon: MessageCircle },
  { id: "journal" as const, label: "Jurnal", icon: BookOpen },
  { id: "backtest" as const, label: "Backtest", icon: BarChart3 },
  { id: "account" as const, label: "Account", icon: UserRound },
];

export function Sidebar({
  active,
  onChange,
  onPost,
  onLogin,
  user,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onPost: () => void;
  onLogin: () => void;
  user: User | null;
}) {
  const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Mehmon");
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "Google bilan kiring";
  const initial = name[0]?.toUpperCase() ?? "T";

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col px-3 py-2 lg:flex">
        <button onClick={() => onChange("feed")} className="mb-2 flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/10" aria-label="TradeX bosh sahifa">
          <span className="text-[29px] font-black tracking-tighter">TX</span>
        </button>
        <nav className="space-y-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onChange(id)} className={`flex w-fit items-center gap-5 rounded-full px-4 py-3 text-xl transition hover:bg-white/10 ${active === id ? "font-bold text-white" : "text-[#e7e9ea]"}`}>
              <Icon size={27} strokeWidth={active === id ? 2.5 : 1.8} />
              {label}
            </button>
          ))}
          <button className="flex w-fit items-center gap-5 rounded-full px-4 py-3 text-xl hover:bg-white/10"><Search size={27} />Izlash</button>
          <button className="flex w-fit items-center gap-5 rounded-full px-4 py-3 text-xl hover:bg-white/10"><Bell size={27} />Bildirishnomalar</button>
        </nav>
        <button onClick={onPost} className="mt-5 w-[218px] rounded-full bg-xblue py-3.5 text-[17px] font-bold text-white transition hover:bg-[#1a8cd8]">Post yozish</button>
        <button onClick={() => user ? onChange("account") : onLogin()} className="mt-auto flex w-full items-center gap-3 rounded-full p-3 text-left hover:bg-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 font-bold">{initial}</div>
          <div className="min-w-0 text-sm"><p className="truncate font-bold">{name}</p><p className="truncate text-xmuted">{handle}</p></div>
          {user ? <span className="ml-auto">•••</span> : <LogIn className="ml-auto" size={18} />}
        </button>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-xborder bg-black/95 backdrop-blur lg:hidden">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onChange(id)} className={active === id ? "text-white" : "text-xmuted"} aria-label={label}>
            <Icon size={25} strokeWidth={active === id ? 2.7 : 1.8} />
          </button>
        ))}
      </nav>
    </>
  );
}
