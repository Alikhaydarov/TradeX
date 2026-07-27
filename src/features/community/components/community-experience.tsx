"use client";

import { navigateApp } from "@/lib/app-navigation";

import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  Crown,
  LayoutDashboard,
  Mail,
  Plus,
  ShieldCheck,
  Trophy,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { TraderAvatar } from "@/components/trader-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
  accent: string;
  role: string;
  memberCount: number;
  owner: Profile | null;
};

type HubData = {
  communities: CommunityCard[];
  invitations: CommunityCard[];
  canCreate: boolean;
  plan: "free" | "standard" | "pro";
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

const CARD = "rounded-xl border border-white/8 bg-[#070707]";
const MUTED = "text-[11px] text-zinc-500";

function go(path: string) {
  navigateApp(path);
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${CARD} grid min-h-48 place-items-center px-4 text-center`}>
      <div>
        <UsersRound className="mx-auto text-zinc-700" size={28} />
        <p className="mt-3 text-sm font-bold text-zinc-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-600">
          {text}
        </p>
      </div>
    </div>
  );
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
        <h2 className="truncate text-sm font-bold text-white">{title}</h2>
        {description ? <p className="mt-0.5 text-[10px] text-zinc-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CommunityHub() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"communities" | "invitations">("communities");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<HubData>("/api/communities");
      setData(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Communities could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (busy || name.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ community: CommunityCard }>("/api/communities", {
        method: "POST",
        body: JSON.stringify({ action: "create", name, description }),
      });
      window.dispatchEvent(new Event("tradox:community-membership-changed"));
      go(`/community/${response.community.id}/overview`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Community could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const respond = async (communityId: string, decision: "accept" | "decline") => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/communities", {
        method: "POST",
        body: JSON.stringify({ action: "respond_invite", communityId, decision }),
      });
      window.dispatchEvent(new Event("tradox:community-membership-changed"));
      await load();
      if (decision === "accept") go(`/community/${communityId}/overview`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Invitation could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[70dvh] place-items-center">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  const communities = data?.communities ?? [];
  const invitations = data?.invitations ?? [];

  return (
    <div className="mx-auto max-w-[1240px] space-y-3 p-3 pb-20 sm:p-4 lg:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
            Social workspace
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl">
            Communities
          </h1>
          <p className="mt-1 text-xs text-zinc-600">
            Private desks, shared performance and member accountability.
          </p>
        </div>
        {data?.canCreate ? (
          <Button
            type="button"
            onClick={() => setCreateOpen((current) => !current)}
            className="h-9 rounded-lg bg-white px-3 text-xs font-bold text-black hover:bg-zinc-200"
          >
            {createOpen ? <X size={15} /> : <Plus size={15} />}
            {createOpen ? "Close" : "Create community"}
          </Button>
        ) : null}
      </header>

      <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-[#050505] p-1">
        <button
          type="button"
          onClick={() => setTab("communities")}
          className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
            tab === "communities" ? "bg-[#111] text-white" : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          <UsersRound size={14} /> My communities
          <span className="rounded-md bg-white/[.06] px-1.5 py-0.5 text-[9px]">{communities.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("invitations")}
          className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
            tab === "invitations" ? "bg-[#111] text-white" : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          <Mail size={14} /> Invitations
          {invitations.length ? (
            <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] text-amber-300">
              {invitations.length}
            </span>
          ) : null}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {createOpen ? (
        <section className={`${CARD} grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(260px,.65fr)] sm:p-4`}>
          <div>
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-300" />
              <h2 className="text-sm font-bold text-white">Create your Pro community</h2>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-600">
              One private community per owner. Accepted members can join the workspace and share selected results.
            </p>
          </div>
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Community name"
              maxLength={60}
              className="h-9 border-white/10 bg-[#0b0b0b] text-xs"
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description"
              maxLength={280}
              className="min-h-20 border-white/10 bg-[#0b0b0b] text-xs"
            />
            <Button
              type="button"
              onClick={() => void create()}
              disabled={busy || name.trim().length < 3}
              className="h-9 w-full bg-white text-xs font-bold text-black hover:bg-zinc-200"
            >
              {busy ? <Spinner className="size-4" /> : <Plus size={14} />} Create
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "communities" ? (
        communities.length ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {communities.map((community) => (
              <button
                key={community.id}
                type="button"
                onClick={() => go(`/community/${community.id}/overview`)}
                className={`${CARD} group min-h-44 p-3 text-left transition hover:border-white/16 hover:bg-[#0a0a0a]`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#111] text-zinc-300">
                    <UsersRound size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-sm font-bold text-white">{community.name}</h2>
                      <ShieldCheck size={13} className="shrink-0 text-zinc-500" />
                    </div>
                    <p className="mt-0.5 text-[10px] capitalize text-zinc-600">{community.role}</p>
                  </div>
                  <ArrowUpRight size={15} className="text-zinc-700 transition group-hover:text-zinc-300" />
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-500">
                  {community.description || "Private trading community."}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
                  <div className="flex items-center gap-2">
                    <TraderAvatar
                      src={community.owner?.avatar_url}
                      name={community.owner?.full_name || community.name}
                      className="size-6"
                    />
                    <span className="max-w-28 truncate text-[10px] text-zinc-500">
                      @{community.owner?.username || "owner"}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500">
                    {community.memberCount} members
                  </span>
                </div>
              </button>
            ))}
          </section>
        ) : (
          <EmptyState
            title="No communities yet"
            text={
              data?.plan === "pro"
                ? "Create a community or accept an invitation."
                : "Accepted invitations will appear here. Pro members can also create a private community."
            }
          />
        )
      ) : invitations.length ? (
        <section className="space-y-2">
          {invitations.map((community) => (
            <article key={community.id} className={`${CARD} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#111]">
                  <Mail size={17} className="text-zinc-300" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-sm font-bold text-white">{community.name}</h2>
                    <ShieldCheck size={13} className="text-zinc-500" />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-600">
                    {community.description || "You were invited to this private community."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void respond(community.id, "decline")}
                  className="h-8 flex-1 border-white/10 bg-[#080808] px-3 text-[11px] sm:flex-none"
                >
                  Decline
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(community.id, "accept")}
                  className="h-8 flex-1 bg-white px-3 text-[11px] font-bold text-black hover:bg-zinc-200 sm:flex-none"
                >
                  <Check size={13} /> Accept
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState title="No invitations" text="New community invitations will appear here." />
      )}
    </div>
  );
}

export function CommunityDetail({
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
            {
              enabled: shared.has(account.id),
              showDollarPnl: Boolean(shared.get(account.id)?.show_dollar_pnl),
            },
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

  const navigate = (tab: CommunitySection) => go(`/community/${communityId}/${tab}`);

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
    const decidedResults = results.filter((result) => result.wins + result.losses > 0);
    const avgWinRate = decidedResults.length
      ? Math.round(decidedResults.reduce((total, result) => total + result.winRate, 0) / decidedResults.length)
      : 0;
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
    return (
      <div className="grid min-h-[70dvh] place-items-center">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto grid min-h-[70dvh] max-w-xl place-items-center p-4 text-center">
        <div className={`${CARD} p-5`}>
          <h1 className="text-base font-bold text-white">Community unavailable</h1>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{error || "The community may have been removed or your invitation is not active."}</p>
          <Button type="button" onClick={() => go("/community")} className="mt-4 h-8 text-xs">
            <ArrowLeft size={14} /> My communities
          </Button>
        </div>
      </div>
    );
  }

  const community = data.community;
  const activeMembers = data.members.filter((member) => member.status === "active");

  return (
    <div className="mx-auto max-w-[1320px] space-y-3 p-3 pb-20 sm:p-4 lg:p-5">
      <header className={`${CARD} flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => go("/community")}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#0b0b0b] text-zinc-500 transition hover:text-white lg:hidden"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#111] text-zinc-200">
            <UsersRound size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-base font-bold text-white sm:text-lg">{community.name}</h1>
              <ShieldCheck size={14} className="shrink-0 text-zinc-500" />
            </div>
            <p className="mt-0.5 truncate text-[10px] capitalize text-zinc-600">
              {data.role} · {activeMembers.length} members
            </p>
          </div>
        </div>
        <p className="line-clamp-2 max-w-xl text-[11px] leading-5 text-zinc-600 sm:text-right">
          {community.description || "Private community performance workspace."}
        </p>
      </header>

      <nav className="grid grid-cols-4 gap-1 rounded-xl border border-white/8 bg-[#050505] p-1 lg:hidden">
        {[
          ["overview", "Overview", LayoutDashboard],
          ["analytics", "Analytics", BarChart3],
          ["leaderboard", "Leaders", Trophy],
          ["members", "Members", UsersRound],
        ].map(([id, label, Icon]) => {
          const selected = activeTab === id;
          const IconComponent = Icon as typeof LayoutDashboard;
          return (
            <button
              key={String(id)}
              type="button"
              onClick={() => navigate(id as CommunitySection)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[9px] font-semibold transition ${
                selected ? "bg-[#111] text-white" : "text-zinc-600"
              }`}
            >
              <IconComponent size={14} />
              <span className="truncate">{String(label)}</span>
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {[
              ["Members", String(stats.members)],
              ["Shared accounts", String(stats.sharedAccounts)],
              ["Trades", String(stats.trades)],
              ["Avg win rate", `${stats.avgWinRate}%`],
              ["Combined return", `${stats.pnlPercent >= 0 ? "+" : ""}${stats.pnlPercent}%`],
            ].map(([label, value]) => (
              <div key={label} className={`${CARD} p-3`}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-700">{label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
            <section className={`${CARD} p-3`}>
              <SectionTitle title="Top performance" description="Best shared accounts by return" />
              <div className="mt-3 space-y-1.5">
                {leaderboard.slice(0, 5).map((result, index) => (
                  <ResultRow key={result.accountId} result={result} rank={index + 1} />
                ))}
                {!leaderboard.length ? <p className="py-8 text-center text-xs text-zinc-600">No shared results yet.</p> : null}
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
            {[
              ["Total trades", stats.trades],
              ["Average win rate", `${stats.avgWinRate}%`],
              ["Positive accounts", leaderboard.filter((item) => item.pnlPercent > 0).length],
              ["Combined return", `${stats.pnlPercent >= 0 ? "+" : ""}${stats.pnlPercent}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className={`${CARD} p-3`}>
                <p className="text-[9px] uppercase tracking-[0.13em] text-zinc-700">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
              </div>
            ))}
          </section>
          <section className={`${CARD} p-3`}>
            <SectionTitle title="Account analytics" description="Compact comparison of all shared accounts" />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                  <tr className="border-b border-white/8">
                    <th className="px-2 py-2 font-semibold">Trader</th>
                    <th className="px-2 py-2 font-semibold">Account</th>
                    <th className="px-2 py-2 font-semibold">Trades</th>
                    <th className="px-2 py-2 font-semibold">W / L</th>
                    <th className="px-2 py-2 font-semibold">Win rate</th>
                    <th className="px-2 py-2 text-right font-semibold">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((result) => (
                    <tr key={result.accountId} className="border-b border-white/6 last:border-0">
                      <td className="px-2 py-2.5 text-zinc-300">@{result.member?.username || "trader"}</td>
                      <td className="px-2 py-2.5 text-zinc-400">{result.accountName}</td>
                      <td className="px-2 py-2.5 tabular-nums text-zinc-400">{result.trades}</td>
                      <td className="px-2 py-2.5 tabular-nums text-zinc-400">{result.wins} / {result.losses}</td>
                      <td className="px-2 py-2.5 tabular-nums text-zinc-300">{result.winRate}%</td>
                      <td className={`px-2 py-2.5 text-right font-bold tabular-nums ${result.pnlPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {result.pnlPercent >= 0 ? "+" : ""}{result.pnlPercent}%
                      </td>
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
        <section className={`${CARD} p-3`}>
          <SectionTitle title="Leaderboard" description="Ranked by shared account return" />
          <div className="mt-3 space-y-1.5">
            {leaderboard.map((result, index) => (
              <ResultRow key={result.accountId} result={result} rank={index + 1} expanded />
            ))}
            {!leaderboard.length ? <p className="py-10 text-center text-xs text-zinc-600">No ranked accounts yet.</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "members" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${CARD} p-3`}>
            <SectionTitle title="Members" description={`${activeMembers.length} accepted members`} />
            <div className="mt-3 divide-y divide-white/7">
              {data.members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <TraderAvatar
                    src={member.profile?.avatar_url}
                    name={member.profile?.full_name || member.profile?.username || "Member"}
                    className="size-8"
                  />
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
            <section className={`${CARD} p-3`}>
              <SectionTitle title="Invite followers" description="Select followers, then send invitations" action={<UserPlus size={16} className="text-zinc-600" />} />
              <div className="mt-3 max-h-[360px] space-y-1 overflow-y-auto pr-1">
                {data.followers.map((profile) => {
                  const selected = selectedFollowers.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedFollowers((current) => selected ? current.filter((id) => id !== profile.id) : [...current, profile.id])}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${selected ? "border-white/16 bg-white/[.06]" : "border-white/6 bg-[#050505] hover:border-white/12"}`}
                    >
                      <TraderAvatar src={profile.avatar_url} name={profile.full_name || profile.username} className="size-7" />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">@{profile.username}</span>
                      <span className={`grid size-5 place-items-center rounded-md border ${selected ? "border-white bg-white text-black" : "border-white/10 text-transparent"}`}><Check size={12} /></span>
                    </button>
                  );
                })}
                {!data.followers.length ? <p className="py-8 text-center text-xs text-zinc-600">No eligible followers.</p> : null}
              </div>
              <Button
                type="button"
                disabled={busy || !selectedFollowers.length}
                onClick={() => void invite()}
                className="mt-3 h-9 w-full bg-white text-xs font-bold text-black hover:bg-zinc-200"
              >
                {busy ? <Spinner className="size-4" /> : <UserPlus size={14} />} Invite {selectedFollowers.length || ""}
              </Button>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultRow({ result, rank, expanded = false }: { result: Result; rank: number; expanded?: boolean }) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/7 bg-[#050505] px-2.5 py-2.5">
      <span className={`grid size-7 place-items-center rounded-lg text-[10px] font-bold ${rank <= 3 ? "bg-amber-400/10 text-amber-300" : "bg-white/[.04] text-zinc-600"}`}>
        {rank}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <TraderAvatar
          src={result.member?.avatar_url}
          name={result.member?.full_name || result.member?.username || "Trader"}
          className="size-7 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-zinc-200">
            @{result.member?.username || "trader"}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-zinc-600">
            {result.accountName}{expanded ? ` · ${result.trades} trades · ${result.winRate}% WR` : ""}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs font-bold tabular-nums ${result.pnlPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
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
    <section className={`${CARD} p-3`}>
      <SectionTitle title="Share accounts" description="Choose what this community can see" />
      <div className="mt-3 space-y-2">
        {accounts.map((account) => {
          const value = draft[account.id] ?? { enabled: false, showDollarPnl: false };
          return (
            <div key={account.id} className="rounded-lg border border-white/7 bg-[#050505] p-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...draft, [account.id]: { ...value, enabled: !value.enabled } })}
                  className={`grid size-5 place-items-center rounded-md border ${value.enabled ? "border-white bg-white text-black" : "border-white/10 text-transparent"}`}
                >
                  <Check size={12} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-zinc-200">{account.name}</p>
                  <p className="mt-0.5 truncate text-[9px] text-zinc-600">{account.firm || "Independent"}</p>
                </div>
              </div>
              {value.enabled ? (
                <label className="mt-2 flex items-center justify-between border-t border-white/7 pt-2 text-[10px] text-zinc-500">
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
        {!accounts.length ? <p className="py-8 text-center text-xs text-zinc-600">No trading accounts found.</p> : null}
      </div>
      {accounts.length ? (
        <Button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="mt-3 h-9 w-full bg-white text-xs font-bold text-black hover:bg-zinc-200"
        >
          {busy ? <Spinner className="size-4" /> : <Check size={14} />} Save sharing
        </Button>
      ) : null}
    </section>
  );
}
