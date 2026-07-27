"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  CircleHelp,
  Globe,
  LogIn,
  MoreHorizontal,
  Search,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";

import { pathFromSection } from "../section-config";
import { TraderAvatar } from "../trader-avatar";
import type { PropAccount, Section } from "../types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Sheet, SheetContent } from "../ui/sheet";
import type { SidebarController } from "./use-sidebar-controller";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

type NavItem = {
  id: Section;
  label: string;
  icon: LucideIcon;
};

function NavLink({
  item,
  active,
  mobile,
  onNavigate,
}: {
  item: NavItem;
  active: Section;
  mobile?: boolean;
  onNavigate: (section: Section, mobile?: boolean) => void;
}) {
  const { id, label, icon: Icon } = item;
  const selected = active === id;
  return (
    <Link
      href={pathFromSection(id)}
      prefetch
      onClick={(event) => {
        event.preventDefault();
        onNavigate(id, mobile);
      }}
      className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
        mobile ? "min-h-11" : ""
      } ${
        selected
          ? "bg-[#111111] text-white ring-1 ring-white/10"
          : "text-zinc-400 hover:bg-[#080808] hover:text-white"
      }`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${
          selected
            ? "bg-[#1a1a1a] text-white"
            : "bg-[#050505] text-zinc-500 group-hover:bg-[#0f0f0f] group-hover:text-zinc-300"
        }`}
      >
        <Icon size={15} strokeWidth={selected ? 2.3 : 2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {label}
      </span>
    </Link>
  );
}

function NavigationGroups({
  controller,
  mobile = false,
}: {
  controller: SidebarController;
  mobile?: boolean;
}) {
  return (
    <>
      <nav className="space-y-1">
        {controller.primaryNav.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            active={controller.active}
            mobile={mobile}
            onNavigate={controller.navigate}
          />
        ))}
      </nav>
      <GroupLabel>Workspace</GroupLabel>
      <nav className="space-y-1">
        {controller.journalingNav.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            active={controller.active}
            mobile={mobile}
            onNavigate={controller.navigate}
          />
        ))}
      </nav>
      {controller.communityNav.length ? (
        <>
          <GroupLabel>Community</GroupLabel>
          <nav className="space-y-1">
            {controller.communityNav.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                active={controller.active}
                mobile={mobile}
                onNavigate={controller.navigate}
              />
            ))}
          </nav>
        </>
      ) : null}
    </>
  );
}

function AccountSwitcher({
  controller,
  mobile = false,
}: {
  controller: SidebarController;
  mobile?: boolean;
}) {
  return (
    <DropdownMenu
      open={controller.accountSwitcherOpen}
      onOpenChange={controller.setAccountSwitcherOpen}
    >
      <div
        className={`${
          mobile
            ? "flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-[#030303] p-3"
            : "mt-4 flex w-full items-center gap-2 rounded-[0.95rem] border border-white/8 bg-[#030303] p-2 transition hover:bg-[#070707]"
        }`}
      >
        <button
          type="button"
          onClick={controller.openAccountsPage}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={`size-2 shrink-0 rounded-full ${
              controller.activeAccount ? "bg-emerald-500" : "bg-zinc-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`${mobile ? "text-sm" : "text-[12px]"} truncate font-bold text-white`}
            >
              {controller.activeAccount?.name || "Accounts"}
            </p>
            <p
              className={`${mobile ? "text-xs" : "text-[11px]"} truncate text-zinc-500`}
            >
              {controller.activeAccount
                ? controller.activeBalance
                : "Select trading account"}
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
              className={`transition-transform ${
                controller.accountSwitcherOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        side={mobile ? "bottom" : "right"}
        align="start"
        sideOffset={mobile ? 10 : 12}
        className={`${
          mobile ? "w-[min(320px,calc(100vw-2rem))]" : "w-[320px]"
        } rounded-2xl border-white/10 bg-[#080808] p-0 shadow-[0_28px_80px_rgba(0,0,0,.65)]`}
      >
        <div className="border-b border-white/8 px-4 py-3">
          <button
            type="button"
            onClick={controller.openAccountsPage}
            className="w-full rounded-xl px-2 py-1.5 text-left text-sm font-black text-white transition hover:bg-[#111111]"
          >
            All Accounts
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-zinc-500">
          <Search size={16} />
          <input
            value={controller.accountQuery}
            onChange={(event) => controller.setAccountQuery(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search account"
            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="max-h-[250px] overflow-y-auto p-2">
          {controller.filteredAccounts.length ? (
            controller.filteredAccounts.map((account) => {
              const selected = account.id === controller.activeAccountId;
              return (
                <DropdownMenuItem
                  key={account.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    controller.selectAccount(account.id);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 ${
                    selected
                      ? "bg-[#101010] text-white"
                      : "text-zinc-300"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-black ${
                      selected
                        ? "bg-white text-black"
                        : "bg-[#141414] text-white"
                    }`}
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
}

function ProfileMenu({
  controller,
  mobile,
}: {
  controller: SidebarController;
  mobile: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-xl text-zinc-400 transition hover:bg-[#111111] hover:text-white"
          aria-label="Open profile menu"
        >
          <MoreHorizontal size={mobile ? 15 : 16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 border-white/10 bg-[#090909]"
      >
        <DropdownMenuItem
          onClick={controller.openSettings}
          className="px-3 py-2.5"
        >
          <Settings2 size={14} className="mr-2" />
          Settings
        </DropdownMenuItem>
        {!mobile ? (
          <DropdownMenuItem
            onClick={controller.openPricing}
            className="px-3 py-2.5"
          >
            {controller.premium.isPremium
              ? "Manage subscription"
              : "View plans"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => controller.setLocale("en")}
          className="flex items-center justify-between px-3 py-2.5"
        >
          <span className="flex items-center gap-2">
            <Globe size={14} /> English
          </span>
          {controller.locale === "en" ? (
            <span className="text-[10px] font-bold text-zinc-400">Active</span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => controller.setLocale("es")}
          className="flex items-center justify-between px-3 py-2.5"
        >
          <span className="flex items-center gap-2 pl-6">Spanish</span>
          {controller.locale === "es" ? (
            <span className="text-[10px] font-bold text-zinc-400">Active</span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={controller.openHelpCenter}
          className="px-3 py-2.5"
        >
          <CircleHelp size={14} className="mr-2" />
          Help Center
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => controller.setLogoutConfirmOpen(true)}
          className="px-3 py-2.5 text-rose-300 focus:text-rose-200"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileCard({
  controller,
  mobile = false,
}: {
  controller: SidebarController;
  mobile?: boolean;
}) {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] text-left ${
        mobile
          ? "p-2.5"
          : "p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition-colors hover:bg-[#121212]"
      }`}
    >
      <TraderAvatar
        name={controller.name}
        value={controller.avatar}
        className={mobile ? "size-10 text-xs" : "h-9 w-9 text-xs"}
      />
      <button
        onClick={controller.openProfile}
        className="min-w-0 flex-1 text-left"
      >
        <strong
          className={`${mobile ? "block text-sm text-white" : "text-xs"} truncate`}
        >
          {controller.visibleName}
        </strong>
        <small className="block truncate text-[10px] text-zinc-500">
          {controller.visibleHandle}
        </small>
      </button>
      <ProfileMenu controller={controller} mobile={mobile} />
      {!controller.user ? <LogIn size={16} className="text-zinc-500" /> : null}
    </div>
  );
}

export function SidebarView({
  controller,
  hideMobile = false,
}: {
  controller: SidebarController;
  hideMobile?: boolean;
}) {
  return (
    <>
      <aside className="fixed left-[max(1rem,calc((100vw-1860px)/2+1rem))] top-3 z-40 hidden h-[calc(100dvh-1.5rem)] w-[238px] shrink-0 flex-col rounded-[1rem] border border-white/8 bg-[#000000] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] lg:flex">
        <button
          onClick={() => controller.goHome()}
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
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  controller.premium.isPremium
                    ? "bg-[#0b1c12] text-emerald-300"
                    : "bg-[#0a0a0a] text-zinc-400"
                }`}
              >
                {controller.planLabel}
              </span>
            </span>
            <small className="text-[10px] text-zinc-500">
              Trading workspace
            </small>
          </span>
        </button>

        <AccountSwitcher controller={controller} />

        <div className="mt-3">
          <NavigationGroups controller={controller} />
        </div>

        <div className="mt-auto">
          <ProfileCard controller={controller} />
        </div>
      </aside>

      {!hideMobile ? (
        <Sheet
          open={controller.mobileMenuOpen}
          onOpenChange={controller.setMobileMenuOpen}
        >
          <SheetContent
            side="left"
            showCloseButton={false}
            className="h-[100dvh] w-[76vw] max-w-[312px] p-0 sm:max-w-[312px] lg:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
                <button
                  type="button"
                  onClick={() => controller.goHome(true)}
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
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          controller.premium.isPremium
                            ? "bg-[#0b1c12] text-emerald-300"
                            : "bg-[#0a0a0a] text-zinc-400"
                        }`}
                      >
                        {controller.planLabel}
                      </span>
                    </span>
                    <small className="text-xs text-zinc-500">
                      Trading workspace
                    </small>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => controller.setMobileMenuOpen(false)}
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-[#0a0a0a] text-zinc-300"
                  aria-label="Close navigation"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="border-b border-white/8 px-3.5 py-3.5">
                <AccountSwitcher controller={controller} mobile />
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-3">
                <NavigationGroups controller={controller} mobile />
              </div>

              <div className="border-t border-white/8 p-3">
                <ProfileCard controller={controller} mobile />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <AlertDialog
        open={controller.logoutConfirmOpen}
        onOpenChange={controller.setLogoutConfirmOpen}
      >
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
              onClick={controller.confirmLogout}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
