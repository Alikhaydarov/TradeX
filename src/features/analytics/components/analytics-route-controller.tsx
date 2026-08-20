"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useActiveAccountStore } from "@/components/active-account-context";
import { useAuth } from "@/components/auth-context";
import { InstrumentBadge } from "@/components/instrument-badge";
import {
  buildEquityCurve,
  buildJournalStats,
  buildMistakeStats,
  buildSetupStats,
  calculatePlanRate,
} from "@/components/journal/journal-selectors";
import { useJournalData } from "@/components/journal/use-journal-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspacePreferences } from "@/components/workspace-preferences-context";

type AnalyticsView = "overview" | "strategy" | "symbols";

function AnalyticsSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-3 p-3 sm:p-4 lg:p-5" role="status" aria-label="Loading analytics">
      <Skeleton className="h-12 rounded-2xl bg-white/[.05]" />
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-[340px] rounded-2xl bg-white/[.045]" />
        <Skeleton className="h-[340px] rounded-2xl bg-white/[.045]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl bg-white/[.04]" />
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const valueClass =
    tone === "good"
      ? "text-xpositive"
      : tone === "bad"
        ? "text-xnegative"
        : "text-white";
  return (
    <Card className="gap-0 border-xborder bg-xsurface py-0 shadow-none">
      <CardContent className="p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-xmuted">{label}</p>
        <p className={`mt-2 font-mono text-xl font-black tracking-tight ${valueClass}`}>{value}</p>
        <p className="mt-1 truncate text-[10px] text-xmuted">{note}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsRouteController() {
  const router = useRouter();
  const { user } = useAuth();
  const { accounts, activeAccountId, loading: accountsLoading } = useActiveAccountStore();
  const account = useMemo(
    () => accounts.find((item) => item.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );
  const { entries, loading: journalLoading, error } = useJournalData({
    userId: user?.id ?? null,
    mode: "workspace",
    accountId: activeAccountId,
    accountsLoading,
  });
  const { formatPnl } = useWorkspacePreferences();
  const [view, setView] = useState<AnalyticsView>("overview");

  const stats = useMemo(() => buildJournalStats(entries), [entries]);
  const equity = useMemo(
    () => (account ? buildEquityCurve(account, entries) : []),
    [account, entries],
  );
  const setups = useMemo(() => buildSetupStats(entries), [entries]);
  const mistakes = useMemo(() => buildMistakeStats(entries), [entries]);
  const planRate = useMemo(() => calculatePlanRate(entries), [entries]);
  const symbolStats = useMemo(() => {
    const map = new Map<string, { symbol: string; trades: number; pnl: number; wins: number }>();
    for (const trade of entries) {
      const current = map.get(trade.symbol) ?? {
        symbol: trade.symbol,
        trades: 0,
        pnl: 0,
        wins: 0,
      };
      current.trades += 1;
      current.pnl += trade.pnl;
      current.wins += trade.pnl > 0 ? 1 : 0;
      map.set(trade.symbol, current);
    }
    return [...map.values()].sort(
      (left, right) => right.trades - left.trades || right.pnl - left.pnl,
    );
  }, [entries]);

  const wins = useMemo(() => entries.filter((entry) => entry.pnl > 0), [entries]);
  const losses = useMemo(() => entries.filter((entry) => entry.pnl < 0), [entries]);
  const averageWin = wins.length
    ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length
    : 0;
  const averageLoss = losses.length
    ? losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length
    : 0;
  const bestTrade = useMemo(
    () => entries.reduce<(typeof entries)[number] | null>((best, trade) =>
      !best || trade.pnl > best.pnl ? trade : best,
    null),
    [entries],
  );
  const worstTrade = useMemo(
    () => entries.reduce<(typeof entries)[number] | null>((worst, trade) =>
      !worst || trade.pnl < worst.pnl ? trade : worst,
    null),
    [entries],
  );

  if (accountsLoading || (journalLoading && !entries.length)) {
    return <AnalyticsSkeleton />;
  }
  if (!account) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-black text-white">Select a trading account</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Analytics is calculated from the active account journal.</p>
          <Button className="mt-5" onClick={() => router.push("/accounts")}>Open accounts</Button>
        </div>
      </div>
    );
  }

  const currentEquity = equity.at(-1)?.equity ?? account.initialBalance;
  const currentPnl = currentEquity - account.initialBalance;
  const drawdownUsed = account.maxDrawdown && currentPnl < 0
    ? Math.min(100, (Math.abs(currentPnl) / account.maxDrawdown) * 100)
    : 0;
  const pfScore = Math.max(0, Math.min(100, stats.pf * 25));
  const rrScore = Math.max(0, Math.min(100, (stats.r + 2) * 20));
  const recoveryScore = Math.max(
    0,
    Math.min(100, currentPnl >= 0 ? 85 + Math.min(15, stats.rate / 10) : 50 - drawdownUsed / 3),
  );
  const scoreRadar = [
    { subject: "Winrate", value: stats.rate },
    { subject: "Discipline", value: planRate },
    { subject: "Recovery", value: recoveryScore },
    { subject: "Profit", value: pfScore },
    { subject: "RR", value: rrScore },
  ];
  const profitabilityScore = Math.round(
    scoreRadar.reduce((sum, item) => sum + item.value, 0) / scoreRadar.length,
  );
  const formatTradePnl = (amount: number) =>
    formatPnl(amount, account.initialBalance || account.accountSize || 1);

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-3 p-3 sm:p-4 lg:p-5">
      {error ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-xs text-rose-300">{error}</div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-xborder bg-xsurface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-xmuted">Performance intelligence</p>
          <h1 className="mt-1 text-xl font-black tracking-[-0.03em] text-white">Analytics</h1>
          <p className="mt-1 text-xs text-xmuted">{account.name} · {entries.length} journal entries</p>
        </div>
        <div className="grid grid-cols-3 rounded-xl border border-xborder bg-xpanel p-1">
          {(["overview", "strategy", "symbols"] as AnalyticsView[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition ${view === item ? "bg-white text-black" : "text-xmuted-strong hover:bg-white/[.04] hover:text-white"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {view === "overview" ? (
        <>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <Card className="gap-0 overflow-hidden border-xborder bg-xsurface py-0 shadow-none">
              <CardHeader className="border-b border-xborder px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-xmuted">Equity curve</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <h2 className="font-mono text-2xl font-black text-white">{formatTradePnl(currentPnl)}</h2>
                  <span className="text-[10px] text-xmuted">{entries.length} trades</span>
                </div>
              </CardHeader>
              <CardContent className="h-[290px] p-3">
                {equity.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equity} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsEquityFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                      <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
                      <YAxis hide />
                      <Tooltip formatter={(value) => formatTradePnl(Number(value) - account.initialBalance)} contentStyle={{ background: "#121214", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} />
                      <Area type="monotone" dataKey="equity" stroke="#34d399" strokeWidth={2} fill="url(#analyticsEquityFill)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-sm text-xmuted">Add trades to unlock the equity curve.</div>
                )}
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden border-xborder bg-xsurface py-0 shadow-none">
              <CardHeader className="border-b border-xborder px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-xmuted">Tradoxy score</p>
                    <h2 className="mt-1 text-lg font-black text-white">Profitability quality</h2>
                  </div>
                  <span className="rounded-full border border-xborder bg-xpanel px-3 py-1 font-mono text-sm font-black text-white">{profitabilityScore}</span>
                </div>
              </CardHeader>
              <CardContent className="h-[290px] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={scoreRadar}>
                    <PolarGrid stroke="rgba(255,255,255,.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.28} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Average win" value={averageWin ? formatTradePnl(averageWin) : "—"} note={bestTrade ? `Best ${bestTrade.symbol}` : "No winning trade"} tone="good" />
            <MetricCard label="Average loss" value={averageLoss ? formatTradePnl(averageLoss) : "—"} note={worstTrade ? `Worst ${worstTrade.symbol}` : "No losing trade"} tone="bad" />
            <MetricCard label="Profit factor" value={stats.pf.toFixed(2)} note={`${stats.rate}% win rate`} tone={stats.pf >= 1 ? "good" : "bad"} />
            <MetricCard label="Average R" value={`${stats.r.toFixed(2)}R`} note={`${planRate}% plan adherence`} />
          </div>
        </>
      ) : null}

      {view === "strategy" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <Card className="gap-0 border-xborder bg-xsurface py-0 shadow-none">
            <CardHeader className="border-b border-xborder px-4 py-3">
              <h2 className="text-sm font-black text-white">Setup performance</h2>
              <p className="mt-1 text-[10px] text-xmuted">Ranked by net P&amp;L</p>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {setups.length ? setups.map((setup) => (
                <div key={setup.name} className="rounded-xl border border-xborder bg-xpanel px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{setup.name}</p>
                      <p className="mt-1 text-[10px] text-xmuted">{setup.trades} trades · {setup.rate}% win rate</p>
                    </div>
                    <strong className={`font-mono text-sm ${setup.pnl >= 0 ? "text-xpositive" : "text-xnegative"}`}>{formatTradePnl(setup.pnl)}</strong>
                  </div>
                </div>
              )) : <div className="py-12 text-center text-sm text-xmuted">No setup analytics yet.</div>}
            </CardContent>
          </Card>

          <Card className="gap-0 border-xborder bg-xsurface py-0 shadow-none">
            <CardHeader className="border-b border-xborder px-4 py-3">
              <h2 className="text-sm font-black text-white">Discipline & mistakes</h2>
              <p className="mt-1 text-[10px] text-xmuted">{planRate}% plan adherence</p>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {mistakes.length ? mistakes.map((mistake) => (
                <div key={mistake.name} className="flex items-center justify-between gap-3 rounded-xl border border-xborder bg-xpanel px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{mistake.name}</p>
                    <p className="mt-1 text-[10px] text-xmuted">{mistake.trades} repeats</p>
                  </div>
                  <strong className={`font-mono text-sm ${mistake.pnl >= 0 ? "text-xpositive" : "text-xnegative"}`}>{formatTradePnl(mistake.pnl)}</strong>
                </div>
              )) : <div className="py-12 text-center text-sm text-xmuted">No mistakes recorded.</div>}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {view === "symbols" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="gap-0 border-xborder bg-xsurface py-0 shadow-none">
            <CardHeader className="border-b border-xborder px-4 py-3">
              <h2 className="text-sm font-black text-white">Symbol performance</h2>
              <p className="mt-1 text-[10px] text-xmuted">Most traded instruments first</p>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {symbolStats.length ? symbolStats.map((symbol) => (
                <div key={symbol.symbol} className="flex items-center gap-3 rounded-xl border border-xborder bg-xpanel px-3 py-3">
                  <InstrumentBadge symbol={symbol.symbol} compact className="shrink-0 bg-xcard" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-xmuted">{symbol.trades} trades · {symbol.wins} wins</p>
                  </div>
                  <strong className={`font-mono text-sm ${symbol.pnl >= 0 ? "text-xpositive" : "text-xnegative"}`}>{formatTradePnl(symbol.pnl)}</strong>
                </div>
              )) : <div className="py-12 text-center text-sm text-xmuted">No symbol data yet.</div>}
            </CardContent>
          </Card>

          <Card className="gap-0 border-xborder bg-xsurface py-0 shadow-none">
            <CardHeader className="border-b border-xborder px-4 py-3">
              <h2 className="text-sm font-black text-white">Account profile</h2>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 p-3">
              {[
                ["Firm", account.firm || "Independent"],
                ["Phase", account.phase],
                ["Market", account.marketType],
                ["Platform", (account.platform || "manual").toUpperCase()],
                ["Target", formatTradePnl(account.profitTarget)],
                ["Max DD", formatTradePnl(-account.maxDrawdown)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-xborder bg-xpanel p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-xmuted">{label}</p>
                  <p className="mt-2 truncate text-xs font-bold text-white">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
