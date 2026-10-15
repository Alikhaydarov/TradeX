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
  ChevronRight,
  Command,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  MessageSquareText,
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

const journalItems = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Trades", "/trades", ArrowDownUp],
  ["Calendar", "/calendar", CalendarDays],
  ["Analytics", "/analytics", ChartNoAxesCombined],
] as const;
const workspaceItems = [
  ["Community", "/community", MessageSquareText],
  ["AI Coach", "/coach", Bot],
  ["Evaluations", "/evaluations", Target],
  ["Risk overview", "/risk", ShieldCheck],
] as const;
const destinations = [
  ...journalItems,
  ...workspaceItems,
  ["Accounts", "/accounts", WalletCards],
  ["Profile settings", "/settings/profile", Settings],
] as const;
const mobileItems = [
  journalItems[0],
  workspaceItems[0],
  journalItems[1],
  journalItems[2],
  ["Profile", "/settings/profile", UserRound],
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
}: {
  children: React.ReactNode;
  user?: WorkspaceUser | undefined;
  initialSelectedAccountId?: string | null;
  initialAccounts?: TradingAccount[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchDialog = useRef<HTMLDialogElement>(null);
  const logoutDialog = useRef<HTMLDialogElement>(null);
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
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);
  function selectAccount(value: string) {
    setSelectedAccountId(value);
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
    destinations.find(
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
  const navLinks = (items: typeof journalItems | typeof workspaceItems) =>
    items.map(([label, href, Icon]) => {
      const active = pathname === href;
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active ? "page" : undefined}
          className={"workspace-nav-link" + (active ? " is-active" : "")}
        >
          <Icon size={18} strokeWidth={1.7} />
          <span>{label}</span>
          {active && <span className="nav-active-dot" />}
        </Link>
      );
    });
  return (
    <UserContext.Provider value={user}>
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
          className={"workspace-sidebar" + (open ? " is-open" : "")}
          aria-label="Workspace navigation"
        >
          <div className="workspace-brand">
            <Link href="/dashboard" aria-label="Tradoxy dashboard">
              <Brand />
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
            <div className="workspace-account-label">
              <span>
                <i />
                Trading account
              </span>
              <Link
                href="/accounts"
                title="Manage accounts"
                aria-label="Manage accounts"
              >
                <Settings size={14} />
              </Link>
            </div>
            {accountControl}
            <div className="workspace-account-balance">
              {account
                ? "$" + Number(account.initial_balance || 0).toLocaleString()
                : accounts.length + " accounts"}
              <span>{account ? "Initial balance" : "Portfolio workspace"}</span>
            </div>
          </div>
          <nav className="workspace-navigation">
            <p>Journal</p>
            {navLinks(journalItems)}
            <p>Workspace</p>
            {navLinks(workspaceItems)}
          </nav>
          <div className="workspace-sidebar-bottom">
            <Link href="/trades?add=1" className="workspace-log-trade">
              <Plus size={17} />
              Log a trade
              <ArrowRight size={15} />
            </Link>
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
                <span>Personal workspace</span>
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
        <div className="workspace-body">
          <header className="workspace-header">
            <button
              aria-label="Open navigation"
              className="icon-button lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="workspace-breadcrumb">
              <span>{account?.name || "Workspace"}</span>
              <ChevronRight size={13} />
              <strong>{pageTitle}</strong>
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
                href="/trades?add=1"
                className="workspace-header-add"
                title="Add trade"
                aria-label="Add trade"
              >
                <Plus size={17} />
                <span>Add trade</span>
              </Link>
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
              (pathname.startsWith("/community") || pathname.startsWith("/u/")
                ? " is-social"
                : "")
            }
          >
            {children}
          </main>
        </div>
        <nav className="workspace-mobile-nav" aria-label="Primary navigation">
          {mobileItems.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={
                label === "Profile" && user?.username
                  ? "/u/" + encodeURIComponent(user.username)
                  : href
              }
              aria-current={
                pathname === href ||
                (label === "Profile" && pathname.startsWith("/u/"))
                  ? "page"
                  : undefined
              }
              className={
                pathname === href ||
                (label === "Profile" && pathname.startsWith("/u/"))
                  ? "is-active"
                  : ""
              }
            >
              <Icon size={21} strokeWidth={1.8} />
              <span>{label === "Dashboard" ? "Overview" : label}</span>
            </Link>
          ))}
        </nav>
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
              <button className="ui-button ui-button-primary">Sign out</button>
            </form>
          </div>
        </dialog>
      </div>
    </UserContext.Provider>
  );
}
