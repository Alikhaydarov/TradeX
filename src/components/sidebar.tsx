"use client";

import type { User } from "@supabase/supabase-js";
import {
  BookOpen,
  ChevronDown,
  Home,
  LogIn,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { useActiveAccountStore } from "./active-account-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { LanguageSwitcher } from "./language-switcher";
import { PropFirmLogo } from "./prop-firm-logo";
import { SocialActions } from "./social-actions-v2";
import { TraderAvatar } from "./trader-avatar";
import type { Section } from "./types";

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
  const { accounts, activeAccountId, setActiveAccount } = useActiveAccountStore();
  const [profileUsername, setProfileUsername] = useState("");
  const { t } = useLanguage();
  const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Mehmon trader");
  const username = usernameFromUser(user);
  const handle = user ? `@${profileUsername || username}` : "Sign in with Google";
  const avatar = typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;
  const activeBalance = activeAccount ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(activeAccount.accountSize) : "$0";

  useEffect(() => {
    if (!user) return;

    let active = true;
    apiRequest<{ profile: { username?: string | null; is_verified?: boolean | null } }>("/api/profile")
      .then(({ profile }) => {
        if (!active) return;
        setProfileUsername(profile.username || "");
      })
      .catch(() => {
        if (!active) return;
        setProfileUsername("");
      });

    return () => {
      active = false;
    };
  }, [user]);

  const baseNav = [
    { id: "feed" as const, label: t("home"), hint: t("marketPulse"), icon: Home },
    { id: "journal" as const, label: t("journal"), hint: t("accountsRecords"), icon: BookOpen },
    { id: "account" as const, label: t("profile"), hint: t("proofSettings"), icon: UserRound },
  ];
  const nav = isAdmin
    ? [...baseNav, { id: "admin" as const, label: "Admin", hint: "User verification", icon: ShieldCheck }]
    : baseNav;

  const openProfile = () => {
    if (!user) return onLogin();
    onChange("account");
  };

  return (
    <>
      <aside className="fixed left-[max(1rem,calc((100vw-1720px)/2+1rem))] top-4 z-40 hidden h-[calc(100dvh-2rem)] w-[252px] shrink-0 flex-col rounded-[1.75rem] border border-white/12 bg-[rgba(20,20,24,0.66)] p-3.5 shadow-[0_24px_70px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.065)] backdrop-blur-[28px] lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-[1.25rem] px-2 py-2.5 text-left transition-colors hover:bg-white/[.05]" aria-label="TradeWay home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(232,232,236,1))] text-lg font-black text-black shadow-[0_12px_28px_rgba(255,255,255,.08)]">TW</span>
          <span>
            <strong className="block text-base tracking-tight">TradeWay</strong>
            <small className="text-[11px] text-zinc-500">Trader workspace</small>
          </span>
        </button>

        <div className="mt-4 rounded-[1rem] border border-white/8 bg-[#050505] p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-[0.9rem] px-2 py-2 text-left transition hover:bg-white/[.04]">
                <span className={`mt-0.5 size-2 shrink-0 rounded-full ${activeAccount ? "bg-emerald-500" : "bg-zinc-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{activeAccount?.name || "All Accounts"}</p>
                  <p className="truncate text-[11px] text-zinc-500">{activeAccount ? activeBalance : "Aggregate view"}</p>
                </div>
                <span className="grid size-8 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-zinc-400">
                  <Pencil size={14} />
                </span>
                <span className="grid size-8 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-zinc-400">
                  <ChevronDown size={14} />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[230px] border-white/10 bg-[#090909]">
              <DropdownMenuItem onClick={() => { setActiveAccount(null); onChange("journal"); }} className="flex items-center gap-3 px-3 py-2.5">
                <span className="size-2 rounded-full bg-zinc-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">All Accounts</p>
                  <p className="truncate text-[11px] text-zinc-500">Combined portfolio view</p>
                </div>
              </DropdownMenuItem>
              {accounts.map((account) => (
                <DropdownMenuItem key={account.id} onClick={() => { setActiveAccount(account.id); onChange("journal"); }} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={`size-2 rounded-full ${account.status === "Active" ? "bg-emerald-500" : "bg-zinc-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{account.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(account.accountSize)}</p>
                  </div>
                  <PropFirmLogo firm={account.firm} compact />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="mt-6 space-y-1.5">
          {nav.map((item) => {
            const { id, label, hint, icon: Icon } = item;
            const unavailable = "unavailable" in item && item.unavailable;
            const selected = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                  selected
                    ? "bg-white/[.095] text-white ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]"
                    : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-300"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-2xl transition-colors duration-100 ${selected ? "bg-white/14 text-zinc-100" : "bg-white/[.035] text-zinc-500 group-hover:bg-white/[.06] group-hover:text-zinc-300"}`}>
                  <Icon size={18} strokeWidth={selected ? 2.5 : 2} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <strong className="block text-sm">{label}</strong>
                    {unavailable ? <small className="rounded-md border border-amber-300/15 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-200">Soon</small> : null}
                  </span>
                  <small className="block truncate text-[10px] text-zinc-500">{hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <button onClick={onPost} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-zinc-950 shadow-[0_14px_32px_rgba(255,255,255,.08)] transition-colors hover:bg-zinc-200">
          <Plus size={18} /> {t("shareTrade")}
        </button>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            <SocialActions />
            <LanguageSwitcher compact />
          </div>

          <button onClick={openProfile} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-xl transition-colors hover:bg-white/[.06]">
            <TraderAvatar name={name} value={avatar} className="h-10 w-10 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1">
                <strong className="truncate text-xs">{name}</strong>
              </span>
              <small className="block truncate text-[10px] text-zinc-500">{handle}</small>
            </span>
            {!user ? <LogIn size={16} className="text-zinc-500" /> : null}
          </button>
        </div>
      </aside>

      {!hideMobile && (
      <nav className="fixed inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] z-50 flex h-16 items-center justify-around rounded-[1.75rem] border border-white/12 bg-[rgba(20,20,24,0.68)] px-1.5 shadow-[0_18px_58px_rgba(0,0,0,.34),inset_0_1px_0_rgba(255,255,255,.055)] backdrop-blur-[28px] sm:inset-x-3 sm:px-2 lg:hidden">
          {nav.map((item) => {
            const { id, label, icon: Icon } = item;
            const unavailable = "unavailable" in item && item.unavailable;
            return (
              <button key={id} onClick={() => onChange(id)} className={`relative grid h-11 w-11 place-items-center rounded-2xl transition-colors duration-100 ${active === id ? "bg-white/[.105] text-zinc-100 ring-1 ring-white/15" : "text-zinc-500 hover:bg-white/[.045] hover:text-zinc-300"}`} aria-label={unavailable ? `${label} is not available yet` : label}>
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
