"use client";

import { Menu, Percent, Plus } from "lucide-react";
import { useActiveAccountStore } from "./active-account-context";
import type { Section } from "./types";

const LABELS: Partial<Record<Section, string>> = {
  feed: "Home",
  accounts: "Accounts",
  dashboard: "Dashboard",
  calendar: "Calendar",
  trades: "Trades",
  analytics: "Analytics",
  bible: "Strategies",
  settings: "Settings",
  account: "Profile",
  pricing: "Pricing",
  admin: "Admin",
};

const ACCOUNT_SCOPED_SECTIONS = new Set<Section>(["dashboard", "calendar", "trades", "analytics", "bible", "settings"]);

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
  const workspace = activeAccount?.name || "Workspace";

  return (
    <header className="tw-app-topbar sticky top-0 z-[60] shrink-0 border-b border-white/8 bg-black px-4 py-3 lg:static lg:flex lg:h-[64px] lg:items-center lg:justify-between lg:px-8 lg:py-0">
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="grid size-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.035] text-white transition active:scale-95"
          aria-label="Open mobile menu"
        >
          <Menu size={24} strokeWidth={2.4} />
        </button>

        <div className="min-w-0 flex-1 rounded-[1.55rem] border border-white/10 bg-[#080808] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
          <p className="truncate text-xl font-black leading-none tracking-[-0.03em] text-white">
            {isAccountScoped ? workspace : page}
          </p>
          <p className="mt-1.5 truncate text-sm font-semibold text-zinc-500">
            {isAccountScoped ? page : workspace}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddTrade}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black transition active:scale-95"
          aria-label="Add trade"
        >
          <Plus size={27} strokeWidth={2.25} />
        </button>
      </div>

      <div className="hidden min-w-0 text-sm font-semibold text-zinc-400 lg:block">
        {isAccountScoped ? (
          <>
            <span className="truncate">{workspace}</span>
            <span className="px-1.5 text-zinc-600">&gt;</span>
            <span className="font-black text-white">{page}</span>
          </>
        ) : (
          <span className="font-black text-white">{page}</span>
        )}
      </div>
      {isAccountScoped ? (
        <button
          type="button"
          aria-label="Risk settings"
          className="hidden size-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-sm font-black text-white transition hover:bg-white/[.08] lg:grid"
        >
          <Percent size={16} />
        </button>
      ) : null}
    </header>
  );
}
