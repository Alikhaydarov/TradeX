"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  LineChart,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useActiveAccountStore } from "./active-account-context";
import { useAuth } from "./auth-context";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { usePremiumStatus } from "./use-premium-status";

function openAccountSetup() {
  window.history.pushState(null, "", "/accounts?new=1");
  window.dispatchEvent(new Event("popstate"));
}

export function FreeUserStart({ children }: { children: ReactNode }) {
  const { accounts, loading: accountsLoading } = useActiveAccountStore();
  const { status, loading: premiumLoading } = usePremiumStatus(true);
  const { user } = useAuth();

  if (accountsLoading || premiumLoading) {
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <Spinner className="size-5 text-zinc-500" />
      </div>
    );
  }

  if (status.plan !== "free" || accounts.length > 0) return children;

  const firstName = String(
    user?.user_metadata.full_name ?? user?.user_metadata.name ?? "Trader",
  )
    .trim()
    .split(/\s+/)[0];

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-black px-4 py-6 text-white sm:px-6 sm:py-10 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-600">
              Getting started
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-400">
              Free workspace
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-bold text-zinc-400">
            1 account included
          </span>
        </header>

        <main className="mt-8 grid items-start gap-8 lg:mt-12 lg:grid-cols-[minmax(0,.85fr)_minmax(440px,1.15fr)] lg:gap-14">
          <section className="pt-2">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white text-black">
              <Sparkles size={18} />
            </span>
            <h1 className="mt-6 max-w-lg text-3xl font-black tracking-[-.045em] sm:text-4xl lg:text-5xl">
              Welcome, {firstName}. Build your trading record.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-500 sm:text-base">
              Start with one account. Tradox will turn your trades into a clear
              journal, calendar and performance review.
            </p>
            <Button
              onClick={openAccountSetup}
              className="mt-7 h-12 w-full rounded-xl bg-white px-5 text-sm font-black text-black hover:bg-zinc-200 sm:w-auto"
            >
              <Plus size={16} /> Add your first account <ArrowRight size={15} />
            </Button>
            <p className="mt-3 text-[11px] text-zinc-700">
              Manual accounts are free. No card required.
            </p>

            <div className="mt-9 space-y-1 border-t border-white/8 pt-5">
              <StartStep
                number="01"
                title="Create or connect an account"
                text="Choose manual setup or a supported trading platform."
                active
              />
              <StartStep
                number="02"
                title="Add your trades"
                text="Journal manually or sync when your plan supports it."
              />
              <StartStep
                number="03"
                title="Review your edge"
                text="Use calendar and analytics to find repeatable patterns."
              />
            </div>
          </section>

          <ProductPreview />
        </main>
      </div>
    </div>
  );
}

function StartStep({
  number,
  title,
  text,
  active = false,
}: {
  number: string;
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-xl px-2 py-3 ${active ? "bg-white/[.04]" : ""}`}
    >
      <span
        className={`pt-0.5 font-mono text-[10px] font-bold ${active ? "text-white" : "text-zinc-700"}`}
      >
        {number}
      </span>
      <div>
        <p
          className={`text-sm font-bold ${active ? "text-white" : "text-zinc-500"}`}
        >
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-zinc-700">{text}</p>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#070707] p-3 shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-4">
      <div className="flex items-center justify-between border-b border-white/8 px-2 pb-3">
        <div>
          <p className="text-xs font-black">Your workspace</p>
          <p className="mt-1 text-[10px] text-zinc-600">
            Ready after account setup
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600">
          <span className="size-1.5 rounded-full bg-white" /> Live journal
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 py-3">
        <PreviewMetric label="Net P&L" value="$0.00" />
        <PreviewMetric label="Win rate" value="0%" />
        <PreviewMetric label="Trades" value="0" />
      </div>
      <div className="rounded-2xl border border-white/8 bg-black p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold">Performance</p>
            <p className="mt-1 text-[9px] text-zinc-700">Equity curve</p>
          </div>
          <LineChart size={15} className="text-zinc-500" />
        </div>
        <div className="mt-5 flex h-32 items-end gap-1.5 sm:h-44">
          {[18, 28, 22, 38, 34, 51, 46, 62, 58, 72, 68, 84, 78, 92].map(
            (height, index) => (
              <span
                key={index}
                className="flex-1 rounded-t-sm bg-white/[.08]"
                style={{ height: `${height}%` }}
              />
            ),
          )}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <PreviewFeature
          icon={BarChart3}
          title="Automatic analytics"
          text="See performance by setup, session and mistake."
        />
        <PreviewFeature
          icon={Check}
          title="One clear routine"
          text="Record, review and improve without spreadsheets."
        />
      </div>
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.025] p-3">
      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-700">
        {label}
      </p>
      <p className="mt-2 text-sm font-black sm:text-base">{value}</p>
    </div>
  );
}

function PreviewFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BarChart3;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/8 bg-white/[.02] p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.05] text-zinc-400">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-[11px] font-bold">{title}</p>
        <p className="mt-1 text-[9px] leading-4 text-zinc-700">{text}</p>
      </div>
    </div>
  );
}
