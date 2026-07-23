"use client";

import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import {
  CircleHelp,
  CalendarDays,
  ChevronDown,
  Globe,
  Home,
  LayoutDashboard,
  LogIn,
  MoreHorizontal,
  Settings2,
  Search,
  SquareChartGantt,
  TrendingUp,
  UsersRound,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "./auth-context";
import { useActiveAccountStore } from "./active-account-context";
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
import { Dialog, DialogContent } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TraderAvatar } from "./trader-avatar";
import type { PropAccount, Section } from "./types";

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

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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
      className={`${mobile ? "size-10" : "h-9 w-9"} relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#171717] shadow-[0_10px_24px_rgba(0,0,0,.32)]`}
    >
      <Image
        src="/tradox-logo.webp"
        alt="Tradox"
        width={size}
        height={size}
        sizes={`${size}px`}
        className="h-full w-full object-cover"
        priority
      />
    </span>
  );
}

function ProfileLoadingCard({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading profile"
      className={`${mobile ? "h-[62px] p-2.5" : "h-[54px] p-2"} grid w-full place-items-center rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[inset_0_1px_0_rgba(255,255,255,.035)]`}
    >
      <span className="size-5 animate-spin rounded-full border-2 border-white/15 border-t-white" />
      <span className="sr-only">Loading profile</span>
    </div>
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
  const [profileUsername, setProfileUsername] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileLoading, setProfileLoading] = useState(Boolean(user));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [hasCommunityAccess, setHasCommunityAccess] = useState(false);
  const { t, locale, setLocale } = useLanguage();
  const { status: premium } = usePremiumStatus(Boolean(user));
  const { signOut } = useAuth();
  const { hidePersonalInfo, maskValue, setSettingsOpen } =
    useWorkspacePreferences();
  const name = String(
    profileFullName ||
      user?.user_metadata.full_name ||
      user?.user_metadata.name ||
      "Mehmon trader",
  );
  const username = usernameFromUser(user);
  const handle = user
    ? `@${profileUsername || username}`
    : "Sign in with Google";
  const avatar =
    profileAvatar ||
    (typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null);
  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) || null;
  const activeBalance = activeAccount
    ? money.format(activeAccount.accountSize)
    : "$0";
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
    if (!user?.id) {
      setProfileUsername("");
      setProfileAvatar("");
      setProfileFullName("");
      setProfileLoading(false);
      return;
    }

    let mounted = true;
    setProfileLoading(true);

    apiRequest<{
      profile: {
        username?: string | null;
        is_verified?: boolean | null;
        avatar_url?: string | null;
        full_name?: string | null;
      };
    }>("/api/profile")
      .then(({ profile }) => {
        if (!mounted) return;
        setProfileUsername(profile.username || "");
        setProfileAvatar(profile.avatar_url || "");
        setProfileFullName(profile.full_name || "");
      })
      .catch(() => {
        if (!mounted) return;
        setProfileUsername("");
        setProfileAvatar("");
        setProfileFullName("");
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const open = () => setMobileMenuOpen(true);
    window.addEventListener("tradox:open-mobile-menu", open);
    return () => window.removeEventListener("tradox:open-mobile-menu", open);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadAccess = () => {
      apiRequest<{ community: unknown | null }>("/api/community")
        .then((data) => {
          if (active) setHasCommunityAccess(Boolean(data.community));
        })
        .catch(() => {
          if (active) setHasCommunityAccess(false);
        });
    };
    loadAccess();
    window.addEventListener("tradox:community-membership-changed", loadAccess);
    return () => {
      active = false;
      window.removeEventListener(
        "tradox:community-membership-changed",
        loadAccess,
      );
    };
  }, [user]);

  const primaryNav = [
    { id: "feed" as const, label: t("home"), icon: Home },
    { id: "account" as const, label: t("profile"), icon: UserRound },
  ];
  const journalingNav = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
    { id: "trades" as const, label: "Trades", icon: SquareChartGantt },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUp },
  ];
  const communityNav =
    premium.plan === "pro" || hasCommunityAccess
      ? [{ id: "community" as const, label: "Community", icon: UsersRound }]
      : [];
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

  const openSettings = () => {
    setMobileMenuOpen(false);
    setSettingsOpen(true);
  };

  const openHelpCenter = () => {
    window.open("/pricing", "_blank", "noopener,noreferrer");
  };

  const renderNavButton = (
    item: { id: Section; label: string; icon: typeof Home },
    mobile = false,
  ) => {
    const { id, label, icon: Icon } = item;
    const selected = active === id;
    return (
      <button
        key={id}
        onClick={() => {
          if (mobile) setMobileMenuOpen(false);
          onChange(id);
        }}
        className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
          selected
            ? "bg-[#111111] text-white ring-1 ring-white/10"
            : "text-zinc-400 hover:bg-[#080808] hover:text-white"
        }`}
      >
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${selected ? "bg-[#1a1a1a] text-white" : "bg-[#050505] text-zinc-500 group-hover:bg-[#0f0f0f] group-hover:text-zinc-300"}`}
        >
          <Icon size={15} strokeWidth={selected ? 2.3 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {label}
        </span>
      </button>
    );
  };

  const renderAccountSwitcher = (mobile = false) => (
    <DropdownMenu
      open={accountSwitcherOpen}
      onOpenChange={setAccountSwitcherOpen}
    >
      <div
        className={`${mobile ? "flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-[#030303] p-3" : "mt-4 flex w-full items-center gap-2 rounded-[0.95rem] border border-white/8 bg-[#030303] p-2 transition hover:bg-[#070707]"}`}
      >
        <button
          type="button"
          onClick={openAccountsPage}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={`size-2 shrink-0 rounded-full ${activeAccount ? "bg-emerald-500" : "bg-zinc-500"}`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`${mobile ? "text-sm" : "text-[12px]"} truncate font-bold text-white`}
            >
              {activeAccount?.name || "Accounts"}
            </p>
            <p
              className={`${mobile ? "text-xs" : "text-[11px]"} truncate text-zinc-500`}
            >
              {activeAccount ? activeBalance : "Select trading account"}
            </p>
          </div>
        </button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${mobile ? "size-9" : "size-8"} grid shrink-0 place-items-center rounded-xl border border-white/8 bg-[#090909] text-zinc-400 transition hover:bg-[#111111] hover:text-white`}
            aria-label="Open account switcher"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${accountSwitcherOpen ? "rotate-180" : ""}`}
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
            onClick={openAccountsPage}
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
            onClick={(event) => event.stopPropagation()}
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
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 ${selected ? "bg-[#101010] text-white" : "text-zinc-300"}`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-black ${selected ? "bg-white text-black" : "bg-[#141414] text-white"}`}
                  >
                    {initials(account)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{account.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {account.phase} / {account.marketType}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {money.format(account.accountSize)}
                  </span>
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              No accounts found.
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <aside className="fixed left-[max(1rem,calc((100vw-1860px)/2+1rem))] top-3 z-40 hidden h-[calc(100dvh-1.5rem)] w-[238px] shrink-0 flex-col rounded-[1rem] border border-white/8 bg-[#000000] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] lg:flex">
        <button
          onClick={() => onChange("feed")}
          className="flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-[#080808]"
          aria-label="Tradox home"
        >
          <TradoxBrand />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <strong className="block truncate text-[13px] tracking-tight">
                Tradox
              </strong>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${premium.isPremium ? "bg-[#0b1c12] text-emerald-300" : "bg-[#0a0a0a] text-zinc-400"}`}
              >
                {planLabel}
              </span>
            </span>
            <small className="text-[10px] text-zinc-500">
              Trading workspace
            </small>
          </span>
        </button>

        {renderAccountSwitcher()}

        <div className="mt-3">
          <nav className="space-y-1">
            {primaryNav.map((item) => renderNavButton(item))}
          </nav>

          <GroupLabel>Workspace</GroupLabel>
          <nav className="space-y-1">
            {journalingNav.map((item) => renderNavButton(item))}
          </nav>
          {communityNav.length ? (
            <>
              <GroupLabel>Community</GroupLabel>
              <nav className="space-y-1">
                {communityNav.map((item) => renderNavButton(item))}
              </nav>
            </>
          ) : null}
        </div>

        <div className="mt-auto">
          {profileLoading ? (
            <ProfileLoadingCard />
          ) : (
            <div className="flex h-[54px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition-colors hover:bg-[#121212]">
              <TraderAvatar
                name={name}
                value={avatar}
                className="h-9 w-9 text-xs"
              />
              <button onClick={openProfile} className="min-w-0 flex-1 text-left">
                <span className="flex min-w-0 items-center gap-1">
                  <strong className="truncate text-xs">{visibleName}</strong>
                </span>
                <small className="block truncate text-[10px] text-zinc-500">
                  {visibleHandle}
                </small>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-xl text-zinc-400 transition hover:bg-[#111111] hover:text-white"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 border-white/10 bg-[#090909]"
                >
                  <DropdownMenuItem
                    onClick={openSettings}
                    className="px-3 py-2.5"
                  >
                    <Settings2 size={14} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openPricing} className="px-3 py-2.5">
                    {premium.isPremium ? "Manage subscription" : "View plans"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocale("en")}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={14} /> English
                    </span>
                    {locale === "en" ? (
                      <span className="text-[10px] font-bold text-zinc-400">
                        Active
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocale("es")}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 pl-6">Spanish</span>
                    {locale === "es" ? (
                      <span className="text-[10px] font-bold text-zinc-400">
                        Active
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openHelpCenter}
                    className="px-3 py-2.5"
                  >
                    <CircleHelp size={14} className="mr-2" />
                    Help Center
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLogoutConfirmOpen(true)}
                    className="px-3 py-2.5 text-rose-300 focus:text-rose-200"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {!user ? <LogIn size={16} className="text-zinc-500" /> : null}
            </div>
          )}
        </div>
      </aside>

      {!hideMobile && (
        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent
            showCloseButton={false}
            className="left-0 top-0 h-[100dvh] w-[76vw] max-w-[312px] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-black p-0 sm:max-w-[312px] lg:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onChange("feed");
                  }}
                  className="flex min-w-0 items-center gap-3 rounded-xl text-left"
                  aria-label="Tradox home"
                >
                  <TradoxBrand mobile />
                  <div className="min-w-0">
                    <span className="flex items-center gap-2">
                      <strong className="block truncate text-base leading-tight text-white">
                        Tradox
                      </strong>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${premium.isPremium ? "bg-[#0b1c12] text-emerald-300" : "bg-[#0a0a0a] text-zinc-400"}`}
                      >
                        {planLabel}
                      </span>
                    </span>
                    <small className="text-xs text-zinc-500">
                      Trading workspace
                    </small>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-[#0a0a0a] text-zinc-300"
                  aria-label="Close navigation"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="border-b border-white/8 px-3.5 py-3.5">
                {renderAccountSwitcher(true)}
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-3">
                <nav className="space-y-1">
                  {primaryNav.map((item) => renderNavButton(item, true))}
                </nav>

                <GroupLabel>Workspace</GroupLabel>
                <nav className="space-y-1">
                  {journalingNav.map((item) => renderNavButton(item, true))}
                </nav>
                {communityNav.length ? (
                  <>
                    <GroupLabel>Community</GroupLabel>
                    <nav className="space-y-1">
                      {communityNav.map((item) => renderNavButton(item, true))}
                    </nav>
                  </>
                ) : null}
              </div>

              <div className="border-t border-white/8 p-3">
                {profileLoading ? (
                  <ProfileLoadingCard mobile />
                ) : (
                  <div className="flex h-[62px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2.5 text-left">
                    <TraderAvatar
                      name={name}
                      value={avatar}
                      className="size-10 text-xs"
                    />
                    <button
                      onClick={openProfile}
                      className="min-w-0 flex-1 text-left"
                    >
                      <strong className="block truncate text-sm text-white">
                        {visibleName}
                      </strong>
                      <small className="block truncate text-[11px] text-zinc-500">
                        {visibleHandle}
                      </small>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-xl text-zinc-400 transition hover:bg-[#111111] hover:text-white"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 border-white/10 bg-[#090909]"
                      >
                        <DropdownMenuItem
                          onClick={openSettings}
                          className="px-3 py-2.5"
                        >
                          <Settings2 size={14} className="mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setLocale("en")}
                          className="flex items-center justify-between px-3 py-2.5"
                        >
                          <span className="flex items-center gap-2">
                            <Globe size={14} /> English
                          </span>
                          {locale === "en" ? (
                            <span className="text-[10px] font-bold text-zinc-400">
                              Active
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setLocale("es")}
                          className="flex items-center justify-between px-3 py-2.5"
                        >
                          <span className="flex items-center gap-2 pl-6">
                            Spanish
                          </span>
                          {locale === "es" ? (
                            <span className="text-[10px] font-bold text-zinc-400">
                              Active
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={openHelpCenter}
                          className="px-3 py-2.5"
                        >
                          <CircleHelp size={14} className="mr-2" />
                          Help Center
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setLogoutConfirmOpen(true)}
                          className="px-3 py-2.5 text-rose-300 focus:text-rose-200"
                        >
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {!user ? <LogIn size={16} className="text-zinc-500" /> : null}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="border-white/10 bg-[#050505]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Confirm logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              You&apos;ll be signed out from this browser session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-black text-white hover:bg-[#111111]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-white text-black hover:bg-zinc-200"
              onClick={() => {
                void signOut();
                setMobileMenuOpen(false);
                setLogoutConfirmOpen(false);
              }}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
