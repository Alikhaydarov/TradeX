"use client";

import {
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  Globe2,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { TraderAvatar } from "@/components/trader-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { useRouter } from "next/navigation";

type Accent = "emerald" | "sky" | "amber" | "rose";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
};

type CommunityCardData = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  accent?: Accent | string;
  avatar_url?: string | null;
  is_public?: boolean | null;
  role: string;
  memberCount: number;
  owner: Profile | null;
};

type HubData = {
  communities: CommunityCardData[];
  invitations: CommunityCardData[];
  canCreate: boolean;
  plan: "free" | "standard" | "pro";
};

const ACCENTS: Record<Accent, { dot: string; glow: string; line: string; icon: string }> = {
  emerald: {
    dot: "bg-emerald-400",
    glow: "from-emerald-400/[.09]",
    line: "bg-emerald-400/70",
    icon: "text-emerald-300",
  },
  sky: {
    dot: "bg-sky-400",
    glow: "from-sky-400/[.09]",
    line: "bg-sky-400/70",
    icon: "text-sky-300",
  },
  amber: {
    dot: "bg-amber-400",
    glow: "from-amber-400/[.09]",
    line: "bg-amber-400/70",
    icon: "text-amber-300",
  },
  rose: {
    dot: "bg-rose-400",
    glow: "from-rose-400/[.09]",
    line: "bg-rose-400/70",
    icon: "text-rose-300",
  },
};

function normalizeAccent(value?: string): Accent {
  return value === "sky" || value === "amber" || value === "rose" ? value : "emerald";
}

/**
 * Community links used to pushState and then dispatch a synthetic popstate.
 * The App Router cannot resolve that against the null history state pushState
 * writes, so every one of these "navigations" cost a full document reload.
 */
function useGo() {
  const router = useRouter();
  return useCallback((path: string) => router.push(path), [router]);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 1000 ? "compact" : "standard" }).format(value);
}

function HubSkeleton() {
  return (
    <div className="mx-auto max-w-[1260px] space-y-4 p-3 pb-20 sm:p-4 lg:p-5">
      <div className="h-20 animate-pulse rounded-2xl bg-white/[.025]" />
      <div className="h-11 w-72 animate-pulse rounded-xl bg-white/[.025]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-52 animate-pulse rounded-2xl border border-white/5 bg-white/[.02]" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ invitation = false }: { invitation?: boolean }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 bg-surface px-5 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl border border-white/8 bg-surface text-ink-subtle">
          {invitation ? <Mail size={19} /> : <UsersRound size={19} />}
        </span>
        <h2 className="mt-3 text-sm font-bold text-zinc-200">
          {invitation ? "No invitations" : "No communities yet"}
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-ink-subtle">
          {invitation
            ? "New community invitations will appear here."
            : "Create a community on Pro or accept an invitation from another trader."}
        </p>
      </div>
    </div>
  );
}

function CommunityCard({ community }: { community: CommunityCardData }) {
  const go = useGo();
  const accent = ACCENTS[normalizeAccent(community.accent)];
  const path = `/community/${community.id}/overview`;
  const isPublic = Boolean(community.is_public);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
  };

  return (
    <article className="group relative min-h-[196px] overflow-hidden rounded-2xl border border-white/[.085] bg-surface shadow-[0_18px_45px_rgba(0,0,0,.18)] transition duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-surface hover:shadow-[0_22px_55px_rgba(0,0,0,.3)]">
      <div className={`absolute inset-x-0 top-0 h-px ${accent.line}`} />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow} via-transparent to-transparent opacity-70`} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-lg border border-white/8 bg-black/25 text-ink-subtle transition hover:bg-white/[.06] hover:text-white"
            aria-label={`${community.name} menu`}
          >
            <MoreHorizontal size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 border-white/10 bg-surface p-1.5">
          <DropdownMenuItem onClick={() => go(path)} className="rounded-lg px-3 py-2.5 text-xs">
            <ArrowUpRight size={14} className="mr-2" /> Open community
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copyLink()} className="rounded-lg px-3 py-2.5 text-xs">
            <Copy size={14} className="mr-2" /> Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button type="button" onClick={() => go(path)} className="relative z-10 block h-full w-full p-4 text-left">
        <div className="flex items-start gap-3 pr-9">
          <div className="relative shrink-0">
            <TraderAvatar
              name={community.name}
              value={community.avatar_url || community.owner?.avatar_url}
              className="size-12 rounded-xl border border-white/10 text-sm shadow-lg"
            />
            <span className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#070707] ${accent.dot}`} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-[15px] font-bold tracking-[-0.025em] text-white">{community.name}</h2>
              <ShieldCheck size={14} className={`shrink-0 ${accent.icon}`} />
            </div>
            <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-[18px] text-ink-mute">
              {community.description || "A private trading community for shared growth and accountability."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/7 bg-black/20 px-3 py-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-ink-faint">Members</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              {formatCount(community.memberCount)} <UsersRound size={12} className="text-ink-subtle" />
            </div>
          </div>
          <div className="rounded-xl border border-white/7 bg-black/20 px-3 py-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-ink-faint">Privacy</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              {isPublic ? "Public" : "Private"}
              {isPublic ? <Globe2 size={12} className="text-sky-400" /> : <LockKeyhole size={12} className="text-amber-400" />}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/7 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <TraderAvatar
              name={community.owner?.full_name || community.name}
              value={community.owner?.avatar_url}
              className="size-6 rounded-lg text-[8px]"
            />
            <span className="max-w-32 truncate text-[10px] text-ink-subtle">@{community.owner?.username || "owner"}</span>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[.035] px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-ink-mute">
            {community.role}
          </span>
        </div>
      </button>
    </article>
  );
}

export function CommunityHubPremium() {
  const go = useGo();
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"communities" | "invitations">("communities");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState<Accent>("emerald");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiRequest<HubData>("/api/communities"));
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
      const response = await apiRequest<{ community: CommunityCardData }>("/api/communities", {
        method: "POST",
        body: JSON.stringify({ action: "create", name, description, accent }),
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

  if (loading) return <HubSkeleton />;

  const communities = data?.communities ?? [];
  const invitations = data?.invitations ?? [];

  return (
    <div className="mx-auto max-w-[1260px] space-y-4 p-3 pb-24 sm:p-4 lg:p-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-white/[.075] bg-gradient-to-br from-white/[.035] to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-surface text-zinc-200 shadow-[0_12px_32px_rgba(0,0,0,.28)]">
            <UsersRound size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-[-0.035em] text-white sm:text-[22px]">Communities</h1>
              <span className="hidden rounded-full border border-white/8 bg-white/[.035] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-ink-mute sm:inline-flex">
                Social journal
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-ink-subtle sm:text-xs">Share performance, learn together and stay accountable.</p>
          </div>
        </div>
        {data?.canCreate ? (
          <Button
            type="button"
            onClick={() => setCreateOpen((current) => !current)}
            className="h-9 rounded-xl bg-white px-3 text-[11px] font-bold text-black hover:bg-zinc-200"
          >
            {createOpen ? <X size={14} /> : <Plus size={14} />}
            {createOpen ? "Close" : "Create community"}
          </Button>
        ) : null}
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/8 bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab("communities")}
            className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${tab === "communities" ? "bg-surface-raised text-white shadow-sm" : "text-ink-subtle hover:text-ink-strong"}`}
          >
            My communities
            <span className="rounded-md bg-white/[.06] px-1.5 py-0.5 text-[8px] text-ink-soft">{communities.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("invitations")}
            className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${tab === "invitations" ? "bg-surface-raised text-white shadow-sm" : "text-ink-subtle hover:text-ink-strong"}`}
          >
            Invitations
            {invitations.length ? (
              <>
                <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,.75)]" />
                <span className="rounded-md bg-rose-400/10 px-1.5 py-0.5 text-[8px] text-rose-300">{invitations.length}</span>
              </>
            ) : null}
          </button>
        </div>
        <p className="hidden text-[10px] text-ink-faint sm:block">Plan: <span className="capitalize text-ink-mute">{data?.plan || "free"}</span></p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-[11px] text-rose-200">{error}</div>
      ) : null}

      {createOpen ? (
        <section className="grid gap-4 rounded-2xl border border-white/9 bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-amber-400/15 bg-amber-400/[.06] text-amber-300">
                <Crown size={15} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Create your community</h2>
                <p className="mt-0.5 text-[10px] text-ink-subtle">A focused private space for your traders.</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/7 bg-black/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Accent</p>
              <div className="mt-2 flex gap-2">
                {(Object.keys(ACCENTS) as Accent[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAccent(item)}
                    className={`grid size-8 place-items-center rounded-lg border transition ${accent === item ? "border-white/25 bg-white/[.08]" : "border-white/7 bg-surface hover:border-white/14"}`}
                    aria-label={`${item} accent`}
                  >
                    <span className={`size-2.5 rounded-full ${ACCENTS[item].dot}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Community name" maxLength={60} className="h-9 rounded-xl border-white/10 bg-surface text-xs" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" maxLength={280} className="min-h-20 rounded-xl border-white/10 bg-surface text-xs" />
            <Button type="button" onClick={() => void create()} disabled={busy || name.trim().length < 3} className="h-9 w-full rounded-xl bg-white text-[11px] font-bold text-black hover:bg-zinc-200">
              {busy ? <Spinner className="size-4" /> : <Sparkles size={14} />} Create community
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "communities" ? (
        communities.length ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {communities.map((community) => <CommunityCard key={community.id} community={community} />)}
          </section>
        ) : <EmptyState />
      ) : invitations.length ? (
        <section className="space-y-2">
          {invitations.map((community) => {
            const accentItem = ACCENTS[normalizeAccent(community.accent)];
            return (
              <article key={community.id} className="flex flex-col gap-3 rounded-2xl border border-white/9 bg-surface p-3.5 transition hover:border-white/16 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative shrink-0">
                    <TraderAvatar name={community.name} value={community.avatar_url || community.owner?.avatar_url} className="size-11 rounded-xl text-xs" />
                    <span className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#070707] ${accentItem.dot}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-[13px] font-bold text-white">{community.name}</h2>
                      <ShieldCheck size={13} className={accentItem.icon} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-subtle">{community.description || "You were invited to join this community."}</p>
                    <p className="mt-1 text-[10px] text-ink-faint">{formatCount(community.memberCount)} members · invited by @{community.owner?.username || "owner"}</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void respond(community.id, "decline")} className="h-8 flex-1 rounded-lg border-white/10 bg-surface px-3 text-[10px] sm:flex-none">Decline</Button>
                  <Button type="button" disabled={busy} onClick={() => void respond(community.id, "accept")} className="h-8 flex-1 rounded-lg bg-white px-3 text-[10px] font-bold text-black hover:bg-zinc-200 sm:flex-none"><Check size={12} /> Accept</Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState invitation />}
    </div>
  );
}
