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
  community: "Community",
  settings: "Settings",
  account: "Profile",
  pricing: "Pricing",
  admin: "Admin",
};

const ACCOUNT_SCOPED_SECTIONS = new Set<Section>(["dashboard", "calendar", "trades", "analytics", "settings"]);

function openMobileDrawer() {
  window.dispatchEvent(new Event("tradox:open-mobile-menu"));
}

function dispatchPostTrade() {
  window.dispatchEvent(new Event("tradeway:share-trade"));
}

function PostTradeButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={dispatchPostTrade}
      className={`inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-white font-semibold text-black transition active:scale-95 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${compact ? "w-9 px-0" : "gap-1.5 px-3 text-[12px]"}`}
      aria-label="Post trade"
      title="Post trade"
    >
      <Plus size={15} strokeWidth={2.4} />
      {compact ? null : "Post trade"}
    </button>
  );
}

export function WorkspaceTopbar({ section }: { section: Section }) {
  const { accounts, activeAccountId } = useActiveAccountStore();
  const { pnlMode, setPnlMode } = useWorkspacePreferences();
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || null;
  const page = LABELS[section] || "Workspace";
  const isAccountScoped = ACCOUNT_SCOPED_SECTIONS.has(section);
  const isHome = section === "feed";
  const workspace = activeAccount?.name || "All Accounts";
  const pnlLabel = pnlMode === "percentage" ? "Percentage View" : pnlMode === "hidden" ? "Hide P&L" : "Money View";

  return (
    <header role="banner" className="tw-app-topbar sticky top-0 z-[70] shrink-0 border-b border-white/8 bg-black/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,.28)] backdrop-blur-xl supports-[backdrop-filter]:bg-black/85 lg:flex lg:min-h-16 lg:items-center lg:gap-4 lg:px-5 lg:py-2">
      <div className="grid items-center gap-2 lg:flex lg:min-w-0 lg:flex-1 lg:gap-4" style={{ gridTemplateColumns: isHome ? "36px minmax(0, 1fr) auto auto" : "36px minmax(0, 1fr) auto" }}>
        <button
          type="button"
          onClick={openMobileDrawer}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#090909] text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 lg:hidden"
          aria-label="Open mobile menu"
        >
          <Menu size={18} strokeWidth={2.2} />
        </button>

        <div className="min-w-0 lg:min-w-[180px] lg:flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[14px] font-semibold leading-tight tracking-[-0.02em] text-white">{page}</h1>
            {isAccountScoped ? <span className="hidden text-zinc-700 lg:inline">/</span> : null}
            {isAccountScoped ? <span className="hidden truncate text-xs text-zinc-500 lg:inline">{workspace}</span> : null}
          </div>
          <p className="truncate text-[10px] text-zinc-500 lg:mt-0.5 lg:text-zinc-600">{isAccountScoped ? "Trading performance workspace" : "TradeWay workspace"}</p>
        </div>

        <SocialActions compact expandedSearch />

        {isHome ? (
          <div className="shrink-0 lg:hidden">
            <PostTradeButton compact />
          </div>
        ) : null}

        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
          {isHome ? <PostTradeButton /> : null}
          <PnlModeMenu pnlMode={pnlMode} pnlLabel={pnlLabel} onChange={setPnlMode} />
        </div>
      </div>

      {isAccountScoped ? (
        <div className="mt-2 flex items-center gap-2 border-t border-white/6 pt-2 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] uppercase tracking-[0.12em] text-zinc-600">Active account</p>
            <p className="truncate text-xs font-medium text-zinc-300">{workspace}</p>
          </div>
          <PnlModeMenu pnlMode={pnlMode} pnlLabel={pnlLabel} onChange={setPnlMode} compact />
        </div>
      ) : null}
    </header>
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
          className={`inline-flex h-9 items-center rounded-xl border border-white/10 bg-[#090909] text-zinc-200 transition hover:border-white/15 hover:bg-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${compact ? "w-9 justify-center px-0" : "gap-2 px-3 text-[11px] font-medium"}`}
          aria-label={`P&L display: ${pnlLabel}`}
          title={pnlLabel}
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
