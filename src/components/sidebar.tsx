"use client";

import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  ChevronDown,
  Crown,
  Home,
  LayoutDashboard,
  LogIn,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  SquareChartGantt,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { useActiveAccountStore } from "./active-account-context";
import { usePremiumStatus } from "./use-premium-status";
import { Dialog, DialogContent } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { TraderAvatar } from "./trader-avatar";
import type { PropAccount, Section } from "./types";

function usernameFromUser(user: User | null) {
  const raw = String(
    user?.user_metadata.user_name ??
    user?.user_metadata.preferred_username ??
    user?.email?.split("@")[0] ??
    "profile",
  );

  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) || "profile";
}

function initials(account: PropAccount | null) {
  if (!account) return "A";
  return (account.name || account.firm || "A").trim().slice(0, 2).toUpperCase();
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const { t, locale, locales, labels, setLocale } = useLanguage();
  const { status: premium } = usePremiumStatus(Boolean(user));
  const name = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Mehmon trader");
  const username = usernameFromUser(user);
  const handle = user ? `@${profileUsername || username}` : "Sign in with Google";
  const avatar = typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;
  const activeBalance = activeAccount ? money.format(activeAccount.accountSize) : "$0";
  const filteredAccounts = useMemo(() => {
    const query = accountQuery.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) => `${account.name} ${account.firm} ${account.phase} ${account.marketType}`.toLowerCase().includes(query));
  }, [accountQuery, accounts]);

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

  useEffect(() => {
    const open = () => setMobileMenuOpen(true);
    window.addEventListener("tradox:open-mobile-menu", open);
    return () => window.removeEventListener("tradox:open-mobile-menu", open);
  }, []);

  const baseNav = [
    { id: "feed" as const, label: t("home"), icon: Home },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
    { id: "trades" as const, label: "Trades", icon: SquareChartGantt },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUp },
    { id: "account" as const, label: t("profile"), icon: UserRound },
  ];
  const nav = isAdmin
    ? [...baseNav, { id: "admin" as const, label: "Admin", icon: ShieldCheck }]
    : baseNav;

  const openAccountsPage = () => {
    onChange("accounts");
    setMobileMenuOpen(false);
    setAccountSwitcherOpen(false);
  };

  const selectAccount = (id: string) => {
    setActiveAccount(id);
    setAccountSwitcherOpen(false);
    setAccountQuery("");
  };

  const openProfile = () => {
    if (!user) return onLogin();
    setMobileMenuOpen(false);
    onChange("account");
  };

  const openPricing = () => {
    setMobileMenuOpen(false);
    onChange("pricing");
  };

  const renderAccountSwitcher = (mobile = false) => (
    <DropdownMenu open={accountSwitcherOpen} onOpenChange={setAccountSwitcherOpen}>
      <div className={`${mobile ? "flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0b0b0b] p-3" : "mt-4 flex w-full items-center gap-3 rounded-[1rem] border border-white/8 bg-[#050505] p-4 transition hover:bg-white/[.03]"}`}>
        <button type="button" onClick={openAccountsPage} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className={`size-2 shrink-0 rounded-full ${activeAccount ? "bg-emerald-500" : "bg-zinc-500"}`} />
          <div className="min-w-0 flex-1">
            <p className={`${mobile ? "text-sm" : "text-sm"} truncate font-black text-white`}>{activeAccount?.name || "Accounts"}</p>
            <p className={`${mobile ? "text-xs" : "text-[11px]"} truncate text-zinc-500`}>{activeAccount ? activeBalance : "Select trading account"}</p>
          </div>
        </button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${mobile ? "size-9" : "size-8"} grid shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[.03] text-zinc-400 transition hover:bg-white/[.07] hover:text-white`}
            aria-label="Open account switcher"
          >
            <ChevronDown size={mobile ? 14 : 14} className={`transition-transform ${accountSwitcherOpen ? "rotate-180" : ""}`} />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        side={mobile ? "bottom" : "right"}
        align="start"
        sideOffset={mobile ? 10 : 12}
        className={`${mobile ? "w-[min(320px,calc(100vw-2rem))]" : "w-[320px]"} rounded-2xl border-white/10 bg-[#080808] p-0 shadow-[0_28px_80px_rgba(0,0,0,.65)]`}
      >
        <div className="border-b border-white/8 px-4 py-3">
          <button
            type="button"
            onClick={openAccountsPage}
            className="w-full rounded-xl px-2 py-1.5 text-left text-sm font-black text-white transition hover:bg-white/[.04]"
          >
            All Accounts
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-zinc-500">
          <Search size={16} />
          <input
            value={accountQuery}
            onChange={(event) => setAccountQuery(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search account"
            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="max-h-[250px] overflow-y-auto p-2">
          {filteredAccounts.length ? filteredAccounts.map((account) => {
            const selected = account.id === activeAccountId;
            return (
              <DropdownMenuItem
                key={account.id}
                onSelect={(event) => {
                  event.preventDefault();
                  selectAccount(account.id);
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 ${selected ? "bg-white/[.07] text-white" : "text-zinc-300"}`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-black ${selected ? "bg-white text-black" : "bg-white/[.08] text-white"}`}>{initials(account)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{account.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">{account.phase} / {account.marketType}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-zinc-500">{money.format(account.accountSize)}</span>
              </DropdownMenuItem>
            );
          }) : (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">No accounts found.</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <aside className="fixed left-[max(1rem,calc((100vw-1860px)/2+1rem))] top-4 z-40 hidden h-[calc(100dvh-2rem)] w-[272px] shrink-0 flex-col rounded-[1.25rem] border border-white/8 bg-[#000000] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] lg:flex">
        <button onClick={() => onChange("feed")} className="flex items-center gap-3 rounded-[1.25rem] px-2 py-2.5 text-left transition-colors hover:bg-white/[.05]" aria-label="Tradox home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(232,232,236,1))] text-lg font-black text-black shadow-[0_12px_28px_rgba(255,255,255,.08)]">TD</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <strong className="block truncate text-base tracking-tight">TradeWay</strong>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${premium.isPremium ? "bg-emerald-400/12 text-emerald-300" : "bg-white/[.06] text-zinc-400"}`}>
                {premium.isPremium ? "Premium" : "Free"}
              </span>
            </span>
            <small className="text-[11px] text-zinc-500">Trading workspace</small>
          </span>
        </button>

        {renderAccountSwitcher()}

        <p className="mt-6 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">Workspace</p>
        <nav className="mt-2 space-y-1.5">
          {nav.map((item) => {
            const { id, label, icon: Icon } = item;
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
                <strong className="block min-w-0 truncate text-sm">{label}</strong>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 rounded-[1rem] border border-white/8 bg-[#060606] p-3">
          <div className="flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-2xl border ${premium.isPremium ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[.04] text-zinc-400"}`}>
              <Crown size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">{premium.isPremium ? "Premium active" : "Unlock Premium"}</p>
              <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                {premium.isPremium
                  ? "Verified badge, AI coaching and MT5 Auto Sync are enabled."
                  : "Free users keep the basic workspace. AI, badge and auto sync stay locked."}
              </p>
            </div>
          </div>
          {!premium.isPremium ? (
            <button
              type="button"
              onClick={openPricing}
              className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white text-sm font-black text-black transition hover:bg-zinc-200"
            >
              Upgrade
            </button>
          ) : null}
        </div>

        <button onClick={onPost} className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-zinc-950 shadow-[0_14px_32px_rgba(255,255,255,.08)] transition-colors hover:bg-zinc-200">
          <Plus size={18} /> {t("shareTrade")}
        </button>

        <div className="mt-auto">
          <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition-colors hover:bg-[#121212]">
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
                <DropdownMenuItem onClick={openPricing} className="px-3 py-2.5">
                  {premium.isPremium ? "Manage Premium" : "Upgrade to Premium"}
                </DropdownMenuItem>
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
        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent
            showCloseButton={false}
            className="left-0 top-0 h-[100dvh] w-[78vw] max-w-[360px] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-black p-0 sm:max-w-[360px] lg:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-sm font-black text-black">TD</span>
                  <div>
                    <span className="flex items-center gap-2">
                      <strong className="block text-base leading-tight text-white">TradeWay</strong>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${premium.isPremium ? "bg-emerald-400/12 text-emerald-300" : "bg-white/[.06] text-zinc-400"}`}>
                        {premium.isPremium ? "Premium" : "Free"}
                      </span>
                    </span>
                    <small className="text-xs text-zinc-500">Trading workspace</small>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-zinc-300"
                  aria-label="Close navigation"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="border-b border-white/8 px-4 py-4">
                {renderAccountSwitcher(true)}
              </div>

              {!premium.isPremium ? (
                <div className="border-b border-white/8 px-4 py-4">
                  <button
                    type="button"
                    onClick={openPricing}
                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-left text-sm font-black text-black"
                  >
                    Upgrade for AI, badge and auto sync
                  </button>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Workspace</p>
                <nav className="space-y-1.5">
                  {nav.map((item) => {
                    const { id, label, icon: Icon } = item;
                    const selected = active === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onChange(id);
                        }}
                        className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${
                          selected ? "bg-white/[.095] text-white ring-1 ring-white/10" : "text-zinc-400 hover:bg-white/[.04] hover:text-white"
                        }`}
                      >
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? "bg-white/[.10] text-white" : "bg-white/[.035] text-zinc-500"}`}>
                          <Icon size={17} />
                        </span>
                        <span className="block min-w-0 truncate">{label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-white/8 p-3">
                <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2.5 text-left">
                  <TraderAvatar name={name} value={avatar} className="size-10 text-xs" />
                  <button onClick={openProfile} className="min-w-0 flex-1 text-left">
                    <strong className="block truncate text-sm text-white">{name}</strong>
                    <small className="block truncate text-[11px] text-zinc-500">{handle}</small>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="grid size-8 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/[.05] hover:text-white">
                        <MoreHorizontal size={15} />
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
      )}
    </>
  );
}
