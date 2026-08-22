"use client";

import {
  ChevronRight,
  MoreHorizontal,
  Plus,
  Settings,
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
  onSettings,
  onDelete,
}: {
  activeAccountId: string | null;
  summaries: JournalAccountSummary[];
  deleting: string | null;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onSettings: (id: string) => void;
  onDelete: (account: PropAccount) => void;
}) {
  const startingCapital = summaries.reduce(
    (total, item) => total + item.account.accountSize,
    0,
  );
  const netPnl = summaries.reduce((total, item) => total + item.pnl, 0);
  const portfolioValue = startingCapital + netPnl;

  return (
    <div className="animate-page-in mx-auto w-full max-w-[1480px] space-y-3 p-3 sm:p-4 lg:p-5">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-mute">
          {summaries.length
            ? `${summaries.length} connected ${summaries.length === 1 ? "account" : "accounts"}`
            : "Create an account to start journaling"}
        </p>
        <Button
          onClick={onAdd}
          className="h-9 shrink-0 rounded-xl bg-white px-3 text-xs font-bold text-black hover:bg-zinc-200 sm:px-4 sm:text-sm"
        >
          <Plus size={15} />{" "}
          <span className="hidden sm:inline">Add account</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {summaries.length ? (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
                Portfolio value
              </p>
              <p className="mt-1 font-mono text-xl font-black tracking-tight text-white sm:text-2xl">
                {cash.format(portfolioValue)}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`rounded-lg px-2 py-1 font-mono text-xs font-bold ${
                  netPnl >= 0
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-rose-400/10 text-rose-300"
                }`}
              >
                {netPnl >= 0 ? "+" : ""}
                {cash.format(netPnl)}
              </span>
              <p className="mt-1.5 text-[10px] text-ink-subtle">
                {summaries.length}{" "}
                {summaries.length === 1 ? "account" : "accounts"} ·{" "}
                {cash.format(startingCapital)} capital
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!summaries.length ? (
        <div className="grid min-h-80 place-items-center rounded-[24px] border border-dashed border-white/12 bg-surface px-5 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-surface">
              <WalletCards size={24} className="text-ink-strong" />
            </div>
            <h2 className="mt-4 text-xl font-black text-white">
              Create your first journal
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-mute">
              Add an account name and starting balance. You can begin logging
              trades immediately.
            </p>
            <Button
              onClick={onAdd}
              className="mt-5 h-11 rounded-xl bg-white px-5 text-black hover:bg-zinc-200"
            >
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
              onSettings={onSettings}
              onDelete={onDelete}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="group grid min-h-[156px] place-items-center rounded-2xl border border-dashed border-white/12 bg-surface p-4 text-center transition hover:border-white/25 hover:bg-surface-raised"
          >
            <span>
              <span className="mx-auto grid size-9 place-items-center rounded-xl border border-white/10 bg-surface text-ink-mute transition group-hover:text-white">
                <Plus size={17} />
              </span>
              <span className="mt-2.5 block text-sm font-bold text-ink-mute transition group-hover:text-zinc-200">
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
  onSettings,
  onDelete,
  compact = false,
}: {
  active?: boolean;
  summary: JournalAccountSummary;
  deleting: string | null;
  onOpen: (id: string) => void;
  onSettings: (id: string) => void;
  onDelete: (account: PropAccount) => void;
  compact?: boolean;
}) {
  const statusColor: Record<string, string> = {
    Processing: "text-sky-300 bg-[#091119] border-sky-400/20",
    Active: "text-emerald-300 bg-[#0b1c12] border-emerald-400/20",
    Passed: "text-ink-strong bg-surface border-white/15",
    Failed: "text-rose-300 bg-[#1a0d10] border-rose-400/20",
    Paused: "text-amber-400 bg-[#1a1407] border-amber-400/20",
  };
  const pnlTone = summary.pnl >= 0 ? "text-emerald-300" : "text-rose-300";
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
        compact ? "min-h-[144px]" : "min-h-[156px]"
      } ${
        active
          ? "border-white/20 bg-surface shadow-[0_12px_32px_rgba(0,0,0,.3)]"
          : "border-white/10 bg-surface hover:border-white/20 hover:bg-surface"
      }`}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.45)]" />
              <p className="truncate text-[15px] font-bold text-white">
                {summary.account.name}
              </p>
            </div>
            <p className="truncate text-[11px] text-ink-subtle">
              {sourceLabel} ·{" "}
              {summary.account.accountType === "real"
                ? "Personal"
                : summary.account.firm || "Prop account"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
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
                className="border-white/10 bg-surface"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => onSettings(summary.account.id)}
                >
                  <Settings size={14} /> Settings
                </DropdownMenuItem>
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

        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-subtle">
            Current balance
          </p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="font-mono text-xl font-black text-white">
              {cash.format(currentBalance)}
            </p>
            <p className={`font-mono text-xs font-bold ${pnlTone}`}>
              {summary.pnl >= 0 ? "+" : ""}
              {cash.format(summary.pnl)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-2.5">
          <div className="flex min-w-0 items-center gap-3 text-[11px] text-ink-mute">
            <span>{summary.trades} trades</span>
            <span className="text-zinc-800">/</span>
            <span>{summary.winRate}% win rate</span>
          </div>
          <ChevronRight
            size={16}
            className="text-ink-subtle transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </div>
  );
}
