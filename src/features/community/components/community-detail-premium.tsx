"use client";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  Crown,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Target,
  Trophy,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TraderAvatar } from "@/components/trader-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VerifiedBadge } from "@/components/verified-badge";
import { apiRequest } from "@/lib/api-client";
import {
  fetchCommunityDetail,
  getCachedCommunityDetail,
  markCommunityDetailStale,
  markCommunityHubStale,
} from "../community-data-store";
import type { CommunitySection } from "./community-sidebar";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
};

type CommunityCard = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  accent?: string;
  avatar_url?: string | null;
  role: string;
  memberCount: number;
  owner: Profile | null;
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
  community: CommunityCard;
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

const PANEL = "rounded-2xl border border-xborder bg-xsurface";

function SectionHeading({
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
        <h2 className="truncate text-[13px] font-bold text-white">{title}</h2>
        {description ? (
          <p className="mt-0.5 truncate text-[10px] text-xmuted">
            {description}
          </p>
        ) : null}
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
      ? "border-emerald-400/15 bg-emerald-400/[.045] text-emerald-300"
      : tone === "warning"
        ? "border-amber-400/15 bg-amber-400/[.045] text-amber-300"
        : "border-xborder bg-xsurface text-xmuted";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-7 place-items-center rounded-lg border border-xborder bg-xpanel">
          <Icon size={14} />
        </span>
        <p className="text-[18px] font-bold tabular-nums tracking-[-0.035em] text-white">
          {value}
        </p>
      </div>
      <p className="mt-2.5 text-[8px] font-bold uppercase tracking-[0.13em] text-xmuted">
        {label}
      </p>
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
    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-xborder bg-xpanel px-3 py-2.5 transition hover:border-xborder-strong hover:bg-xraised">
      <span
        className={`grid size-8 place-items-center rounded-lg text-[10px] font-black ${
          rank <= 3
            ? "bg-amber-400/10 text-amber-300"
            : "bg-xsurface text-xmuted"
        }`}
      >
        {rank}
      </span>
      <div className="flex min-w-0 items-center gap-2.5">
        <TraderAvatar
          name={result.member?.full_name || result.member?.username || "Trader"}
          value={result.member?.avatar_url}
          className="size-8 shrink-0 rounded-lg text-[9px]"
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[11px] font-semibold text-zinc-200">
              @{result.member?.username || "trader"}
            </p>
            {result.member?.is_verified ? (
              <VerifiedBadge className="size-3.5" />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[9px] text-xmuted">
            {result.accountName}
            {expanded
              ? ` · ${result.trades} trades · ${result.winRate}% WR`
              : result.firm
                ? ` · ${result.firm}`
                : ""}
          </p>
        </div>
      </div>
      <div className="min-w-[72px] text-right">
        <p
          className={`text-[12px] font-bold tabular-nums ${
            result.pnlPercent >= 0 ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {result.pnlPercent >= 0 ? "+" : ""}
          {result.pnlPercent}%
        </p>
        <p className="mt-0.5 text-[8px] tabular-nums text-xmuted">
          {result.dollarPnl === null
            ? `${result.winRate}% WR`
            : money.format(result.dollarPnl)}
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
  onChange: (
    value: Record<string, { enabled: boolean; showDollarPnl: boolean }>,
  ) => void;
  onSave: () => void;
}) {
  return (
    <section className={`${PANEL} flex min-h-0 flex-col overflow-hidden`}>
      <div className="border-b border-xborder p-3.5">
        <SectionHeading
          title="Share accounts"
          description="Choose what this community can see"
          action={<WalletCards size={15} className="text-xmuted" />}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 xl:max-h-[385px]">
        {accounts.map((account) => {
          const value = draft[account.id] ?? {
            enabled: false,
            showDollarPnl: false,
          };
          return (
            <div
              key={account.id}
              className="rounded-xl border border-xborder bg-xpanel p-2.5 transition hover:border-xborder-strong"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      [account.id]: { ...value, enabled: !value.enabled },
                    })
                  }
                  className={`grid size-5 place-items-center rounded-md border transition ${
                    value.enabled
                      ? "border-white bg-white text-black"
                      : "border-xborder text-transparent hover:border-xborder-strong"
                  }`}
                  aria-label={`Share ${account.name}`}
                >
                  <Check size={12} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-zinc-200">
                    {account.name}
                  </p>
                  <p className="mt-0.5 truncate text-[8px] text-xmuted">
                    {account.firm || "Independent"}
                  </p>
                </div>
                <span
                  className={`size-2 rounded-full ${
                    value.enabled ? "bg-emerald-400" : "bg-zinc-800"
                  }`}
                />
              </div>
              {value.enabled ? (
                <label className="mt-2.5 flex items-center justify-between border-t border-xborder pt-2 text-[9px] text-xmuted">
                  Show dollar P&amp;L
                  <input
                    type="checkbox"
                    checked={value.showDollarPnl}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        [account.id]: {
                          ...value,
                          showDollarPnl: event.target.checked,
                        },
                      })
                    }
                    className="size-3.5 accent-white"
                  />
                </label>
              ) : null}
            </div>
          );
        })}
        {!accounts.length ? (
          <p className="py-8 text-center text-[10px] text-xmuted">
            No trading accounts found.
          </p>
        ) : null}
      </div>
      {accounts.length ? (
        <div className="sticky bottom-0 border-t border-xborder bg-xsurface/95 p-3 backdrop-blur">
          <Button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="h-8 w-full rounded-lg text-[10px] font-bold"
          >
            {busy ? <Spinner className="size-3.5" /> : <Check size={13} />}
            Save sharing
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-3 p-3 pb-24 sm:p-4 lg:p-5">
      <div className="h-20 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-xborder bg-xpanel"
          />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
        <div className="h-72 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
      </div>
    </div>
  );
}

export function CommunityDetailPremium({
  communityId,
  activeTab,
}: {
  communityId: string;
  activeTab: CommunitySection;
}) {
  const router = useRouter();
  const cached = getCachedCommunityDetail<DetailData>(communityId);
  const [data, setData] = useState<DetailData | null>(() => cached);
  const [loading, setLoading] = useState(() => !cached);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [shareDraft, setShareDraft] = useState<
    Record<string, { enabled: boolean; showDollarPnl: boolean }>
  >({});

  const applyData = useCallback((response: DetailData) => {
    setData(response);
    const shared = new Map(
      (response.shares ?? []).map((share) => [share.prop_account_id, share]),
    );
    setShareDraft(
      Object.fromEntries(
        (response.accounts ?? []).map((account) => [
          account.id,
          {
            enabled: shared.has(account.id),
            showDollarPnl: Boolean(
              shared.get(account.id)?.show_dollar_pnl,
            ),
          },
        ]),
      ),
    );
  }, []);

  const load = useCallback(
    async (force = false) => {
      const current = getCachedCommunityDetail<DetailData>(communityId);
      if (current) {
        applyData(current);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const response = await fetchCommunityDetail<DetailData>({
          communityId,
          force,
        });
        applyData(response);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Community could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    },
    [applyData, communityId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const navigate = (tab: CommunitySection) => {
    router.push(`/community/${encodeURIComponent(communityId)}/${tab}`);
  };

  const prefetch = (tab: CommunitySection) => {
    router.prefetch(`/community/${encodeURIComponent(communityId)}/${tab}`);
  };

  const saveShares = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/communities/${encodeURIComponent(communityId)}`, {
        method: "POST",
        body: JSON.stringify({
          action: "save_shares",
          shares: Object.entries(shareDraft).map(([accountId, value]) => ({
            accountId,
            ...value,
          })),
        }),
      });
      markCommunityDetailStale(communityId);
      await load(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Sharing settings could not be saved.",
      );
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
        body: JSON.stringify({
          action: "invite",
          userIds: selectedFollowers,
        }),
      });
      setSelectedFollowers([]);
      markCommunityDetailStale(communityId);
      markCommunityHubStale();
      await load(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Members could not be invited.",
      );
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    const results = data?.results ?? [];
    const trades = results.reduce((total, result) => total + result.trades, 0);
    const decidedResults = results.filter(
      (result) => result.wins + result.losses > 0,
    );
    const avgWinRate = decidedResults.length
      ? Math.round(
          decidedResults.reduce(
            (total, result) => total + result.winRate,
            0,
          ) / decidedResults.length,
        )
      : 0;
    const pnlPercent = Number(
      results
        .reduce((total, result) => total + result.pnlPercent, 0)
        .toFixed(2),
    );
    return {
      members: (data?.members ?? []).filter(
        (member) => member.status === "active",
      ).length,
      sharedAccounts: results.length,
      trades,
      avgWinRate,
      pnlPercent,
    };
  }, [data]);

  const leaderboard = useMemo(
    () =>
      [...(data?.results ?? [])].sort(
        (left, right) =>
          right.pnlPercent - left.pnlPercent || right.winRate - left.winRate,
      ),
    [data],
  );

  if (loading && !data) return <DetailSkeleton />;

  if (!data) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-xl place-items-center p-4 text-center">
        <div className={`${PANEL} p-5`}>
          <h1 className="text-base font-bold text-white">
            Community unavailable
          </h1>
          <p className="mt-1 text-[11px] leading-5 text-xmuted">
            {error ||
              "The community may have been removed or your invitation is not active."}
          </p>
          <Button
            type="button"
            onClick={() => router.push("/community")}
            className="mt-4 h-8 rounded-lg text-[10px]"
          >
            <ArrowLeft size={13} /> My communities
          </Button>
        </div>
      </div>
    );
  }

  const community = data.community;
  const activeMembers = data.members.filter(
    (member) => member.status === "active",
  );
  const mobileNav: Array<{
    id: CommunitySection;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "leaderboard", label: "Leaders", icon: Trophy },
    { id: "members", label: "Members", icon: UsersRound },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-3 p-3 pb-24 sm:p-4 lg:p-5">
      <header className={`${PANEL} overflow-hidden`}>
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/community")}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-xborder bg-xpanel text-xmuted transition hover:text-white lg:hidden"
              aria-label="Back to communities"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="relative shrink-0">
              <TraderAvatar
                name={community.name}
                value={community.avatar_url || community.owner?.avatar_url}
                className="size-10 rounded-xl border border-xborder text-xs"
              />
              <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-xsurface bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-[15px] font-bold tracking-[-0.025em] text-white sm:text-base">
                  {community.name}
                </h1>
                <ShieldCheck
                  size={14}
                  className="shrink-0 text-emerald-300"
                />
              </div>
              <p className="mt-0.5 truncate text-[9px] capitalize text-xmuted">
                {data.role} · {activeMembers.length} members
              </p>
            </div>
          </div>
          <p className="line-clamp-2 max-w-xl text-[10px] leading-[17px] text-xmuted sm:text-right">
            {community.description ||
              "Private community performance workspace."}
          </p>
        </div>
      </header>

      <nav className="grid grid-cols-5 gap-1 rounded-xl border border-xborder bg-xcanvas p-1 lg:hidden">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const selected = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => prefetch(item.id)}
              onFocus={() => prefetch(item.id)}
              onClick={() => navigate(item.id)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[8px] font-semibold transition ${
                selected ? "bg-xpanel text-white" : "text-xmuted"
              }`}
            >
              <Icon size={13} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-[10px] text-rose-200">
          {error}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <StatCard
              label="Members"
              value={String(stats.members)}
              icon={UsersRound}
            />
            <StatCard
              label="Shared accounts"
              value={String(stats.sharedAccounts)}
              icon={WalletCards}
            />
            <StatCard
              label="Trades"
              value={String(stats.trades)}
              icon={Activity}
            />
            <StatCard
              label="Avg win rate"
              value={`${stats.avgWinRate}%`}
              icon={Target}
              tone="warning"
            />
            <StatCard
              label="Combined return"
              value={`${stats.pnlPercent >= 0 ? "+" : ""}${stats.pnlPercent}%`}
              icon={BarChart3}
              tone={stats.pnlPercent >= 0 ? "positive" : "neutral"}
            />
          </section>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,.82fr)]">
            <section className={`${PANEL} p-3.5`}>
              <SectionHeading
                title="Top performance"
                description="Best shared accounts by return"
                action={<Trophy size={15} className="text-amber-400/70" />}
              />
              <div className="mt-3 space-y-1.5">
                {leaderboard.slice(0, 5).map((result, index) => (
                  <ResultRow
                    key={result.accountId}
                    result={result}
                    rank={index + 1}
                  />
                ))}
                {!leaderboard.length ? (
                  <p className="py-8 text-center text-[10px] text-xmuted">
                    No shared results yet.
                  </p>
                ) : null}
              </div>
            </section>
            <AccountSharing
              accounts={data.accounts}
              draft={shareDraft}
              busy={busy}
              onChange={setShareDraft}
              onSave={() => void saveShares()}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard
              label="Total trades"
              value={String(stats.trades)}
              icon={Activity}
            />
            <StatCard
              label="Average win rate"
              value={`${stats.avgWinRate}%`}
              icon={Target}
              tone="warning"
            />
            <StatCard
              label="Positive accounts"
              value={String(
                leaderboard.filter((item) => item.pnlPercent > 0).length,
              )}
              icon={WalletCards}
            />
            <StatCard
              label="Combined return"
              value={`${stats.pnlPercent >= 0 ? "+" : ""}${stats.pnlPercent}%`}
              icon={BarChart3}
              tone={stats.pnlPercent >= 0 ? "positive" : "neutral"}
            />
          </section>
          <section className={`${PANEL} p-3.5`}>
            <SectionHeading
              title="Account analytics"
              description="Compact comparison of all shared accounts"
            />
            <div className="mt-3 overflow-x-auto rounded-xl border border-xborder">
              <table className="w-full min-w-[680px] text-left text-[10px]">
                <thead className="bg-xpanel text-[8px] uppercase tracking-[0.12em] text-xmuted">
                  <tr className="border-b border-xborder">
                    <th className="px-3 py-2.5 font-semibold">Trader</th>
                    <th className="px-3 py-2.5 font-semibold">Account</th>
                    <th className="px-3 py-2.5 font-semibold">Trades</th>
                    <th className="px-3 py-2.5 font-semibold">W / L</th>
                    <th className="px-3 py-2.5 font-semibold">Win rate</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Return
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((result) => (
                    <tr
                      key={result.accountId}
                      className="border-b border-xborder transition last:border-0 hover:bg-xpanel"
                    >
                      <td className="px-3 py-2.5 text-zinc-300">
                        @{result.member?.username || "trader"}
                      </td>
                      <td className="px-3 py-2.5 text-xmuted">
                        {result.accountName}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-xmuted">
                        {result.trades}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-xmuted">
                        {result.wins} / {result.losses}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-300">
                        {result.winRate}%
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold tabular-nums ${
                          result.pnlPercent >= 0
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }`}
                      >
                        {result.pnlPercent >= 0 ? "+" : ""}
                        {result.pnlPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!leaderboard.length ? (
                <p className="py-10 text-center text-[10px] text-xmuted">
                  No analytics data yet.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "leaderboard" ? (
        <section className={`${PANEL} p-3.5`}>
          <SectionHeading
            title="Leaderboard"
            description="Ranked by shared account return"
            action={<Crown size={15} className="text-amber-400/70" />}
          />
          <div className="mt-3 grid gap-1.5 lg:grid-cols-2">
            {leaderboard.map((result, index) => (
              <ResultRow
                key={result.accountId}
                result={result}
                rank={index + 1}
                expanded
              />
            ))}
            {!leaderboard.length ? (
              <p className="col-span-full py-10 text-center text-[10px] text-xmuted">
                No ranked accounts yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "members" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${PANEL} p-3.5`}>
            <SectionHeading
              title="Members"
              description={`${activeMembers.length} accepted members`}
              action={<UsersRound size={15} className="text-xmuted" />}
            />
            <div className="mt-3 divide-y divide-xborder">
              {data.members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="relative shrink-0">
                    <TraderAvatar
                      name={
                        member.profile?.full_name ||
                        member.profile?.username ||
                        "Member"
                      }
                      value={member.profile?.avatar_url}
                      className="size-8 rounded-lg text-[9px]"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-xsurface ${
                        member.status === "active"
                          ? "bg-emerald-400"
                          : "bg-amber-400"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-[11px] font-semibold text-zinc-200">
                        {member.profile?.full_name ||
                          member.profile?.username ||
                          "Member"}
                      </p>
                      {member.profile?.is_verified ? (
                        <VerifiedBadge className="size-3.5" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[8px] text-xmuted">
                      @{member.profile?.username || "member"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] capitalize text-zinc-400">
                      {member.role}
                    </p>
                    <p
                      className={`mt-0.5 text-[8px] capitalize ${
                        member.status === "active"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {member.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {data.isOwner ? (
            <section className={`${PANEL} p-3.5`}>
              <SectionHeading
                title="Invite followers"
                description="Select followers, then send invitations"
                action={<UserPlus size={15} className="text-xmuted" />}
              />
              <div className="mt-3 max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {data.followers.map((profile) => {
                  const selected = selectedFollowers.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() =>
                        setSelectedFollowers((current) =>
                          selected
                            ? current.filter((id) => id !== profile.id)
                            : [...current, profile.id],
                        )
                      }
                      className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition ${
                        selected
                          ? "border-xborder-strong bg-xraised"
                          : "border-xborder bg-xpanel hover:border-xborder-strong"
                      }`}
                    >
                      <TraderAvatar
                        name={profile.full_name || profile.username}
                        value={profile.avatar_url}
                        className="size-7 rounded-lg text-[8px]"
                      />
                      <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-300">
                        @{profile.username}
                      </span>
                      <span
                        className={`grid size-5 place-items-center rounded-md border ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-xborder text-transparent"
                        }`}
                      >
                        <Check size={12} />
                      </span>
                    </button>
                  );
                })}
                {!data.followers.length ? (
                  <p className="py-8 text-center text-[10px] text-xmuted">
                    No eligible followers.
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                disabled={busy || !selectedFollowers.length}
                onClick={() => void invite()}
                className="mt-3 h-8 w-full rounded-lg text-[10px] font-bold"
              >
                {busy ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <UserPlus size={13} />
                )}
                Invite {selectedFollowers.length || ""}
              </Button>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
