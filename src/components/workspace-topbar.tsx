"use client";

import dynamic from "next/dynamic";
import { EyeOff, Menu, Percent, Plus, Wallet } from "lucide-react";
import { useActiveAccountStore } from "./active-account-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  useWorkspacePreferences,
  type PnlViewMode,
} from "./workspace-preferences-context";
import type { Section } from "./types";

const SocialActions = dynamic(
  () => import("./social-actions-v2").then((module) => module.SocialActions),
  {
    ssr: false,
    loading: () => <div className="h-10 w-[88px] shrink-0" aria-hidden="true" />,
  },
);

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

const ACCOUNT_SCOPED_SECTIONS = new Set<Section>([
  "dashboard",
  "calendar",
  "trades",
  "analytics",
  "settings",
]);

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
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-black shadow-[0_8px_24px_rgba(255,255,255,.08)] transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-100 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${compact ? "w-10 px-0" : "gap-2 px-4 text-[12px]"}`}
      aria-label="Post trade"
      title="Post trade"
    >
      <Plus size={16} strokeWidth={2.5} />
      {compact ? null : "Post trade"}
    </button>
  );
}

export function WorkspaceTopbar({ section }: { section: Section }) {
  const { accounts, activeAccountId } = useActiveAccountStore();
  const { pnlMode, setPnlMode } = useWorkspacePreferences();
  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) || null;
  const page = LABELS[section] || "Workspace";
  const isAccountScoped = ACCOUNT_SCOPED_SECTIONS.has(section);
  const isHome = section === "feed";
  const workspace = activeAccount?.name || "All Accounts";
  const pnlLabel =
    pnlMode === "percentage"
      ? "Percentage View"
      : pnlMode === "hidden"
        ? "Hide P&L"
        : "Money View";

  return (
    <header
      role="banner"
      className="tw-app-topbar sticky top-0 z-[70] shrink-0 border-b border-xborder bg-xcanvas/90 px-3 py-2.5 backdrop-blur-xl lg:flex lg:min-h-[64px] lg:items-center lg:gap-5 lg:px-6 lg:py-2"
    >
      <div className="flex min-w-0 items-center gap-2.5 lg:flex-1 lg:gap-5">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-xborder bg-xsurface text-zinc-100 transition hover:border-xborder-strong hover:bg-xpanel active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 lg:hidden"
          aria-label="Open mobile menu"
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="min-w-0">
              <p className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-xmuted lg:block">
                Tradoxy workspace
              </p>
              <h1 className="truncate text-[15px] font-bold leading-tight tracking-[-0.025em] text-white lg:mt-0.5 lg:text-[17px]">
                {page}
              </h1>
            </div>

            {isAccountScoped ? (
              <span className="hidden max-w-[230px] items-center gap-2 rounded-full border border-xborder bg-xsurface px-2.5 py-1 text-[10px] font-semibold text-zinc-300 lg:inline-flex">
                <span className="size-1.5 shrink-0 rounded-full bg-xpositive shadow-[0_0_10px_rgba(52,211,153,.55)]" />
                <span className="truncate">{workspace}</span>
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-[10px] font-medium text-xmuted lg:hidden">
            {isAccountScoped ? workspace : "Tradoxy workspace"}
          </p>
        </div>

        <div className="hidden h-7 w-px shrink-0 bg-xborder lg:block" />
        <SocialActions compact expandedSearch />

        {isHome ? (
          <div className="shrink-0 lg:hidden">
            <PostTradeButton compact />
          </div>
        ) : null}

        <div className="ml-auto hidden shrink-0 items-center gap-2.5 lg:flex">
          {isHome ? <PostTradeButton /> : null}
          <PnlModeMenu
            pnlMode={pnlMode}
            pnlLabel={pnlLabel}
            onChange={setPnlMode}
          />
        </div>
      </div>

      {isAccountScoped ? (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-xborder bg-xsurface px-3 py-2.5 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-xmuted">
              Active account
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-xpositive" />
              <p className="truncate text-xs font-semibold text-zinc-200">
                {workspace}
              </p>
            </div>
          </div>
          <PnlModeMenu
            pnlMode={pnlMode}
            pnlLabel={pnlLabel}
            onChange={setPnlMode}
            compact
          />
        </div>
      ) : null}
    </header>
  );
}

function PnlModeMenu({
  pnlMode,
  pnlLabel,
  onChange,
  compact = true,
}: {
  pnlMode: PnlViewMode;
  pnlLabel: string;
  onChange: (value: PnlViewMode) => void;
  compact?: boolean;
}) {
  const items: Array<{
    value: PnlViewMode;
    label: string;
    icon: typeof Wallet;
  }> = [
    { value: "money", label: "Money View", icon: Wallet },
    { value: "percentage", label: "Percentage View", icon: Percent },
    { value: "hidden", label: "Hide P&L", icon: EyeOff },
  ];
  const activeItem = items.find((item) => item.value === pnlMode) || items[0];
  const ActiveIcon = activeItem.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-xl border border-xborder bg-xsurface text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition hover:border-xborder-strong hover:bg-xpanel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          data-compact={compact ? "true" : "false"}
          aria-label={`P&L display: ${pnlLabel}`}
          title={pnlLabel}
        >
          <ActiveIcon size={16} strokeWidth={2.1} />
          <span className="sr-only">{pnlLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border-xborder-strong bg-xcard p-1.5"
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => onChange(item.value)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-zinc-200"
          >
            <span className="flex items-center gap-2.5">
              <item.icon size={14} />
              {item.label}
            </span>
            {pnlMode === item.value ? (
              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-xpositive">
                Active
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
