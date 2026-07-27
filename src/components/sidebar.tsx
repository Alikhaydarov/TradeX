"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  ChevronDown,
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "./ui/sheet";

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

  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30) || "profile"
  );
}

function initials(account: PropAccount | null) {
  if (!account) return "A";
  return (account.name || account.firm || "A").trim().slice(0, 2).toUpperCase();
}

function Brand({ mobile = false }: { mobile?: boolean }) {
  const size = mobile ? 40 : 36;
  return (
    <span
      className={`${mobile ? "size-10" : "size-9"} relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#171717]`}
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

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-2 pb-1 pt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
      {children}
    </p>
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
  const { accounts, activeAccountId, setActiveAccount } =
    useActiveAccountStore();
  const { signOut } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const { status: premium } = usePremiumStatus(Boolean(user));
  const { hidePersonalInfo, maskValue, setSettingsOpen } =
    useWorkspacePreferences();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [hasCommunityAccess, setHasCommunityAccess] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    avatar: "",
    fullName: "",
  });

  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) ?? null;
  const profileUsername = profile.username || usernameFromUser(user);
  const name = String(
    profile.fullName ||
      user?.user_metadata.full_name ||
      user?.user_metadata.name ||
      "Mehmon trader",
  );
  const avatar =
    profile.avatar ||
    (typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null);
  const handle = user ? `@${profileUsername}` : "Sign in with Google";
  const visibleName = hidePersonalInfo ? maskValue(name) : name;
  const visibleHandle = hidePersonalInfo ? maskValue(handle) : handle;
  const planLabel =
    premium.plan === "pro"
      ? "Pro"
      : premium.plan === "standard"
        ? "Standard"
        : "Free";

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
    apiRequest<{
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
        className={`group flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
          selected
            ? "bg-[#111111] text-white ring-1 ring-white/10"
            : "text-zinc-400 hover:bg-[#080808] hover:text-white"
        }`}
        aria-current={selected ? "page" : undefined}
      >
        <span
          className={`grid size-7 place-items-center rounded-lg transition-colors ${
            selected
              ? "bg-[#1a1a1a] text-white"
              : "bg-[#050505] text-zinc-500 group-hover:bg-[#0f0f0f] group-hover:text-zinc-300"
          }`}
        >
          <Icon size={15} strokeWidth={selected ? 2.3 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {item.label}
        </span>
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
        className={`${mobile ? "mt-2" : "mt-4"} flex items-center gap-2 rounded-2xl border border-white/10 bg-[#050505] p-2.5`}
      >
        <button
          type="button"
          onClick={() => {
            onChange("accounts");
            closeMobile();
          }}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#151515] text-[10px] font-black text-white">
            {initials(activeAccount)}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs text-white">
              {activeAccount?.name || "Accounts"}
            </strong>
            <small className="block truncate text-[10px] text-zinc-500">
              {activeAccount
                ? money.format(activeAccount.accountSize)
                : "Select trading account"}
            </small>
          </span>
        </button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-[#0a0a0a] text-zinc-400 transition hover:text-white"
            aria-label="Open account switcher"
          >
            <ChevronDown
              size={14}
              className={accountOpen ? "rotate-180 transition" : "transition"}
            />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        side={mobile ? "bottom" : "right"}
        align="start"
        sideOffset={10}
        className="w-[min(320px,calc(100vw-2rem))] rounded-2xl border-white/10 bg-[#080808] p-0"
      >
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-zinc-500">
          <Search size={15} />
          <input
            value={accountQuery}
            onChange={(event) => setAccountQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search account"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto p-2">
          {filteredAccounts.length ? (
            filteredAccounts.map((account) => (
              <DropdownMenuItem
                key={account.id}
                onSelect={(event) => {
                  event.preventDefault();
                  selectAccount(account.id);
                }}
                className={`cursor-pointer rounded-xl px-3 py-3 ${
                  account.id === activeAccountId
                    ? "bg-[#141414] text-white"
                    : "text-zinc-300"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {account.name}
                  </strong>
                  <small className="block truncate text-[10px] text-zinc-500">
                    {account.phase} · {account.marketType}
                  </small>
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {money.format(account.accountSize)}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              No accounts found.
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const profileCard = (mobile = false) => (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2.5">
      <TraderAvatar name={name} value={avatar} className="size-9 text-xs" />
      <button
        type="button"
        onClick={() => {
          if (!user) onLogin();
          else onChange("account");
          if (mobile) closeMobile();
        }}
        className="min-h-11 min-w-0 flex-1 text-left"
      >
        <strong className="block truncate text-xs text-white">
          {visibleName}
        </strong>
        <small className="block truncate text-[10px] text-zinc-500">
          {visibleHandle}
        </small>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl text-zinc-400 transition hover:bg-[#151515] hover:text-white"
            aria-label="Open profile menu"
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#090909]">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings2 size={14} className="mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange("pricing")}>
            {premium.isPremium ? "Manage subscription" : "View plans"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocale(locale === "en" ? "es" : "en")}>
            <Globe size={14} className="mr-2" />
            {locale === "en" ? "Español" : "English"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLogoutOpen(true)}
            className="text-rose-300 focus:text-rose-200"
          >
            <LogOut size={14} className="mr-2" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!user ? <LogIn size={15} className="text-zinc-500" /> : null}
    </div>
  );

  const navigation = (mobile = false) => (
    <>
      {accountSwitcher(mobile)}
      <div className="mt-3 flex-1 overflow-y-auto">
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
      <aside className="fixed left-[max(1rem,calc((100vw-1860px)/2+1rem))] top-3 z-40 hidden h-[calc(100dvh-1.5rem)] w-[238px] shrink-0 flex-col rounded-2xl border border-white/8 bg-black p-3 lg:flex">
        <Link
          href={pathFromSection("feed")}
          prefetch
          className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[#080808]"
          aria-label="Tradox home"
        >
          <Brand />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <strong className="truncate text-[13px] text-white">Tradox</strong>
              <span className="rounded-full bg-[#101010] px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                {planLabel}
              </span>
            </span>
            <small className="block text-[10px] text-zinc-500">
              Trading workspace
            </small>
          </span>
        </Link>
        {navigation()}
        <div className="mt-auto pt-3">{profileCard()}</div>
      </aside>

      {!hideMobile ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[82vw] max-w-[320px] p-0 lg:hidden"
          >
            <SheetTitle className="sr-only">Tradox navigation</SheetTitle>
            <div className="flex min-h-0 flex-1 flex-col p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between border-b border-white/8 px-1 pb-3">
                <Link
                  href={pathFromSection("feed")}
                  prefetch
                  onClick={closeMobile}
                  className="flex min-h-11 items-center gap-3"
                >
                  <Brand mobile />
                  <span>
                    <strong className="block text-sm text-white">Tradox</strong>
                    <small className="text-[10px] text-zinc-500">{planLabel} workspace</small>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#0a0a0a] text-zinc-400"
                  aria-label="Close navigation"
                >
                  <X size={17} />
                </button>
              </div>
              {navigation(true)}
              <div className="pt-3">{profileCard(true)}</div>
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
