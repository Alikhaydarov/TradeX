"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Globe,
  History,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MoreHorizontal,
  Search,
  Settings2,
  SquareChartGantt,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { pathFromSection } from "./section-config";
import { useActiveAccountStore } from "./active-account-context";
import { useAuth } from "./auth-context";
import { TraderAvatar } from "./trader-avatar";
import type { PropAccount, Section } from "./types";
import { usePremiumStatus } from "./use-premium-status";
import { useWorkspacePreferences } from "./workspace-preferences-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";

type NavItem = {
  id: Section;
  label: string;
  icon: typeof Home;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-1.5 pb-1 pt-3 text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-700">
      {children}
    </p>
  );
}

function TradoxBrand({ mobile = false }: { mobile?: boolean }) {
  const size = mobile ? 40 : 36;
  return (
    <span
      className={`${mobile ? "size-10" : "size-9"} relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#171717] shadow-[0_10px_24px_rgba(0,0,0,.32)]`}
    >
      <Image
        src="/tradox-logo.webp"
        alt="Tradox"
        width={size}
        height={size}
        sizes={`${size}px`}
        className="size-full object-cover"
        priority
      />
    </span>
  );
}

export function Sidebar({
  active,
  onChange,
  onLogin,
  user,
  hideMobile = false,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onLogin: () => void;
  user: User | null;
  hideMobile?: boolean;
}) {
  const { accounts, activeAccountId, setActiveAccount } = useActiveAccountStore();
  const { signOut } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const { status: premium } = usePremiumStatus(Boolean(user));
  const { hidePersonalInfo, maskValue, setSettingsOpen } = useWorkspacePreferences();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [hasCommunityAccess, setHasCommunityAccess] = useState(false);
  const [profile, setProfile] = useState({ username: "", avatar: "", fullName: "" });

  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? null;
  const profileUsername = profile.username || usernameFromUser(user);
  const name = String(
    profile.fullName ||
      user?.user_metadata.full_name ||
      user?.user_metadata.name ||
      "Mehmon trader",
  );
  const avatar =
    profile.avatar ||
    (typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null);
  const handle = user ? `@${profileUsername}` : "Sign in with Google";
  const visibleName = hidePersonalInfo ? maskValue(name) : name;
  const visibleHandle = hidePersonalInfo ? maskValue(handle) : handle;
  const activeBalance = activeAccount ? money.format(activeAccount.accountSize) : "$0";
  const planLabel =
    premium.plan === "pro" ? "Pro" : premium.plan === "standard" ? "Standard" : "Free";

  const filteredAccounts = useMemo(() => {
    const query = accountQuery.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) =>
      `${account.name} ${account.firm} ${account.phase} ${account.marketType}`
        .toLowerCase()
        .includes(query),
    );
  }, [accountQuery, accounts]);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener("tradox:open-mobile-menu", open);
    return () => window.removeEventListener("tradox:open-mobile-menu", open);
  }, []);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    void apiRequest<{
      profile: {
        username?: string | null;
        avatar_url?: string | null;
        full_name?: string | null;
      };
    }>("/api/profile")
      .then(({ profile: next }) => {
        if (!mounted) return;
        setProfile({
          username: next.username || "",
          avatar: next.avatar_url || "",
          fullName: next.full_name || "",
        });
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = () => {
      void apiRequest<{ community: unknown | null }>("/api/community")
        .then(({ community }) => {
          if (mounted) setHasCommunityAccess(Boolean(community));
        })
        .catch(() => {
          if (mounted) setHasCommunityAccess(false);
        });
    };
    load();
    window.addEventListener("tradox:community-membership-changed", load);
    return () => {
      mounted = false;
      window.removeEventListener("tradox:community-membership-changed", load);
    };
  }, [user]);

  const primaryNav: NavItem[] = [
    { id: "feed", label: t("home"), icon: Home },
    { id: "account", label: t("profile"), icon: UserRound },
  ];
  const workspaceNav: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "trades", label: "Trades", icon: SquareChartGantt },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "backtest", label: "Backtest", icon: History },
  ];
  const communityNav: NavItem[] =
    premium.plan === "pro" || hasCommunityAccess
      ? [{ id: "community", label: "Community", icon: UsersRound }]
      : [];

  const closeMobile = () => setMobileOpen(false);
  const navigate = (section: Section, mobile = false) => {
    if (mobile) closeMobile();
    onChange(section);
  };

  const renderNav = (item: NavItem, mobile = false) => {
    const Icon = item.icon;
    const selected = active === item.id;
    return (
      <Link
        key={item.id}
        href={pathFromSection(item.id)}
        prefetch
        onClick={() => {
          if (mobile) closeMobile();
        }}
        className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
          mobile ? "min-h-11" : ""
        } ${
          selected
            ? "bg-[#111111] text-white ring-1 ring-white/10"
            : "text-zinc-400 hover:bg-[#080808] hover:text-white"
        }`}
        aria-current={selected ? "page" : undefined}
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-lg transition-colors ${
            selected
              ? "bg-[#1a1a1a] text-white"
              : "bg-[#050505] text-zinc-500 group-hover:bg-[#0f0f0f] group-hover:text-zinc-300"
          }`}
        >
          <Icon size={15} strokeWidth={selected ? 2.3 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.label}</span>
      </Link>
    );
  };

  const selectAccount = (id: string) => {
    setActiveAccount(id);
    setAccountOpen(false);
    setAccountQuery("");
  };

  const accountSwitcher = (mobile = false) => (
    <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
      <div
        className={`${
          mobile
            ? "flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-[#030303] p-3"
            : "mt-4 flex w-full items-center gap-2 rounded-[0.95rem] border border-white/8 bg-[#030303] p-2 transition hover:bg-[#070707]"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate("accounts", mobile)}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className={`size-2 shrink-0 rounded-full ${activeAccount ? "bg-emerald-500" : "bg-zinc-500"}`} />
          <span className="min-w-0 flex-1">
            <strong className={`${mobile ? "text-sm" : "text-xs"} block truncate text-white`}>
              {activeAccount?.name || "Accounts"}
            </strong>
            <small className={`${mobile ? "text-xs" : "text-[11px]"} block truncate text-zinc-500`}>
              {activeAccount ? activeBalance : "Select trading account"}
            </small>
          </span>
        </button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${mobile ? "size-9" : "size-8"} grid shrink-0 place-items-center rounded-xl border border-white/8 bg-[#090909] text-zinc-400 transition hover:bg-[#111111] hover:text-white`}
            aria-label="Open account switcher"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${accountOpen ? "rotate-180" : ""}`}
            />
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
            onClick={() => navigate("accounts", mobile)}
            className="w-full rounded-xl px-2 py-1.5 text-left text-sm font-black text-white transition hover:bg-[#111111]"
          >
            All Accounts
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-zinc-500">
          <Search size={16} />
          <input
            value={accountQuery}
            onChange={(event) => setAccountQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search account"
            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="max-h-[250px] overflow-y-auto p-2">
          {filteredAccounts.length ? (
            filteredAccounts.map((account) => {
              const selected = account.id === activeAccountId;
              return (
                <DropdownMenuItem
                  key={account.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    selectAccount(account.id);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 ${
                    selected ? "bg-[#101010] text-white" : "text-zinc-300"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-black ${
                      selected ? "bg-white text-black" : "bg-[#141414] text-white"
                    }`}
                  >
                    {initials(account)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{account.name}</strong>
                    <small className="block truncate text-[11px] text-zinc-500">
                      {account.phase} / {account.marketType}
                    </small>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {money.format(account.accountSize)}
                  </span>
                </DropdownMenuItem>
              );
            })
          ) : (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">No accounts found.</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const profileCard = (mobile = false) => (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition-colors hover:bg-[#121212]">
      <TraderAvatar name={name} value={avatar} className={`${mobile ? "size-10" : "size-9"} text-xs`} />
      <button
        type="button"
        onClick={() => {
          if (!user) onLogin();
          else navigate("account", mobile);
        }}
        className="min-h-10 min-w-0 flex-1 text-left"
      >
        <strong className={`${mobile ? "text-sm" : "text-xs"} block truncate text-white`}>
          {visibleName}
        </strong>
        <small className="block truncate text-[10px] text-zinc-500">{visibleHandle}</small>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-xl text-zinc-400 transition hover:bg-[#111111] hover:text-white"
            aria-label="Open profile menu"
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#090909]">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="px-3 py-2.5">
            <Settings2 size={14} className="mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("pricing", mobile)} className="px-3 py-2.5">
            {premium.isPremium ? "Manage subscription" : "View plans"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLocale("en")}
            className="flex items-center justify-between px-3 py-2.5"
          >
            <span className="flex items-center gap-2"><Globe size={14} /> English</span>
            {locale === "en" ? <span className="text-[10px] font-bold text-zinc-400">Active</span> : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLocale("es")}
            className="flex items-center justify-between px-3 py-2.5"
          >
            <span className="pl-6">Spanish</span>
            {locale === "es" ? <span className="text-[10px] font-bold text-zinc-400">Active</span> : null}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("pricing", mobile)} className="px-3 py-2.5">
            <CircleHelp size={14} className="mr-2" /> Help Center
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLogoutOpen(true)}
            className="px-3 py-2.5 text-rose-300 focus:text-rose-200"
          >
            <LogOut size={14} className="mr-2" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!user ? <LogIn size={16} className="text-zinc-500" /> : null}
    </div>
  );

  const navigation = (mobile = false) => (
    <>
      {accountSwitcher(mobile)}
      <div className={`${mobile ? "flex-1 overflow-y-auto px-2 py-3" : "mt-3"}`}>
        <nav className="space-y-1">{primaryNav.map((item) => renderNav(item, mobile))}</nav>
        <GroupLabel>Workspace</GroupLabel>
        <nav className="space-y-1">{workspaceNav.map((item) => renderNav(item, mobile))}</nav>
        {communityNav.length ? (
          <>
            <GroupLabel>Community</GroupLabel>
            <nav className="space-y-1">{communityNav.map((item) => renderNav(item, mobile))}</nav>
          </>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[238px] shrink-0 flex-col border-r border-white/10 bg-black p-[0.85rem] lg:flex">
        <Link
          href={pathFromSection("feed")}
          prefetch
          className="flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-[#080808]"
          aria-label="Tradox home"
        >
          <TradoxBrand />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <strong className="block truncate text-[13px] tracking-tight">Tradox</strong>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  premium.isPremium ? "bg-[#0b1c12] text-emerald-300" : "bg-[#0a0a0a] text-zinc-400"
                }`}
              >
                {planLabel}
              </span>
            </span>
            <small className="text-[10px] text-zinc-500">Trading workspace</small>
          </span>
        </Link>
        {navigation()}
        <div className="mt-auto">{profileCard()}</div>
      </aside>

      {!hideMobile ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[82vw] max-w-[312px] border-r border-white/10 bg-black p-0 lg:hidden"
          >
            <SheetTitle className="sr-only">Tradox navigation</SheetTitle>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
                <Link
                  href={pathFromSection("feed")}
                  prefetch
                  onClick={closeMobile}
                  className="flex min-w-0 items-center gap-3"
                >
                  <TradoxBrand mobile />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <strong className="block truncate text-base leading-tight text-white">Tradox</strong>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          premium.isPremium ? "bg-[#0b1c12] text-emerald-300" : "bg-[#0a0a0a] text-zinc-400"
                        }`}
                      >
                        {planLabel}
                      </span>
                    </span>
                    <small className="text-xs text-zinc-500">Trading workspace</small>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#0a0a0a] text-zinc-300"
                  aria-label="Close navigation"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="border-b border-white/8 px-3.5 py-3.5">{accountSwitcher(true)}</div>
              <div className="flex min-h-0 flex-1 flex-col">{navigation(true)}</div>
              <div className="border-t border-white/8 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {profileCard(true)}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Tradox?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your trading workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void signOut();
                setLogoutOpen(false);
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
