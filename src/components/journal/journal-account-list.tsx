"use client";

import {
  ChevronRight,
  MoreHorizontal,
  Plus,
  Trash2,
  WalletCards,
} from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { PropAccount } from "../types";

export type JournalAccountSummary = {
  account: PropAccount;
  trades: number;
  pnl: number;
  winRate: number;
  target: number;
  dd: number;
};

const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function JournalAccountList({
  activeAccountId,
  summaries,
  deleting,
  onAdd,
  onOpen,
  onDelete,
}: {
  activeAccountId: string | null;
  summaries: JournalAccountSummary[];
  deleting: string | null;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onDelete: (account: PropAccount) => void;
}) {
  const startingCapital = summaries.reduce(
    (total, item) => total + item.account.accountSize,
    0,
  );
  const netPnl = summaries.reduce((total, item) => total + item.pnl, 0);
  const portfolioValue = startingCapital + netPnl;

  return (
    <div className="animate-page-in mx-auto max-w-[1320px] space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-xmuted">
            Trading capital
          </p>
          <h1 className="mt-1 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
            Accounts
          </h1>
          <p className="mt-1 text-xs text-xmuted">
            Manage journals, balances and account performance in one place.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="h-10 shrink-0 rounded-xl px-3 text-xs font-bold sm:px-4 sm:text-sm"
        >
          <Plus size={15} />{" "}
          <span className="hidden sm:inline">Add account</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {summaries.length ? (
        <section className="overflow-hidden rounded-2xl border border-xborder bg-xsurface shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-xborder px-4 py-3.5 sm:px-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-xmuted">
                Portfolio overview
              </p>
              <p className="mt-1 text-[11px] text-xmuted-strong">
                {summaries.length} {summaries.length === 1 ? "account" : "accounts"} connected
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-xborder bg-xpanel px-2.5 py-1 text-[10px] font-semibold text-zinc-300">
              <span className="size-1.5 rounded-full bg-xpositive" /> Live journal
            </span>
          </div>

          <div className="grid divide-y divide-x-0 divide-xborder sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4 sm:px-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">
                Portfolio value
              </p>
              <p className="mt-1.5 font-mono text-xl font-black tracking-tight text-white sm:text-2xl">
                {cash.format(portfolioValue)}
              </p>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">
                Net P&amp;L
              </p>
              <p
                className={`mt-1.5 font-mono text-xl font-black tracking-tight ${
                  netPnl >= 0 ? "text-xpositive" : "text-xnegative"
                }`}
              >
                {netPnl >= 0 ? "+" : ""}
                {cash.format(netPnl)}
              </p>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-xmuted">
                Starting capital
              </p>
              <p className="mt-1.5 font-mono text-xl font-black tracking-tight text-zinc-200 sm:text-2xl">
                {cash.format(startingCapital)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!summaries.length ? (
        <div className="grid min-h-80 place-items-center rounded-[24px] border border-dashed border-xborder-strong bg-xsurface px-5 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-xborder bg-xpanel">
              <WalletCards size={24} className="text-zinc-300" />
            </div>
            <h2 className="mt-4 text-xl font-black tracking-[-0.025em] text-white">
              Create your first journal
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-xmuted-strong">
              Add an account name and starting balance. You can begin logging
              trades immediately.
            </p>
            <Button onClick={onAdd} className="mt-5 h-11 rounded-xl px-5">
              <Plus size={16} /> Add account
            </Button>
          </div>
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {summaries.map((summary) => (
            <JournalAccountCard
              key={summary.account.id}
              active={activeAccountId === summary.account.id}
              summary={summary}
              deleting={deleting}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="group grid min-h-[184px] place-items-center rounded-2xl border border-dashed border-xborder bg-xsurface p-4 text-center transition duration-200 hover:-translate-y-px hover:border-xborder-strong hover:bg-xpanel"
          >
            <span>
              <span className="mx-auto grid size-10 place-items-center rounded-xl border border-xborder bg-xpanel text-xmuted transition group-hover:border-xborder-strong group-hover:bg-xcard group-hover:text-white">
                <Plus size={17} />
              </span>
              <span className="mt-2.5 block text-sm font-bold text-xmuted-strong transition group-hover:text-zinc-100">
                Add account
              </span>
            </span>
          </button>
        </section>
      )}
    </div>
  );
}

function JournalAccountCard({
  active = false,
  summary,
  deleting,
  onOpen,
  onDelete,
  compact = false,
}: {
  active?: boolean;
  summary: JournalAccountSummary;
  deleting: string | null;
  onOpen: (id: string) => void;
  onDelete: (account: PropAccount) => void;
  compact?: boolean;
}) {
  const statusColor: Record<string, string> = {
    Processing: "text-sky-300 bg-sky-400/8 border-sky-400/20",
    Active: "text-xpositive bg-emerald-400/8 border-emerald-400/20",
    Passed: "text-zinc-300 bg-white/[.04] border-xborder-strong",
    Failed: "text-xnegative bg-rose-400/8 border-rose-400/20",
    Paused: "text-xwarning bg-amber-400/8 border-amber-400/20",
  };
  const statusDot: Record<string, string> = {
    Processing: "bg-sky-400",
    Active: "bg-xpositive",
    Passed: "bg-zinc-300",
    Failed: "bg-xnegative",
    Paused: "bg-xwarning",
  };
  const pnlTone = summary.pnl >= 0 ? "text-xpositive" : "text-xnegative";
  const sourceLabel =
    summary.account.importSource === "mt5_bridge" ? "MT5 sync" : "Manual";
  const currentBalance = summary.account.accountSize + summary.pnl;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(summary.account.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onOpen(summary.account.id);
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
        compact ? "min-h-[150px]" : "min-h-[184px]"
      } ${
        active
          ? "border-xborder-strong bg-xpanel shadow-[inset_3px_0_0_#34d399,0_16px_38px_rgba(0,0,0,.26)]"
          : "border-xborder bg-xsurface shadow-[inset_0_1px_0_rgba(255,255,255,.02)] hover:-translate-y-px hover:border-xborder-strong hover:bg-xpanel"
      }`}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  statusDot[summary.account.status] || statusDot.Active
                }`}
              />
              <p className="truncate text-[15px] font-bold tracking-[-0.02em] text-white">
                {summary.account.name}
              </p>
            </div>
            <p className="truncate text-[11px] text-xmuted">
              {sourceLabel} ·{" "}
              {summary.account.accountType === "real"
                ? "Personal"
                : summary.account.firm || "Prop account"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${
                statusColor[summary.account.status] || statusColor.Active
              }`}
            >
              {summary.account.status}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-xborder-strong bg-xcard"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleting === summary.account.id}
                  onClick={() => onDelete(summary.account)}
                >
                  <Trash2 size={14} /> Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-xmuted">
            Current balance
          </p>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <p className="font-mono text-[21px] font-black tracking-[-0.035em] text-white">
              {cash.format(currentBalance)}
            </p>
            <p className={`font-mono text-xs font-bold ${pnlTone}`}>
              {summary.pnl >= 0 ? "+" : ""}
              {cash.format(summary.pnl)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-xborder pt-3">
          <div className="flex min-w-0 items-center gap-3 text-[10px] font-medium text-xmuted-strong">
            <span>{summary.trades} trades</span>
            <span className="text-zinc-700">/</span>
            <span>{summary.winRate}% win rate</span>
          </div>
          <ChevronRight
            size={16}
            className="text-xmuted transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200"
          />
        </div>
      </div>
    </div>
  );
}
