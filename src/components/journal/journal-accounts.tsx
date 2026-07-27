"use client";

import { ArrowUpRight, Plus, Trash2, WalletCards } from "lucide-react";

import { PropFirmLogo } from "@/components/prop-firm-logo";
import type { PropAccount } from "@/components/types";
import { Button } from "@/components/ui/button";
import type { JournalSummary } from "./use-journal-data";

export function JournalAccounts({
  summaries,
  activeAccountId,
  deleting,
  onAdd,
  onOpen,
  onDelete,
  formatPnl,
}: {
  summaries: JournalSummary[];
  activeAccountId: string | null;
  deleting: string | null;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onDelete: (account: PropAccount) => void;
  formatPnl: (value: number, baseValue?: number) => string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 p-3 sm:p-4 lg:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Trading accounts
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-white">
            Choose your workspace
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Compare prop and live accounts, then open one focused performance workspace.
          </p>
        </div>
        <Button onClick={onAdd} className="h-10 bg-white text-black hover:bg-zinc-200">
          <Plus className="size-4" /> Add account
        </Button>
      </header>

      {!summaries.length ? (
        <section className="grid min-h-[340px] place-items-center rounded-2xl border border-dashed border-white/10 bg-[#080808] p-6 text-center">
          <div className="max-w-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-white/8 bg-white/[.035] text-zinc-400">
              <WalletCards className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-white">No trading accounts yet</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Create a manual journal or connect a supported platform to start tracking execution.
            </p>
            <Button onClick={onAdd} className="mt-5 bg-white text-black hover:bg-zinc-200">
              <Plus className="size-4" /> Create first account
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {summaries.map((summary) => {
            const active = summary.account.id === activeAccountId;
            return (
              <article
                key={summary.account.id}
                className={`group rounded-xl border bg-[#090909] p-4 transition hover:-translate-y-0.5 hover:border-white/15 ${active ? "border-white/20" : "border-white/8"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-xl border border-white/8 bg-[#111] p-0.5">
                    <PropFirmLogo firm={summary.account.firm} compact />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-white">
                        {summary.account.name}
                      </h2>
                      {active ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-zinc-600">
                      {summary.account.firm} · {summary.account.phase}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(summary.account)}
                    disabled={deleting === summary.account.id}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-600 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                    aria-label={`Delete ${summary.account.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Metric label="Net P&L" value={formatPnl(summary.pnl, summary.account.accountSize)} tone={summary.pnl} />
                  <Metric label="Win rate" value={`${summary.winRate}%`} />
                  <Metric label="Trades" value={String(summary.trades)} />
                  <Metric label="Account size" value={formatPnl(summary.account.accountSize)} />
                </div>

                <div className="mt-4 space-y-2">
                  <Progress label="Target" value={summary.target} />
                  <Progress label="Drawdown used" value={summary.drawdown} danger />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpen(summary.account.id)}
                  className="mt-4 w-full justify-between border-white/8 bg-[#0c0c0c] hover:bg-white/[.05]"
                >
                  Open workspace <ArrowUpRight className="size-4" />
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number;
}) {
  return (
    <div className="rounded-lg border border-white/7 bg-white/[.025] p-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{label}</p>
      <p
        className={`mt-1 truncate font-mono text-sm font-semibold ${
          tone === undefined
            ? "text-zinc-200"
            : tone >= 0
              ? "text-emerald-300"
              : "text-rose-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Progress({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-600">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
        <div
          className={`h-full rounded-full ${danger ? "bg-rose-400" : "bg-emerald-400"}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
