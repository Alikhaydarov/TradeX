"use client";

import { EyeOff, Menu, Percent, Plus, Wallet } from "lucide-react";
import { useActiveAccountStore } from "./active-account-context";
import { SocialActions } from "./social-actions-v2";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useWorkspacePreferences, type PnlViewMode } from "./workspace-preferences-context";
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
  const { pnlMode, setPnlMode } = useWorkspacePreferences();
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;
  const page = LABELS[section] || "Workspace";
  const isAccountScoped = ACCOUNT_SCOPED_SECTIONS.has(section);
  const workspace = activeAccount?.name || "All Accounts";
  const pnlLabel = pnlMode === "percentage" ? "Percentage View" : pnlMode === "hidden" ? "Hide P&L" : "Money View";

  return (
    <div role="banner" className="tw-app-topbar sticky top-0 z-[60] shrink-0 border-b border-white/8 bg-black px-4 py-3 lg:static lg:flex lg:h-[38px] lg:items-center lg:justify-between lg:px-4 lg:py-0">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-[#050505] text-white transition active:scale-95"
          aria-label="Open mobile menu"
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black leading-none tracking-[-0.03em] text-white">
            {page}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
            {isAccountScoped ? workspace : "TradeWay workspace"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SocialActions className="hidden sm:flex" />
          <PnlModeMenu pnlMode={pnlMode} pnlLabel={pnlLabel} onChange={setPnlMode} compact />
          <button
            type="button"
            onClick={openAddTrade}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-[#050505] text-white transition active:scale-95"
            aria-label="Add trade"
          >
            <Plus size={22} strokeWidth={2.15} />
          </button>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 lg:flex lg:w-full">
        <div className="min-w-0 items-center gap-1 text-[7px] font-medium uppercase tracking-[0.08em] text-zinc-600 lg:flex">
          {isAccountScoped ? (
            <>
              <span className="truncate text-zinc-500">{workspace}</span>
              <span className="text-zinc-700">&gt;</span>
              <span className="font-semibold tracking-[0.02em] text-zinc-300">{page}</span>
            </>
          ) : (
            <span className="font-semibold tracking-[0.02em] text-zinc-300">{page}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SocialActions />
          <PnlModeMenu pnlMode={pnlMode} pnlLabel={pnlLabel} onChange={setPnlMode} />
        </div>
      </div>
    </div>
  );
}

function PnlModeMenu({
  pnlMode,
  pnlLabel,
  onChange,
  compact = false,
}: {
  pnlMode: PnlViewMode;
  pnlLabel: string;
  onChange: (value: PnlViewMode) => void;
  compact?: boolean;
}) {
  const items: Array<{ value: PnlViewMode; label: string; icon: typeof Wallet }> = [
    { value: "money", label: "Money View", icon: Wallet },
    { value: "percentage", label: "Percentage View", icon: Percent },
    { value: "hidden", label: "Hide P&L", icon: EyeOff },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 items-center rounded-2xl border border-white/10 bg-[#050505] text-zinc-200 transition hover:bg-[#101010] ${compact ? "w-9 justify-center px-0" : "gap-2 px-3 text-xs font-medium"}`}
        >
          <Percent size={15} />
          {compact ? null : pnlLabel}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#050505]">
        {items.map((item) => (
          <DropdownMenuItem key={item.value} onClick={() => onChange(item.value)} className="flex items-center justify-between px-3 py-2.5">
            <span className="flex items-center gap-2">
              <item.icon size={14} />
              {item.label}
            </span>
            {pnlMode === item.value ? <span className="text-[10px] font-black text-zinc-400">Active</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
