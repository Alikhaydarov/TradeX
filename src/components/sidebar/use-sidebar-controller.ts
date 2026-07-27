"use client";

import type { User } from "@supabase/supabase-js";
import {
  CalendarDays,
  Home,
  LayoutDashboard,
  SquareChartGantt,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useLanguage } from "@/lib/i18n";
import { useActiveAccountStore } from "../active-account-context";
import { useAuth } from "../auth-context";
import type { Section } from "../types";
import { usePremiumStatus } from "../use-premium-status";
import { useWorkspacePreferences } from "../workspace-preferences-context";

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

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function useSidebarController({
  active,
  onChange,
  onLogin,
  user,
}: {
  active: Section;
  onChange: (section: Section) => void;
  onLogin: () => void;
  user: User | null;
}) {
  const { accounts, activeAccountId, setActiveAccount } =
    useActiveAccountStore();
  const [profileUsername, setProfileUsername] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
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
    if (!user) return;

    let mounted = true;
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
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const open = () => setMobileMenuOpen(true);
    window.addEventListener("tradox:open-mobile-menu", open);
    return () => window.removeEventListener("tradox:open-mobile-menu", open);
  }, []);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const loadAccess = () => {
      apiRequest<{ community: unknown | null }>("/api/community")
        .then((data) => {
          if (mounted) setHasCommunityAccess(Boolean(data.community));
        })
        .catch(() => {
          if (mounted) setHasCommunityAccess(false);
        });
    };
    loadAccess();
    window.addEventListener("tradox:community-membership-changed", loadAccess);
    return () => {
      mounted = false;
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

  const goHome = (mobile = false) => {
    if (mobile) setMobileMenuOpen(false);
    onChange("feed");
  };

  const navigate = (section: Section, mobile = false) => {
    if (mobile) setMobileMenuOpen(false);
    onChange(section);
  };

  const confirmLogout = () => {
    void signOut();
    setMobileMenuOpen(false);
    setLogoutConfirmOpen(false);
  };

  return {
    active,
    user,
    accounts,
    activeAccountId,
    activeAccount,
    activeBalance,
    filteredAccounts,
    accountQuery,
    setAccountQuery,
    accountSwitcherOpen,
    setAccountSwitcherOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    logoutConfirmOpen,
    setLogoutConfirmOpen,
    name,
    avatar,
    visibleName,
    visibleHandle,
    planLabel,
    premium,
    locale,
    setLocale,
    primaryNav,
    journalingNav,
    communityNav,
    openAccountsPage,
    selectAccount,
    openProfile,
    openPricing,
    openSettings,
    openHelpCenter,
    goHome,
    navigate,
    confirmLogout,
  };
}

export type SidebarController = ReturnType<typeof useSidebarController>;
