"use client";

import {
  BarChart3,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { TraderAvatar } from "./trader-avatar";
import { VerifiedBadge } from "./verified-badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Spinner } from "./ui/spinner";

type CommunityProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
};

type CommunityData = {
  community: null | {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    description: string;
    accent: "emerald" | "sky" | "amber" | "rose";
    status: string;
  };
  canCreate: boolean;
  isOwner?: boolean;
  members?: Array<{
    user_id: string;
    role: string;
    status: string;
    profile: CommunityProfile | null;
  }>;
  followers?: CommunityProfile[];
  accounts?: Array<{
    id: string;
    name: string;
    firm: string;
    account_size: number;
    initial_balance: number;
  }>;
  shares?: Array<{ prop_account_id: string; show_dollar_pnl: boolean }>;
  results?: Array<{
    accountId: string;
    accountName: string;
    firm: string;
    member: CommunityProfile | null;
    trades: number;
    winRate: number;
    pnlPercent: number;
    dollarPnl: number | null;
  }>;
};

const communityTone = {
  soft: "border-white/10 bg-white/[.06] text-white",
  glow: "shadow-black/50",
};

type CommunityTab = "overview" | "members" | "settings";

export function CommunityWorkspace() {
  const [data, setData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("overview");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [shareDraft, setShareDraft] = useState<
    Record<string, { enabled: boolean; showDollarPnl: boolean }>
  >({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<CommunityData>("/api/community");
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
              showDollarPnl: Boolean(shared.get(account.id)?.show_dollar_pnl),
            },
          ]),
        ),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Community could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/community", {
        method: "POST",
        body: JSON.stringify({ action: "create", name, description }),
      });
      await load();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Community could not be created.",
      );
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!selectedFollowers.length) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/community", {
        method: "POST",
        body: JSON.stringify({ action: "invite", userIds: selectedFollowers }),
      });
      setSelectedFollowers([]);
      await load();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Members could not be added.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveShares = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/community", {
        method: "POST",
        body: JSON.stringify({
          action: "save_shares",
          shares: Object.entries(shareDraft).map(([accountId, value]) => ({
            accountId,
            ...value,
          })),
        }),
      });
      await load();
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

  if (loading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Spinner className="size-7 text-zinc-500" />
      </div>
    );
  if (!data?.community)
    return (
      <CreateCommunity
        canCreate={Boolean(data?.canCreate)}
        name={name}
        description={description}
        busy={busy}
        error={error}
        onName={setName}
        onDescription={setDescription}
        onCreate={create}
      />
    );

  const community = data.community;
  const colors = communityTone;
  const activeMembers = (data.members ?? []).filter(
    (member) => member.status === "active",
  );
  const sharedAccounts = (data.shares ?? []).length;
  const nav: Array<{
    id: CommunityTab;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "members", label: "Members", icon: UsersRound },
    { id: "settings", label: "Sharing", icon: Settings2 },
  ];

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#030303] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_75%_0%,rgba(255,255,255,.07),transparent_34%),linear-gradient(180deg,#090909,#030303)] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 sm:size-12 ${colors.soft} shadow-xl ${colors.glow}`}
          >
            <UsersRound size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-black tracking-tight sm:text-2xl">
                {community.name}
              </h1>
              <ShieldCheck size={16} className="shrink-0 text-white" />
            </div>
            <p className="mt-1 truncate text-[11px] text-zinc-500 sm:text-xs">
              {activeMembers.length} members · Private trading desk
            </p>
          </div>
          {data.isOwner ? (
            <Button
              onClick={() => setActiveTab("members")}
              className="hidden rounded-xl sm:inline-flex"
            >
              <UserPlus size={15} /> Invite
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_260px]">
        <aside className="hidden border-r border-white/8 p-4 lg:block">
          <p className="mb-3 px-2 text-[9px] font-black uppercase tracking-[.2em] text-zinc-600">
            Community desk
          </p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${activeTab === item.id ? "bg-white text-black" : "text-zinc-500 hover:bg-white/[.04] hover:text-white"}`}
              >
                <item.icon size={16} />
                {item.label}
                <ChevronRight size={13} className="ml-auto" />
              </button>
            ))}
          </nav>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Coming next
            </p>
            <p className="mt-2 text-xs font-bold text-zinc-300">
              Live Desk & Trade Ideas
            </p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-600">
              Structured setups, bias and community sessions.
            </p>
          </div>
        </aside>

        <main className="min-w-0 p-3 sm:p-5 lg:p-6">
          <div className="mb-4 hidden gap-1 overflow-x-auto rounded-xl border border-white/8 bg-[#080808] p-1 md:flex lg:hidden">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${activeTab === item.id ? "bg-white text-black" : "text-zinc-500"}`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
          {error ? (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-zinc-200">
              {error}
            </div>
          ) : null}
          {activeTab === "overview" ? (
            <Overview
              community={community}
              members={activeMembers.length}
              sharedAccounts={sharedAccounts}
              results={data.results ?? []}
              colors={colors}
            />
          ) : null}
          {activeTab === "members" ? (
            <Members
              members={data.members ?? []}
              followers={data.followers ?? []}
              isOwner={Boolean(data.isOwner)}
              selected={selectedFollowers}
              busy={busy}
              onToggle={(id) =>
                setSelectedFollowers((current) =>
                  current.includes(id)
                    ? current.filter((item) => item !== id)
                    : [...current, id],
                )
              }
              onInvite={invite}
            />
          ) : null}
          {activeTab === "settings" ? (
            <Sharing
              accounts={data.accounts ?? []}
              draft={shareDraft}
              busy={busy}
              onChange={setShareDraft}
              onSave={saveShares}
            />
          ) : null}
        </main>

        <aside className="hidden border-l border-white/8 p-5 xl:block">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-600">
            Trading room
          </p>
          <div className="mt-4 space-y-3">
            <ContextStat
              icon={UsersRound}
              label="Active members"
              value={String(activeMembers.length)}
            />
            <ContextStat
              icon={TrendingUp}
              label="Shared accounts"
              value={String(sharedAccounts)}
            />
            <ContextStat
              icon={MessageSquareText}
              label="Desk status"
              value="Building"
            />
          </div>
          <div className="mt-6 border-t border-white/8 pt-5">
            <p className="text-xs font-black">Community principles</p>
            <p className="mt-2 text-[11px] leading-5 text-zinc-600">
              Share process, protect privacy and measure consistency before P&L.
            </p>
          </div>
        </aside>
      </div>
      <nav
        className="fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-[80] grid grid-cols-3 rounded-2xl border border-white/10 bg-black/92 p-1.5 shadow-[0_20px_70px_rgba(0,0,0,.75)] backdrop-blur-2xl md:hidden"
        aria-label="Community navigation"
      >
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition ${activeTab === item.id ? "bg-white text-black" : "text-zinc-500 active:bg-white/[.06]"}`}
            aria-current={activeTab === item.id ? "page" : undefined}
          >
            <item.icon size={16} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function CreateCommunity(p: {
  canCreate: boolean;
  name: string;
  description: string;
  busy: boolean;
  error: string | null;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.07),transparent_38%),#030303] px-3 py-5 sm:px-5 sm:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-white/10 bg-[#090909] p-5 shadow-2xl sm:rounded-[28px] sm:p-8">
          <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-white sm:size-12">
            <Sparkles size={21} />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.22em] text-zinc-400">
            Pro community
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Build your trading desk.
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Bring followers together, share selected results and create a
            focused accountability room.
          </p>
          {p.error ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-zinc-200">
              {p.error}
            </div>
          ) : null}
          {p.canCreate ? (
            <div className="mt-6 space-y-4 sm:mt-7">
              <Input
                value={p.name}
                onChange={(event) => p.onName(event.target.value)}
                placeholder="Community name"
                className="h-12 rounded-xl"
                maxLength={60}
              />
              <Textarea
                value={p.description}
                onChange={(event) => p.onDescription(event.target.value)}
                placeholder="What kind of traders is this community for?"
                className="min-h-24 rounded-xl"
                maxLength={280}
              />
              <Button
                onClick={p.onCreate}
                disabled={p.busy || p.name.trim().length < 3}
                className="h-12 w-full rounded-xl bg-white text-black hover:bg-zinc-200"
              >
                {p.busy ? <Spinner className="size-4" /> : <Crown size={16} />}{" "}
                Create community
              </Button>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.035] p-4">
              <p className="text-sm font-black text-white">Pro plan required</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Upgrade to Pro to create one private trading community.
              </p>
            </div>
          )}
        </div>
        <aside className="rounded-[24px] border border-white/8 bg-[#070707] p-5 lg:sticky lg:top-5 lg:h-fit">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-600">
            Your desk includes
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <CreateBenefit
              icon={UsersRound}
              title="Follower room"
              text="Invite traders already connected to you."
            />
            <CreateBenefit
              icon={TrendingUp}
              title="Shared results"
              text="Opt-in performance with private dollar P&L."
            />
            <CreateBenefit
              icon={ShieldCheck}
              title="Privacy first"
              text="Credentials and open positions stay private."
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Overview({
  community,
  members,
  sharedAccounts,
  results,
  colors,
}: {
  community: NonNullable<CommunityData["community"]>;
  members: number;
  sharedAccounts: number;
  results: NonNullable<CommunityData["results"]>;
  colors: typeof communityTone;
}) {
  return (
    <div>
      <div
        className={`rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#111,#080808)] p-4 shadow-2xl ${colors.glow} sm:p-7`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-2xl border sm:size-11 ${colors.soft}`}
          >
            <BarChart3 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-600 sm:text-[10px]">
              Community overview
            </p>
            <h2 className="mt-2 text-lg font-black sm:text-2xl">
              A private desk for disciplined traders.
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500 sm:text-sm sm:leading-6">
              {community.description ||
                "Set your community direction, invite followers and choose which trading results the desk can see."}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
        <Metric label="Members" value={String(members)} hint="Active traders" />
        <Metric
          label="Shared accounts"
          value={String(sharedAccounts)}
          hint="Opt-in only"
        />
        <Metric
          label="Desk health"
          value={members > 1 ? "Active" : "Starting"}
          hint="Community status"
        />
      </div>
      {results.length ? (
        <section className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-600">
                Member results
              </p>
              <h3 className="mt-1 text-sm font-black">Shared performance</h3>
            </div>
            <span className="shrink-0 text-[9px] text-zinc-600 sm:text-[10px]">
              By PnL %
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {[...results]
              .sort((a, b) => b.pnlPercent - a.pnlPercent)
              .map((result) => (
                <article
                  key={result.accountId}
                  className="rounded-2xl border border-white/8 bg-[#080808] p-4"
                >
                  <div className="flex items-center gap-3">
                    <TraderAvatar
                      name={result.member?.full_name ?? result.accountName}
                      value={result.member?.avatar_url ?? null}
                      className="size-9 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">
                        {result.member?.full_name ?? "Community trader"}
                      </p>
                      <p className="truncate text-[10px] text-zinc-600">
                        {result.accountName} · {result.firm}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm font-black ${result.pnlPercent >= 0 ? "text-white" : "text-zinc-400"}`}
                    >
                      {result.pnlPercent >= 0 ? "+" : ""}
                      {result.pnlPercent}%
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
                    <MiniMetric label="Win rate" value={`${result.winRate}%`} />
                    <MiniMetric label="Trades" value={String(result.trades)} />
                    <MiniMetric
                      label="P&L"
                      value={
                        result.dollarPnl === null
                          ? "Private"
                          : `${result.dollarPnl >= 0 ? "+" : ""}$${result.dollarPnl.toLocaleString()}`
                      }
                    />
                  </div>
                </article>
              ))}
          </div>
        </section>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RoadmapCard
          icon={MessageSquareText}
          title="Community chat"
          text="Focused channels for setups, reviews and accountability."
        />
        <RoadmapCard
          icon={TrendingUp}
          title="Shared performance"
          text="Privacy-first member result cards and fair percentage metrics."
        />
      </div>
    </div>
  );
}

function Members(p: {
  members: NonNullable<CommunityData["members"]>;
  followers: NonNullable<CommunityData["followers"]>;
  isOwner: boolean;
  selected: string[];
  busy: boolean;
  onToggle: (id: string) => void;
  onInvite: () => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-600">
            People
          </p>
          <h2 className="mt-1 text-xl font-black">Community members</h2>
        </div>
        {p.isOwner && p.selected.length ? (
          <Button onClick={p.onInvite} disabled={p.busy} className="rounded-xl">
            <UserPlus size={15} /> Add {p.selected.length}
          </Button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2">
        {p.members.map((member) => (
          <Person
            key={member.user_id}
            profile={member.profile}
            suffix={member.role}
            selected={false}
          />
        ))}
      </div>
      {p.isOwner ? (
        <div className="mt-7 border-t border-white/8 pt-6">
          <h3 className="text-sm font-black">Invite followers</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Only people who already follow you can be added.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {p.followers.length ? (
              p.followers.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => p.onToggle(profile.id)}
                  className="text-left"
                >
                  <Person
                    profile={profile}
                    suffix={
                      p.selected.includes(profile.id) ? "Selected" : "Follower"
                    }
                    selected={p.selected.includes(profile.id)}
                  />
                </button>
              ))
            ) : (
              <p className="col-span-full rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-600">
                No new followers to invite.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Sharing(p: {
  accounts: NonNullable<CommunityData["accounts"]>;
  draft: Record<string, { enabled: boolean; showDollarPnl: boolean }>;
  busy: boolean;
  onChange: (
    value: Record<string, { enabled: boolean; showDollarPnl: boolean }>,
  ) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-600">
        Privacy controls
      </p>
      <h2 className="mt-1 text-xl font-black">Shared account results</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
        Nothing is shared by default. Credentials, broker server and open
        positions never leave your private workspace.
      </p>
      <div className="mt-5 space-y-3">
        {p.accounts.map((account) => {
          const value = p.draft[account.id] ?? {
            enabled: false,
            showDollarPnl: false,
          };
          return (
            <article
              key={account.id}
              className={`rounded-2xl border p-4 ${value.enabled ? "border-white/15 bg-white/[.035]" : "border-white/8 bg-[#080808]"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-10 place-items-center rounded-xl ${value.enabled ? "bg-white/[.08] text-white" : "bg-white/[.04] text-zinc-600"}`}
                >
                  {value.enabled ? <Eye size={17} /> : <EyeOff size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{account.name}</p>
                  <p className="truncate text-[11px] text-zinc-600">
                    {account.firm} · $
                    {(account.account_size ?? 0).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() =>
                    p.onChange({
                      ...p.draft,
                      [account.id]: { ...value, enabled: !value.enabled },
                    })
                  }
                  className={`h-7 w-12 rounded-full p-1 transition ${value.enabled ? "bg-white" : "bg-zinc-800"}`}
                >
                  <span
                    className={`block size-5 rounded-full transition ${value.enabled ? "translate-x-5 bg-black" : "bg-white"}`}
                  />
                </button>
              </div>
              {value.enabled ? (
                <label className="mt-4 flex items-center gap-3 border-t border-white/8 pt-3 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={value.showDollarPnl}
                    onChange={(event) =>
                      p.onChange({
                        ...p.draft,
                        [account.id]: {
                          ...value,
                          showDollarPnl: event.target.checked,
                        },
                      })
                    }
                    className="accent-white"
                  />
                  Show dollar P&L{" "}
                  <span className="ml-auto text-[10px] text-zinc-600">
                    PnL %, win rate and trades are visible
                  </span>
                </label>
              ) : null}
            </article>
          );
        })}
        {!p.accounts.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-600">
            Create a trading account before sharing results.
          </div>
        ) : null}
      </div>
      <Button
        onClick={p.onSave}
        disabled={p.busy}
        className="mt-5 h-11 rounded-xl"
      >
        {p.busy ? <Spinner className="size-4" /> : <ShieldCheck size={15} />}{" "}
        Save privacy settings
      </Button>
    </div>
  );
}

function Person({
  profile,
  suffix,
  selected,
}: {
  profile: CommunityProfile | null;
  suffix: string;
  selected: boolean;
}) {
  if (!profile) return null;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 ${selected ? "border-white/20 bg-white/[.06]" : "border-white/8 bg-[#080808]"}`}
    >
      <TraderAvatar
        name={profile.full_name}
        value={profile.avatar_url}
        className="size-10 text-xs"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-black">
          {profile.full_name}
          {profile.is_verified ? <VerifiedBadge size={14} /> : null}
        </p>
        <p className="truncate text-[11px] text-zinc-600">
          @{profile.username}
        </p>
      </div>
      <span className="rounded-lg bg-white/[.04] px-2 py-1 text-[9px] font-black uppercase text-zinc-500">
        {suffix}
      </span>
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#080808] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] text-zinc-600">{hint}</p>
    </div>
  );
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-zinc-700">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-black text-zinc-300">
        {value}
      </p>
    </div>
  );
}
function RoadmapCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof TrendingUp;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/8 bg-[#080808] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[.04] text-zinc-400">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">{text}</p>
      </div>
    </div>
  );
}
function ContextStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-lg bg-white/[.04] text-zinc-500">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-[10px] text-zinc-600">{label}</p>
        <p className="text-xs font-black text-zinc-300">{value}</p>
      </div>
    </div>
  );
}
function CreateBenefit({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof UsersRound;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/7 bg-white/[.02] p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/[.04] text-zinc-400">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-xs font-black text-zinc-300">{title}</p>
        <p className="mt-1 text-[10px] leading-4 text-zinc-600">{text}</p>
      </div>
    </div>
  );
}
