"use client";

import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogIn,
  Menu,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  SquareChartGantt,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { useActiveAccountStore } from "./active-account-context";
import { Dialog, DialogContent } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
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
  const { accounts, activeAccountId } = useActiveAccountStore();
  const [profileUsername, setProfileUsername] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, locale, locales, labels, setLocale } = useLanguage();
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
    { id: "account" as const, label: t("profile"), hint: t("proofSettings"), icon: UserRound },
  ];
  const nav = isAdmin
    ? [...baseNav, { id: "admin" as const, label: "Admin", hint: "User verification", icon: ShieldCheck }]
    : baseNav;
  const journalNav = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "trades", label: "Trades", icon: SquareChartGantt },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ] as const;

  const openAccountsPage = () => {
    onChange("journal");
    setMobileMenuOpen(false);
  };

  const openHomeTab = (tab: typeof journalNav[number]["id"]) => {
    onChange("feed");
    window.dispatchEvent(new CustomEvent("tradeway:home-tab", { detail: { tab } }));
    setMobileMenuOpen(false);
  };

  const openProfile = () => {
    if (!user) return onLogin();
    setMobileMenuOpen(false);
    onChange("account");
  };

  return (
    <>
      <aside className="fixed left-[max(1rem,calc((100vw-1860px)/2+1rem))] top-4 z-40 hidden h-[calc(100dvh-2rem)] w-[272px] shrink-0 flex-col rounded-[1.25rem] border border-white/8 bg-[#000000] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-[1.25rem] px-2 py-2.5 text-left transition-colors hover:bg-white/[.05]" aria-label="TradeWay home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(232,232,236,1))] text-lg font-black text-black shadow-[0_12px_28px_rgba(255,255,255,.08)]">TW</span>
          <span>
            <strong className="block text-base tracking-tight">TradeWay</strong>
            <small className="text-[11px] text-zinc-500">Trader workspace</small>
          </span>
        </button>

        <button type="button" onClick={openAccountsPage} className="mt-4 flex w-full items-center gap-3 rounded-[1rem] border border-white/8 bg-[#050505] p-4 text-left transition hover:bg-white/[.03]">
          <span className={`size-2 shrink-0 rounded-full ${activeAccount ? "bg-emerald-500" : "bg-zinc-500"}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{activeAccount?.name || "All Accounts"}</p>
            <p className="truncate text-[11px] text-zinc-500">{activeAccount ? activeBalance : "Open accounts workspace"}</p>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-zinc-400">
            <ChevronDown size={14} />
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

        {active === "feed" ? (
          <div className="mt-5 space-y-2">
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
            <div className="space-y-1">
              {journalNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openHomeTab(item.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-zinc-300 transition hover:bg-white/[.04] hover:text-white"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[.035] text-zinc-400">
                      <Icon size={17} />
                    </span>
                    <strong className="text-sm font-semibold">{item.label}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <button onClick={onPost} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-zinc-950 shadow-[0_14px_32px_rgba(255,255,255,.08)] transition-colors hover:bg-zinc-200">
          <Plus size={18} /> {t("shareTrade")}
        </button>

        <div className="mt-auto">
          <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-xl transition-colors hover:bg-white/[.06]">
            <TraderAvatar name={name} value={avatar} className="h-10 w-10 text-xs" />
            <button onClick={openProfile} className="min-w-0 flex-1 text-left">
              <span className="flex min-w-0 items-center gap-1">
                <strong className="truncate text-xs">{name}</strong>
              </span>
              <small className="block truncate text-[10px] text-zinc-500">{handle}</small>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="grid size-8 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/[.05] hover:text-white">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#090909]">
                {locales.map((item) => (
                  <DropdownMenuItem key={item} onClick={() => setLocale(item)} className="flex items-center justify-between px-3 py-2.5">
                    <span>{labels[item]}</span>
                    {locale === item ? <span className="text-[10px] font-bold text-zinc-400">Active</span> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {!user ? <LogIn size={16} className="text-zinc-500" /> : null}
          </div>
        </div>
      </aside>

      {!hideMobile && (
        <>
          <header className="fixed inset-x-0 top-0 z-50 flex h-[72px] items-center border-b border-white/8 bg-black/95 px-4 backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-white"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="ml-3 min-w-0 flex-1">
              <p className="truncate text-lg font-black text-white">
                {active === "journal" ? "Accounts" : nav.find((item) => item.id === active)?.label || "TradeWay"}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {activeAccount?.name || "All Accounts"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPost}
                className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,.08)]"
                aria-label={t("shareTrade")}
              >
                <Plus size={18} />
              </button>
            </div>
          </header>

          <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DialogContent
              showCloseButton={false}
              className="left-0 top-0 h-[100dvh] w-[88vw] max-w-[420px] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-black p-0 sm:max-w-[420px] lg:hidden"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-base font-black text-black">TW</span>
                    <div>
                      <strong className="block text-base text-white">TradeWay</strong>
                      <small className="text-xs text-zinc-500">Free</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-300"
                    aria-label="Close navigation"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="border-b border-white/8 px-5 py-4">
                  <button type="button" onClick={openAccountsPage} className="flex w-full items-center gap-3 rounded-[1.15rem] border border-white/8 bg-[#0b0b0b] px-3 py-3 text-left">
                    <span className={`mt-0.5 size-2 shrink-0 rounded-full ${activeAccount ? "bg-emerald-500" : "bg-zinc-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-white">{activeAccount?.name || "All Accounts"}</p>
                      <p className="truncate text-xs text-zinc-500">{activeAccount ? activeBalance : "Open accounts workspace"}</p>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-zinc-400">
                      <ChevronDown size={15} />
                    </span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
                  <nav className="space-y-2">
                    {nav.map((item) => {
                      const { id, label, hint, icon: Icon } = item;
                      const selected = active === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onChange(id);
                          }}
                          className={`flex w-full items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left transition ${
                            selected ? "bg-white/[.09] text-white ring-1 ring-white/12" : "text-zinc-400 hover:bg-white/[.04] hover:text-white"
                          }`}
                        >
                          <span className={`grid size-11 place-items-center rounded-2xl ${selected ? "bg-white/[.10] text-white" : "bg-white/[.03] text-zinc-500"}`}>
                            <Icon size={20} />
                          </span>
                          <span className="min-w-0">
                            <strong className="block text-base">{label}</strong>
                            <small className="block truncate text-xs text-zinc-500">{hint}</small>
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                  {active === "feed" ? (
                    <div className="mt-5">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
                      <div className="space-y-2">
                        {journalNav.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openHomeTab(item.id)}
                              className="flex w-full items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left text-zinc-300 transition hover:bg-white/[.04] hover:text-white"
                            >
                              <span className="grid size-11 place-items-center rounded-2xl bg-white/[.03] text-zinc-500">
                                <Icon size={20} />
                              </span>
                              <strong className="block text-base">{item.label}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-white/8 p-5">
                  <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-left">
                    <TraderAvatar name={name} value={avatar} className="h-11 w-11 text-xs" />
                    <button onClick={openProfile} className="min-w-0 flex-1 text-left">
                      <strong className="block truncate text-sm text-white">{name}</strong>
                      <small className="block truncate text-xs text-zinc-500">{handle}</small>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="grid size-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/[.05] hover:text-white">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#090909]">
                        {locales.map((item) => (
                          <DropdownMenuItem key={item} onClick={() => setLocale(item)} className="flex items-center justify-between px-3 py-2.5">
                            <span>{labels[item]}</span>
                            {locale === item ? <span className="text-[10px] font-bold text-zinc-400">Active</span> : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {!user ? <LogIn size={16} className="text-zinc-500" /> : null}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
