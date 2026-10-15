"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDownUp,
  BadgeCheck,
  ArrowRight,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  Check,
  Home,
  Command,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import {
  Money,
  PnlModeMenu,
  PnlPreferences,
  type PnlMode,
} from "./pnl-preferences";

const primaryItems = [
  ["Home", "/home", Home],
  ["Profile", "/profile", UserRound],
] as const;
const journalItems = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Calendar", "/calendar", CalendarDays],
  ["Trades", "/trades", ArrowDownUp],
  ["Analytics", "/analytics", ChartNoAxesCombined],
] as const;
const workspaceItems = [
  ["AI Coach", "/coach", Bot],
  ["Evaluations", "/evaluations", Target],
  ["Risk overview", "/risk", ShieldCheck],
] as const;
const destinations = [
  ...primaryItems,
  ...journalItems,
  ...workspaceItems,
  ["Accounts", "/accounts", WalletCards],
  ["Profile settings", "/settings/profile", Settings],
] as const;
export type WorkspaceUser = {
  name: string;
  email: string;
  initials: string;
  username?: string | undefined;
  avatarUrl?: string | null | undefined;
};
const UserContext = createContext<WorkspaceUser | undefined>(undefined);
export const useWorkspaceUser = () => useContext(UserContext);
export type TradingAccount = {
  id: string;
  name: string;
  initial_balance: number;
};
type SearchProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
};

export function AppShell({
  children,
  user,
  initialSelectedAccountId,
  initialAccounts,
  initialPnlMode = "money",
}: {
  children: React.ReactNode;
  user?: WorkspaceUser | undefined;
  initialSelectedAccountId?: string | null;
  initialAccounts?: TradingAccount[];
  initialPnlMode?: PnlMode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchDialog = useRef<HTMLDialogElement>(null);
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const navigationTrigger = useRef<HTMLButtonElement>(null);
  const [accountQuery, setAccountQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<SearchProfile[]>([]);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  useEffect(() => {
    setPeople([]);
    if (query.trim().length < 2) {
      setSearchState("idle");
      return;
    }
    const controller = new AbortController();
    setSearchState("loading");
    const timer = window.setTimeout(() => {
      fetch("/api/search?q=" + encodeURIComponent(query.trim()), {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Search unavailable");
          return response.json();
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setPeople(data.profiles ?? []);
          setSearchState("done");
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchState("error");
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const [accounts, setAccounts] = useState<TradingAccount[]>(
    initialAccounts ?? [],
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialSelectedAccountId ?? "all",
  );
  useEffect(() => {
    if (initialAccounts !== undefined) {
      setAccounts(initialAccounts);
      return;
    }
    const controller = new AbortController();
    fetch("/api/account-switcher", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setAccounts(data.accounts ?? []);
        setSelectedAccountId(data.selectedAccountId ?? "all");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialAccounts]);
  useEffect(() => {
    setSelectedAccountId(initialSelectedAccountId ?? "all");
  }, [initialSelectedAccountId]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchDialog.current?.showModal();
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    const trigger = navigationTrigger.current;
    document.body.style.overflow = "hidden";
    // Focus after the drawer becomes visible and the page becomes inert.
    const frame = window.requestAnimationFrame(() => {
      sidebar.current
        ?.querySelector<HTMLButtonElement>(
          'button[aria-label="Close navigation"]',
        )
        ?.focus({ preventScroll: true });
    });
    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !sidebar.current) return;
      const controls = Array.from(
        sidebar.current.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), summary",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("keydown", containFocus);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = before;
      document.removeEventListener("keydown", containFocus);
      desktop.removeEventListener("change", closeOnDesktop);
      trigger?.focus();
    };
  }, [open]);
  function selectAccount(value: string) {
    setSelectedAccountId(value);
    setAccountQuery("");
    if (accountMenu.current) accountMenu.current.open = false;
    document.cookie =
      "tradoxy_account=" +
      (value === "all" ? "" : value) +
      "; Path=/; Max-Age=" +
      (value === "all" ? 0 : 31536000) +
      "; SameSite=Lax";
    router.refresh();
  }
  const account = accounts.find((item) => item.id === selectedAccountId);
  const pageTitle =
    pathname === "/community"
      ? "Home"
      : pathname.startsWith("/u/")
        ? "Profile"
        : destinations.find(
            ([, href]) => pathname === href || pathname.startsWith(href + "/"),
          )?.[0] || "Trader profile";
  const accountControl = (
    <select
      aria-label="Select trading account"
      value={selectedAccountId}
      onChange={(event) => selectAccount(event.target.value)}
      className="account-select"
    >
      <option value="all">All accounts</option>
      {accounts.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
  const navLinks = (
    items: typeof journalItems | typeof workspaceItems | typeof primaryItems,
  ) =>
    items.map(([label, href, Icon]) => {
      const active =
        pathname === href ||
        (href === "/home" && pathname === "/community") ||
        (href === "/profile" && pathname.startsWith("/u/"));
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active ? "page" : undefined}
          className={"workspace-nav-link" + (active ? " is-active" : "")}
        >
          <span className="workspace-nav-icon">
            <Icon size={16} strokeWidth={active ? 2.3 : 2} />
          </span>
          <span>{label}</span>
        </Link>
      );
    });
  return (
    <UserContext.Provider value={user}>
      <PnlPreferences
        initialMode={initialPnlMode}
        balance={
          account
            ? Number(account.initial_balance)
            : accounts.reduce(
                (sum, item) => sum + Number(item.initial_balance),
                0,
              )
        }
      >
        <div className="workspace-root">
          <a href="#workspace-content" className="skip-link">
            Skip to content
          </a>
          {open && (
            <button
              aria-label="Close navigation"
              className="workspace-scrim lg:hidden"
              onClick={() => setOpen(false)}
            />
          )}
          <aside
            ref={sidebar}
            className={"workspace-sidebar" + (open ? " is-open" : "")}
            role={open ? "dialog" : undefined}
            aria-modal={open ? true : undefined}
            aria-label="Workspace navigation"
          >
            <div className="workspace-brand">
              <Link href="/home" aria-label="Tradoxy home">
                <Brand subtitle />
              </Link>
              <button
                aria-label="Close navigation"
                className="icon-button lg:hidden"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="workspace-account">
              <Link
                href="/accounts"
                className="workspace-account-summary"
                title="Manage accounts"
                onClick={() => setOpen(false)}
              >
                <i className={account ? "has-account" : ""} />
                <span>
                  <strong>{account?.name || "All Accounts"}</strong>
                  <small>
                    {account ? (
                      <Money value={Number(account.initial_balance)} balance />
                    ) : (
                      `${accounts.length} trading accounts`
                    )}
                  </small>
                </span>
              </Link>
              <details
                ref={accountMenu}
                className="workspace-account-switcher"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") event.currentTarget.open = false;
                }}
              >
                <summary
                  aria-label="Open account switcher"
                  title="Switch account"
                >
                  <ChevronDown size={15} />
                </summary>
                <div className="account-switcher-menu">
                  <label>
                    <Search size={16} />
                    <input
                      aria-label="Search account"
                      placeholder="Search account"
                      value={accountQuery}
                      onChange={(event) => setAccountQuery(event.target.value)}
                    />
                  </label>
                  <button type="button" onClick={() => selectAccount("all")}>
                    <span>All accounts</span>
                    {selectedAccountId === "all" && <Check size={15} />}
                  </button>
                  {accounts
                    .filter((item) =>
                      item.name
                        .toLowerCase()
                        .includes(accountQuery.toLowerCase()),
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={item.id === selectedAccountId}
                        onClick={() => selectAccount(item.id)}
                      >
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            <Money
                              value={Number(item.initial_balance)}
                              balance
                            />
                          </small>
                        </span>
                        {item.id === selectedAccountId && <Check size={15} />}
                      </button>
                    ))}
                  {accountQuery &&
                    !accounts.some((item) =>
                      item.name
                        .toLowerCase()
                        .includes(accountQuery.toLowerCase()),
                    ) && <p>No accounts found.</p>}
                  <Link href="/accounts" onClick={() => setOpen(false)}>
                    <Settings size={14} />
                    Manage accounts
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </details>
            </div>
            <nav className="workspace-navigation">
              {navLinks(primaryItems)}
              <p>Workspace</p>
              {navLinks(journalItems)}
              <details
                className="workspace-tools"
                open={
                  workspaceItems.some(([, href]) => pathname === href) ||
                  undefined
                }
              >
                <summary>
                  Trading tools <ChevronDown size={13} />
                </summary>
                {navLinks(workspaceItems)}
              </details>
            </nav>
            <div className="workspace-sidebar-bottom">
              <div className="workspace-profile">
                <span className="workspace-avatar">
                  {user?.avatarUrl?.startsWith("http") ? (
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={34}
                      height={34}
                      unoptimized
                    />
                  ) : (
                    user?.initials || "TR"
                  )}
                </span>
                <Link
                  href={
                    user?.username
                      ? "/u/" + encodeURIComponent(user.username)
                      : "/settings/profile"
                  }
                >
                  <strong>{user?.name || "Trader"}</strong>
                  <span>
                    {user?.username
                      ? "@" + user.username
                      : user?.email || "Your profile"}
                  </span>
                </Link>
                <details className="workspace-user-menu">
                  <summary aria-label="Profile menu">
                    <MoreHorizontal size={20} />
                  </summary>
                  <div>
                    <Link href="/settings/profile">
                      <Settings size={15} />
                      Settings
                    </Link>
                    <button onClick={() => logoutDialog.current?.showModal()}>
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </aside>
          <div className="workspace-body" inert={open}>
            <header className="workspace-header">
              <button
                ref={navigationTrigger}
                aria-label="Open navigation"
                className="icon-button lg:hidden"
                onClick={() => setOpen(true)}
              >
                <Menu size={21} />
              </button>
              <div className="workspace-breadcrumb">
                <div>
                  <strong>{pageTitle}</strong>
                  {journalItems.some(([, href]) => pathname === href) && (
                    <span className="header-account-chip">
                      <i />
                      {account?.name || "All Accounts"}
                    </span>
                  )}
                </div>
                <small>
                  {journalItems.some(([, href]) => pathname === href)
                    ? "Trading performance workspace"
                    : "Tradoxy workspace"}
                </small>
              </div>
              <div className="workspace-header-actions">
                <button
                  className="workspace-search"
                  onClick={() => {
                    setQuery("");
                    searchDialog.current?.showModal();
                  }}
                  aria-label="Search workspace"
                >
                  <Search size={17} />
                  <span>Search workspace</span>
                  <kbd>
                    <Command size={11} />K
                  </kbd>
                </button>
                <Link
                  href={
                    pathname === "/home" || pathname === "/community"
                      ? "#compose-post"
                      : "/trades?add=1"
                  }
                  className="workspace-header-add"
                  title={
                    pathname === "/home" || pathname === "/community"
                      ? "Post trade"
                      : "Add trade"
                  }
                  aria-label={
                    pathname === "/home" || pathname === "/community"
                      ? "Post trade"
                      : "Add trade"
                  }
                >
                  <Plus size={17} />
                  <span>
                    {pathname === "/home" || pathname === "/community"
                      ? "Post trade"
                      : "Add trade"}
                  </span>
                </Link>
                <PnlModeMenu />
              </div>
            </header>
            <div className="workspace-mobile-account">
              {accountControl}
              <Link href="/accounts" aria-label="Manage accounts">
                <ListFilter size={17} />
              </Link>
            </div>
            <main
              id="workspace-content"
              className={
                "workspace-content" +
                (pathname.startsWith("/community") ||
                pathname === "/home" ||
                pathname.startsWith("/u/")
                  ? " is-social"
                  : "")
              }
            >
              {children}
            </main>
          </div>
          <dialog
            ref={searchDialog}
            className="workspace-dialog workspace-command"
            onClose={() => setQuery("")}
            onClick={(event) => {
              if (event.target === event.currentTarget)
                searchDialog.current?.close();
            }}
            aria-labelledby="workspace-search-title"
          >
            <div className="workspace-command-input">
              <Search size={20} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages or traders…"
                aria-label="Search pages"
              />
              <button
                onClick={() => searchDialog.current?.close()}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
            <div className="workspace-search-body">
              <h2 id="workspace-search-title">Pages</h2>
              <div className="workspace-command-results">
                {destinations
                  .filter(([label]) =>
                    label.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map(([label, href, Icon]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => searchDialog.current?.close()}
                    >
                      <Icon size={18} />
                      {label}
                      <ArrowRight size={15} />
                    </Link>
                  ))}
                {!destinations.some(([label]) =>
                  label.toLowerCase().includes(query.toLowerCase()),
                ) && <p>No matching pages.</p>}
              </div>
              {query.trim().length >= 2 && (
                <section
                  className="workspace-search-people"
                  aria-label="Trader search results"
                >
                  <h2>Traders</h2>
                  {searchState === "loading" && (
                    <p role="status">Searching traders…</p>
                  )}
                  {searchState === "error" && (
                    <p role="status">
                      Trader search is unavailable. Please try again.
                    </p>
                  )}
                  {searchState === "done" && !people.length && (
                    <p>No matching traders.</p>
                  )}
                  {people.map((person) => (
                    <Link
                      key={person.id}
                      href={"/u/" + encodeURIComponent(person.username)}
                      onClick={() => searchDialog.current?.close()}
                    >
                      <span className="workspace-avatar">
                        {person.avatar_url?.startsWith("http") ? (
                          <Image
                            src={person.avatar_url}
                            alt=""
                            width={34}
                            height={34}
                            unoptimized
                          />
                        ) : (
                          person.full_name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span>
                        <strong>
                          {person.full_name}
                          {person.is_verified && <BadgeCheck size={13} />}
                        </strong>
                        <small>@{person.username}</small>
                      </span>
                      <ArrowRight size={15} />
                    </Link>
                  ))}
                </section>
              )}
            </div>
          </dialog>
          <dialog
            ref={logoutDialog}
            className="workspace-dialog workspace-confirm"
            aria-labelledby="logout-title"
          >
            <h2 id="logout-title">Sign out of Tradoxy?</h2>
            <p>You can sign back in to continue your journal.</p>
            <div>
              <button
                className="ui-button"
                onClick={() => logoutDialog.current?.close()}
              >
                Stay here
              </button>
              <form action="/auth/sign-out" method="post">
                <button className="ui-button ui-button-primary">
                  Sign out
                </button>
              </form>
            </div>
          </dialog>
        </div>
      </PnlPreferences>
    </UserContext.Provider>
  );
}
