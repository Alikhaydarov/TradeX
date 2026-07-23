"use client";

import { EyeOff, Menu, Percent, Plus, Wallet } from "lucide-react";
import { useActiveAccountStore } from "./active-account-context";
import { SocialActions } from "./social-actions-v2";
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
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-black shadow-[0_8px_22px_rgba(255,255,255,.08)] transition hover:-translate-y-0.5 hover:bg-zinc-100 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${compact ? "w-10 px-0" : "gap-2 px-4 text-[12px]"}`}
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
  const headerContainerClass = isHome
    ? "max-w-4xl px-3 sm:px-5"
    : "max-w-[1180px] px-3 sm:px-4 lg:px-4";
  const pnlLabel =
    pnlMode === "percentage"
      ? "Percentage View"
      : pnlMode === "hidden"
        ? "Hide P&L"
        : "Money View";

  return (
    <header
      role="banner"
      className="tw-app-topbar sticky top-0 z-[70] shrink-0 border-b border-white/10 bg-black/95 backdrop-blur-xl supports-[backdrop-filter]:bg-black/88"
    >
      <div
        className={`mx-auto w-full py-2.5 lg:min-h-[72px] lg:py-3 ${headerContainerClass}`}
      >
        <div
          className="grid items-center gap-2 lg:flex lg:min-w-0 lg:flex-1 lg:gap-5"
          style={{
            gridTemplateColumns: isHome
              ? "40px minmax(0, 1fr) auto auto"
              : "40px minmax(0, 1fr) auto",
          }}
        >
          <button
            type="button"
            onClick={openMobileDrawer}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-[#0c0c0c] text-zinc-100 transition hover:border-white/20 hover:bg-[#151515] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 lg:hidden"
            aria-label="Open mobile menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

          <div className="min-w-0 lg:flex-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-[15px] font-bold leading-tight tracking-[-0.025em] text-white lg:text-[16px]">
                {page}
              </h1>
              {isAccountScoped ? (
                <span className="hidden max-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-semibold text-zinc-300 lg:inline-flex">
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.6)]" />
                  <span className="truncate">{workspace}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-[10px] font-medium text-zinc-500 lg:text-[11px]">
              {isAccountScoped
                ? "Trading performance workspace"
                : "Tradox workspace"}
            </p>
          </div>

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
          <div className="mt-2.5 flex items-center gap-2.5 border-t border-white/8 pt-2.5 lg:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Active account
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-zinc-200">
                {workspace}
              </p>
            </div>
            <PnlModeMenu
              pnlMode={pnlMode}
              pnlLabel={pnlLabel}
              onChange={setPnlMode}
              compact
            />
          </div>
        ) : null}
      </div>
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
  const items: Array<{
    value: PnlViewMode;
    label: string;
    icon: typeof Wallet;
  }> = [
    { value: "money", label: "Money View", icon: Wallet },
    { value: "percentage", label: "Percentage View", icon: Percent },
    { value: "hidden", label: "Hide P&L", icon: EyeOff },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-10 items-center rounded-xl border border-white/12 bg-[#0c0c0c] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition hover:border-white/20 hover:bg-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${compact ? "w-10 justify-center px-0" : "gap-2.5 px-3.5 text-[12px] font-semibold"}`}
          aria-label={`P&L display: ${pnlLabel}`}
          title={pnlLabel}
        >
          <Percent size={15} strokeWidth={2.2} />
          {compact ? null : pnlLabel}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border-white/12 bg-[#080808] p-1.5"
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
              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
                Active
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
