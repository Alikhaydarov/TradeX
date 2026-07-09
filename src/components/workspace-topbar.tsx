"use client";

import { Percent } from "lucide-react";
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

export function WorkspaceTopbar({ section }: { section: Section }) {
  const { accounts, activeAccountId } = useActiveAccountStore();
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;
  const page = LABELS[section] || "Workspace";
  const workspace = activeAccount?.name || (section === "accounts" ? "All Accounts" : "Workspace");

  return (
    <header className="tw-app-topbar flex h-[58px] shrink-0 items-center justify-between border-b border-white/8 bg-black px-5 lg:h-[64px] lg:px-8">
      <div className="min-w-0 text-sm font-semibold text-zinc-400">
        <span className="truncate">{workspace}</span>
        <span className="px-1.5 text-zinc-600">&gt;</span>
        <span className="font-black text-white">{page}</span>
      </div>
      <button
        type="button"
        aria-label="Risk settings"
        className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-sm font-black text-white transition hover:bg-white/[.08]"
      >
        <Percent size={16} />
      </button>
    </header>
  );
}
