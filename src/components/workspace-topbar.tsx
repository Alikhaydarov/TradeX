"use client";

import { Menu, Plus } from "lucide-react";
import { useActiveAccountStore } from "./active-account-context";
import type { Section } from "./types";

const LABELS: Partial<Record<Section, string>> = {
  feed: "Home",
  accounts: "Accounts",
  dashboard: "Dashboard",
  calendar: "Calendar",
  trades: "Trades",
  analytics: "Analytics",
  settings: "Settings",
  account: "Profile",
  pricing: "Pricing",
  admin: "Admin",
};

const ACCOUNT_SCOPED_SECTIONS = new Set<Section>(["dashboard", "calendar", "trades", "analytics", "settings"]);

function openMobileDrawer() {
  window.dispatchEvent(new Event("tradox:open-mobile-menu"));
}

function openAddTrade() {
  window.dispatchEvent(new Event("tradox:add-trade"));
}

export function WorkspaceTopbar({ section }: { section: Section }) {
  const { accounts, activeAccountId } = useActiveAccountStore();
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;
  const page = LABELS[section] || "Workspace";
  const isAccountScoped = ACCOUNT_SCOPED_SECTIONS.has(section);
  const workspace = activeAccount?.name || "All Accounts";

  return (
    <div role="banner" className="tw-app-topbar sticky top-0 z-[60] shrink-0 border-b border-white/8 bg-black px-4 py-3 lg:static lg:flex lg:h-[56px] lg:items-center lg:justify-between lg:px-6 lg:py-0">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-white transition active:scale-95"
          aria-label="Open mobile menu"
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black leading-none tracking-[-0.03em] text-white">
            {page}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
            {isAccountScoped ? workspace : "TradeWay workspace"}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddTrade}
          className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white transition active:scale-95"
          aria-label="Add trade"
        >
          <Plus size={22} strokeWidth={2.15} />
        </button>
      </div>

      <div className="hidden min-w-0 items-center gap-2 text-[12px] font-medium text-zinc-500 lg:flex">
        {isAccountScoped ? (
          <>
            <span className="truncate text-zinc-500">{workspace}</span>
            <span className="text-zinc-700">&gt;</span>
            <span className="font-semibold text-zinc-200">{page}</span>
          </>
        ) : (
          <span className="font-semibold text-zinc-200">{page}</span>
        )}
      </div>
    </div>
  );
}
