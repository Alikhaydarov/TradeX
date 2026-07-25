"use client";

import {
  ArrowLeft,
  BarChart3,
  Check,
  Globe2,
  LockKeyhole,
  Percent,
  ShieldCheck,
  TrendingUp,
  Trophy,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { TraderAvatar } from "@/components/trader-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CommunitySection } from "./community-sidebar";
import type { CommunityCardData } from "./community-hub-v2";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
};

type Member = {
  user_id: string;
  role: string;
  status: string;
  joined_at?: string | null;
  profile: Profile | null;
};

type Account = {
  id: string;
  name: string;
  firm: string;
  account_size: number;
  initial_balance: number;
};

type Share = {
  prop_account_id: string;
  show_dollar_pnl: boolean;
};

type Result = {
  accountId: string;
  accountName: string;
  firm: string;
  member: Profile | null;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnlPercent: number;
  dollarPnl: number | null;
};

type DetailData = {
  community: CommunityCardData;
  role: string;
  isOwner: boolean;
  members: Member[];
  followers: Profile[];
  accounts: Account[];
  shares: Share[];
  results: Result[];
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const PANEL = "rounded-2xl border border-white/9 bg-[#070707]";

function go(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold tracking-[-0.02em] text-white">{title}</h2>
        {description ? <p className="mt-0.5 text-[10px] text-zinc-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: typeof UsersRound;
  tone?: "neutral" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-400/12 bg-emerald-400/[.035] text-emerald-300"
      : tone === "warning"
        ? "border-amber-400/12 bg-amber-400/[.035] text-amber-300"
        : "border-white/9 bg-[#080808] text-zinc-400";

  return (
    <div className={`rounded-xl border p-3.5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-8 place-items-center rounded-lg border border-white/8 bg-black/20">
          <Icon size={15} />
        </span>
        <span className="text-xl font-bold tabular-nums tracking-[-0.035em] text-white">{value}</span>
      </div>
      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-600">{label}</p>
    </div>
  );
}

function ResultRow({
  result,
  rank,
  expanded = false,
}: {
  result: Result;
  rank: number;
  expanded?: boolean;
}) {
  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/8 bg-[#050505] px-3 py-3 transition hover:border-white/14 hover:bg-[#0a0a0a]">
      <span className={`grid size-8 place-items-center rounded-lg text-[10px] font-black ${rank <= 3 ? "bg-amber-400/10 text-amber-300" : "bg-white/[.04] text-zinc-600"}`}>
        {rank}
      </span>
      <div className="flex min-w-0 items-center gap-2.5">
        <TraderAvatar
          name={result.member?.full_name || result.member?.username || "Trader"}
          value={result.member?.avatar_url}
          className="size-9 shrink-0 rounded-xl text-[9px]"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-semibold text-zinc-200">@{result.member?.username || "trader"}</p>
            {result.member?.is_verified ? <VerifiedBadge className="size-3.5" /> : null}
          </div>
          <p className="mt-0.5 truncate text-[9px] text-zinc-600">
            {result.accountName}
            {expanded ? ` · ${result.trades} trades · ${result.winRate}% WR` : ` · ${result.firm || "Independent"}`}
          </p>
        </div>
      </div>
      <div className="min-w-[74px] text-right">
        <p className={`text-[13px] font-bold tabular-nums ${result.pnlPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
          {result.pnlPercent >= 0 ? "+" : ""}{result.pnlPercent}%
        </p>
        <p className="mt-0.5 text-[9px] tabular-nums text-zinc-600">
          {result.dollarPnl === null ? `${result.winRate}% WR` : money.format(result.dollarPnl)}
        </p>
      </div>
    </div>
  );
}

function AccountSharing({
  accounts,
  draft,
  busy,
  onChange,
  onSave,
}: {
  accounts: Account[];
  draft: Record<string, { enabled: boolean; showDollarPnl: boolean }>;
  busy: boolean;
  onChange: (value: Record<string, { enabled: boolean; showDollarPnl: boolean }>) => void;
  onSave: () => void;
}) {
  return (
    <section className={`${PANEL} flex min-h-0 flex-col overflow-hidden`}>
      <div className="border-b border-white/8 p-4">
        <SectionTitle title="Share accounts" description="Choose what this community can see" />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3.5 xl:max-h-[410px]">
        {accounts.map((account) => {
          const value = draft[account.id] ?? { enabled: false, showDollarPnl: false };
          return (
            <div key={account.id} className="rounded-xl border border-white/8 bg-[#050505] p-3 transition hover:border-white/13">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...draft, [account.id]: { ...value, enabled: !value.enabled } })}
                  className={`grid size-5 place-items-center rounded-md border ${value.enabled ? "border-white bg-white text-black" : "border-white/12 text-transparent"}`}
                >
                  <Check size={12} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-zinc-200">{account.name}</p>
                  <p className="mt-0.5 truncate text-[9px] text-zinc-600">{account.firm || "Independent"}</p>
                </div>
              </div>
              {value.enabled ? (
                <label className="mt-2.5 flex items-center justify-between border-t border-white/8 pt-2.5 text-[10px] text-zinc-500">
                  Show dollar P&amp;L
                  <input
                    type="checkbox"
                    checked={value.showDollarPnl}
                    onChange={(event) => onChange({ ...draft, [account.id]: { ...value, showDollarPnl: event.target.checked } })}
                    className="size-3.5 accent-white"
                  />
                </label>
              ) : null}
            </div>
          );
        })}
        {!accounts.length ? <p className="py-10 text-center text-xs text-zinc-600">No trading accounts found.</p> : null}
      </div>
      {accounts.length ? (
        <div className="sticky bottom-0 border-t border-white/8 bg-[#070707]/95 p-3 backdrop-blur">
          <Button type="button" disabled={busy} onClick={onSave} className="h-9 w-full rounded-xl bg-white text-xs font-bold text-black hover:bg-zinc-200">
            {busy ? <Spinner className="size-4" /> : <Check size={14} />} Save sharing
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function CommunityDetailV2({
  communityId,
  activeTab,
}: {
  communityId: string;
  activeTab: CommunitySection;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [shareDraft, setShareDraft] = useState<Record<string, { enabled: boolean; showDollarPnl: boolean }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<DetailData>(`/api/communities/${encodeURIComponent(communityId)}`);
      setData(response);
      const shared = new Map((response.shares ?? []).map((share) => [share.prop_account_id, share]));
      setShareDraft(
        Object.fromEntries(
          (response.accounts ?? []).map((account) => [
            account.id,
            { enabled: shared.has(account.id), showDollarPnl: Boolean(shared.get(account.id)?.show_dollar_pnl) },
          ]),
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Community could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveShares = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/communities/${encodeURIComponent(communityId)}`, {
        method: "POST",
        body: JSON.stringify({
          action: "save_shares",
          shares: Object.entries(shareDraft).map(([accountId, value]) => ({ accountId, ...value })),
        }),
      });
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Sharing settings could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (busy || !selectedFollowers.length) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/communities/${encodeURIComponent(communityId)}`, {
        method: "POST",
        body: JSON.stringify({ action: "invite", userIds: selectedFollowers }),
      });
      setSelectedFollowers([]);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Members could not be invited.");
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    const results = data?.results ?? [];
    const trades = results.reduce((total, result) => total + result.trades, 0);
    const decided = results.filter((result) => result.wins + result.losses > 0);
    const avgWinRate = decided.length ? Math.round(decided.reduce((total, result) => total + result.winRate, 0) / decided.length) : 0;
    const pnlPercent = Number(results.reduce((total, result) => total + result.pnlPercent, 0).toFixed(2));
    return {
      members: (data?.members ?? []).filter((member) => member.status === "active").length,
      sharedAccounts: results.length,
      trades,
      avgWinRate,
      pnlPercent,
    };
  }, [data]);

  const leaderboard = useMemo(
    () => [...(data?.results ?? [])].sort((left, right) => right.pnlPercent - left.pnlPercent || right.winRate - left.winRate),
    [data],
  );

  if (loading) {
    return <div className="grid min-h-[70dvh] place-items-center"><Spinner className="size-6 text-zinc-500" /></div>;
  }

  if (!data) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-xl place-items-center p-4 text-center">
        <div className={`${PANEL} p-5`}>
          <h1 className="text-base font-bold text-white">Community unavailable</h1>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{error || "The community may have been removed or your invitation is not active."}</p>
          <Button type="button" onClick={() => go("/community")} className="mt-4 h-8 text-xs"><ArrowLeft size={14} /> My Communities</Button>
        </div>
      </div>
    );
  }

  const community = data.community;
  const activeMembers = data.members.filter((member) => member.status === "active");

  return (
    <div className="mx-auto max-w-[1380px] space-y-4 p-3 pb-24 sm:p-4 md:pb-8 lg:p-5">
      <header className={`${PANEL} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-3">
          <TraderAvatar name={community.name} value={community.avatar_url} className="size-11 rounded-xl text-[11px]" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-lg font-bold tracking-[-0.035em] text-white">{community.name}</h1>
              <ShieldCheck size={14} className="shrink-0 text-zinc-500" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white/[.045] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-500">{data.role}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold ${community.is_public ? "bg-sky-400/[.06] text-sky-300" : "bg-amber-400/[.06] text-amber-300"}`}>
                {community.is_public ? <Globe2 size={9} /> : <LockKeyhole size={9} />}
                {community.is_public ? "Public" : "Private"}
              </span>
            </div>
          </div>
        </div>
        <p className="line-clamp-2 max-w-xl text-[11px] leading-5 text-zinc-600 sm:text-right">{community.description || "Private community performance workspace."}</p>
      </header>

      {error ? <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-xs text-rose-200">{error}</div> : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
            <StatCard label="Members" value={String(stats.members)} icon={UsersRound} />
            <StatCard label="Shared accounts" value={String(stats.sharedAccounts)} icon={Wallet} />
            <StatCard label="Trades" value={String(stats.trades)} icon={BarChart3} />
            <StatCard label="Avg win rate" value={`${stats.avgWinRate}%`} icon={Percent} tone="warning" />
            <StatCard label="Combined return" value={`${stats.pnlPercent >= 0 ? "+" : ""}${stats.pnlPercent}%`} icon={TrendingUp} tone={stats.pnlPercent >= 0 ? "positive" : "neutral"} />
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
            <section className={`${PANEL} p-4`}>
              <SectionTitle title="Top performance" description="Best shared accounts by return" />
              <div className="mt-3 space-y-2">
                {leaderboard.slice(0, 5).map((result, index) => <ResultRow key={result.accountId} result={result} rank={index + 1} />)}
                {!leaderboard.length ? <p className="py-10 text-center text-xs text-zinc-600">No shared results yet.</p> : null}
              </div>
            </section>

            <AccountSharing accounts={data.accounts} draft={shareDraft} busy={busy} onChange={setShareDraft} onSave={() => void saveShares()} />
          </div>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatCard label="Total trades" value={String(stats.trades)} icon={BarChart3} />
            <StatCard label="Average win rate" value={`${stats.avgWinRate}%`} icon={Percent} tone="warning" />
            <StatCard label="Positive accounts" value={String(leaderboard.filter((item) => item.pnlPercent > 0).length)} icon={Trophy} tone="positive" />
            <StatCard label="Combined return" value={`${stats.pnlPercent >= 0 ? "+" : ""}${stats.pnlPercent}%`} icon={TrendingUp} tone={stats.pnlPercent >= 0 ? "positive" : "neutral"} />
          </section>
          <section className={`${PANEL} p-4`}>
            <SectionTitle title="Account analytics" description="Comparison of all shared accounts" />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                  <tr className="border-b border-white/8">
                    <th className="px-3 py-2.5 font-semibold">Trader</th>
                    <th className="px-3 py-2.5 font-semibold">Account</th>
                    <th className="px-3 py-2.5 font-semibold">Trades</th>
                    <th className="px-3 py-2.5 font-semibold">W / L</th>
                    <th className="px-3 py-2.5 font-semibold">Win rate</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((result) => (
                    <tr key={result.accountId} className="border-b border-white/6 transition last:border-0 hover:bg-white/[.025]">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <TraderAvatar name={result.member?.full_name || result.member?.username || "Trader"} value={result.member?.avatar_url} className="size-7 rounded-lg text-[8px]" />
                          <span className="text-zinc-300">@{result.member?.username || "trader"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-zinc-400">{result.accountName}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-400">{result.trades}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-400">{result.wins} / {result.losses}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-300">{result.winRate}%</td>
                      <td className={`px-3 py-3 text-right font-bold tabular-nums ${result.pnlPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{result.pnlPercent >= 0 ? "+" : ""}{result.pnlPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!leaderboard.length ? <p className="py-10 text-center text-xs text-zinc-600">No analytics data yet.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "leaderboard" ? (
        <section className={`${PANEL} p-4`}>
          <SectionTitle title="Leaderboard" description="Ranked by shared account return" />
          <div className="mt-3 space-y-2">
            {leaderboard.map((result, index) => <ResultRow key={result.accountId} result={result} rank={index + 1} expanded />)}
            {!leaderboard.length ? <p className="py-10 text-center text-xs text-zinc-600">No ranked accounts yet.</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "members" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className={`${PANEL} p-4`}>
            <SectionTitle title="Members" description={`${activeMembers.length} accepted members`} />
            <div className="mt-3 divide-y divide-white/7">
              {data.members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <TraderAvatar name={member.profile?.full_name || member.profile?.username || "Member"} value={member.profile?.avatar_url} className="size-9 rounded-xl text-[9px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-zinc-200">{member.profile?.full_name || member.profile?.username || "Member"}</p>
                      {member.profile?.is_verified ? <VerifiedBadge className="size-3.5" /> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-600">@{member.profile?.username || "member"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] capitalize text-zinc-400">{member.role}</p>
                    <p className={`mt-0.5 text-[9px] capitalize ${member.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>{member.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {data.isOwner ? (
            <section className={`${PANEL} p-4`}>
              <SectionTitle title="Invite followers" description="Select followers, then send invitations" action={<UserPlus size={16} className="text-zinc-600" />} />
              <div className="mt-3 max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
                {data.followers.map((profile) => {
                  const selected = selectedFollowers.includes(profile.id);
                  return (
                    <button key={profile.id} type="button" onClick={() => setSelectedFollowers((current) => selected ? current.filter((id) => id !== profile.id) : [...current, profile.id])} className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition ${selected ? "border-white/16 bg-white/[.06]" : "border-white/7 bg-[#050505] hover:border-white/13"}`}>
                      <TraderAvatar name={profile.full_name || profile.username} value={profile.avatar_url} className="size-7 rounded-lg text-[8px]" />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">@{profile.username}</span>
                      <span className={`grid size-5 place-items-center rounded-md border ${selected ? "border-white bg-white text-black" : "border-white/10 text-transparent"}`}><Check size={12} /></span>
                    </button>
                  );
                })}
                {!data.followers.length ? <p className="py-8 text-center text-xs text-zinc-600">No eligible followers.</p> : null}
              </div>
              <Button type="button" disabled={busy || !selectedFollowers.length} onClick={() => void invite()} className="mt-3 h-9 w-full rounded-xl bg-white text-xs font-bold text-black hover:bg-zinc-200">
                {busy ? <Spinner className="size-4" /> : <UserPlus size={14} />} Invite {selectedFollowers.length || ""}
              </Button>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
