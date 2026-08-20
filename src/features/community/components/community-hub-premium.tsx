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
import { useRouter } from "next/navigation";
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
import {
  fetchCommunityHub,
  getCachedCommunityHub,
  markCommunityHubStale,
} from "../community-data-store";

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

const ACCENTS: Record<
  Accent,
  { dot: string; glow: string; line: string; icon: string }
> = {
  emerald: {
    dot: "bg-emerald-400",
    glow: "from-emerald-400/[.07]",
    line: "bg-emerald-400/70",
    icon: "text-emerald-300",
  },
  sky: {
    dot: "bg-sky-400",
    glow: "from-sky-400/[.07]",
    line: "bg-sky-400/70",
    icon: "text-sky-300",
  },
  amber: {
    dot: "bg-amber-400",
    glow: "from-amber-400/[.07]",
    line: "bg-amber-400/70",
    icon: "text-amber-300",
  },
  rose: {
    dot: "bg-rose-400",
    glow: "from-rose-400/[.07]",
    line: "bg-rose-400/70",
    icon: "text-rose-300",
  },
};

function normalizeAccent(value?: string): Accent {
  return value === "sky" || value === "amber" || value === "rose"
    ? value
    : "emerald";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function HubSkeleton() {
  return (
    <div className="mx-auto max-w-[1260px] space-y-4 p-3 pb-20 sm:p-4 lg:p-5">
      <div className="h-20 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
      <div className="h-11 w-72 animate-pulse rounded-xl bg-xpanel" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-52 animate-pulse rounded-2xl border border-xborder bg-xsurface"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ invitation = false }: { invitation?: boolean }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-xborder bg-xsurface px-5 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl border border-xborder bg-xpanel text-xmuted">
          {invitation ? <Mail size={19} /> : <UsersRound size={19} />}
        </span>
        <h2 className="mt-3 text-sm font-bold text-zinc-200">
          {invitation ? "No invitations" : "No communities yet"}
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-xmuted">
          {invitation
            ? "New community invitations will appear here."
            : "Create a community on Pro or accept an invitation from another trader."}
        </p>
      </div>
    </div>
  );
}

function CommunityCard({
  community,
  onOpen,
  onPrefetch,
}: {
  community: CommunityCardData;
  onOpen: (path: string) => void;
  onPrefetch: (path: string) => void;
}) {
  const accent = ACCENTS[normalizeAccent(community.accent)];
  const path = `/community/${community.id}/overview`;
  const isPublic = Boolean(community.is_public);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
  };

  return (
    <article
      onMouseEnter={() => onPrefetch(path)}
      className="group relative min-h-[196px] overflow-hidden rounded-2xl border border-xborder bg-xsurface shadow-[0_18px_45px_rgba(0,0,0,.18)] transition duration-200 hover:-translate-y-0.5 hover:border-xborder-strong hover:bg-xpanel hover:shadow-[0_22px_55px_rgba(0,0,0,.3)]"
    >
      <div className={`absolute inset-x-0 top-0 h-px ${accent.line}`} />
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.glow} via-transparent to-transparent opacity-60`}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-lg border border-xborder bg-xcanvas/50 text-xmuted transition hover:bg-xraised hover:text-white"
            aria-label={`${community.name} menu`}
          >
            <MoreHorizontal size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => onOpen(path)}
            className="rounded-lg px-3 py-2.5 text-xs"
          >
            <ArrowUpRight size={14} className="mr-2" /> Open community
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void copyLink()}
            className="rounded-lg px-3 py-2.5 text-xs"
          >
            <Copy size={14} className="mr-2" /> Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onFocus={() => onPrefetch(path)}
        onPointerDown={() => onPrefetch(path)}
        onClick={() => onOpen(path)}
        className="relative z-10 block h-full w-full p-4 text-left"
      >
        <div className="flex items-start gap-3 pr-9">
          <div className="relative shrink-0">
            <TraderAvatar
              name={community.name}
              value={community.avatar_url || community.owner?.avatar_url}
              className="size-12 rounded-xl border border-xborder text-sm shadow-lg"
            />
            <span
              className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-xsurface ${accent.dot}`}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-[15px] font-bold tracking-[-0.025em] text-white">
                {community.name}
              </h2>
              <ShieldCheck size={14} className={`shrink-0 ${accent.icon}`} />
            </div>
            <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-[18px] text-xmuted">
              {community.description ||
                "A private trading community for shared growth and accountability."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-xborder bg-xpanel px-3 py-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-xmuted">
              Members
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              {formatCount(community.memberCount)}
              <UsersRound size={12} className="text-xmuted" />
            </div>
          </div>
          <div className="rounded-xl border border-xborder bg-xpanel px-3 py-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-xmuted">
              Privacy
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              {isPublic ? "Public" : "Private"}
              {isPublic ? (
                <Globe2 size={12} className="text-sky-400" />
              ) : (
                <LockKeyhole size={12} className="text-amber-400" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-xborder pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <TraderAvatar
              name={community.owner?.full_name || community.name}
              value={community.owner?.avatar_url}
              className="size-6 rounded-lg text-[8px]"
            />
            <span className="max-w-32 truncate text-[9px] text-xmuted">
              @{community.owner?.username || "owner"}
            </span>
          </div>
          <span className="rounded-full border border-xborder bg-xpanel px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-xmuted">
            {community.role}
          </span>
        </div>
      </button>
    </article>
  );
}

export function CommunityHubPremium() {
  const router = useRouter();
  const cached = getCachedCommunityHub<HubData>();
  const [data, setData] = useState<HubData | null>(() => cached);
  const [loading, setLoading] = useState(() => !cached);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"communities" | "invitations">("communities");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState<Accent>("emerald");

  const load = useCallback(async (force = false) => {
    const current = getCachedCommunityHub<HubData>();
    if (current) {
      setData(current);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      setData(await fetchCommunityHub<HubData>({ force }));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Communities could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openPath = useCallback(
    (path: string) => router.push(path),
    [router],
  );
  const prefetchPath = useCallback(
    (path: string) => router.prefetch(path),
    [router],
  );

  const create = async () => {
    if (busy || name.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ community: CommunityCardData }>(
        "/api/communities",
        {
          method: "POST",
          body: JSON.stringify({ action: "create", name, description, accent }),
        },
      );
      markCommunityHubStale();
      window.dispatchEvent(new Event("tradox:community-membership-changed"));
      router.push(`/community/${response.community.id}/overview`);
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

  const respond = async (
    communityId: string,
    decision: "accept" | "decline",
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/communities", {
        method: "POST",
        body: JSON.stringify({
          action: "respond_invite",
          communityId,
          decision,
        }),
      });
      markCommunityHubStale();
      window.dispatchEvent(new Event("tradox:community-membership-changed"));
      await load(true);
      if (decision === "accept") {
        router.push(`/community/${communityId}/overview`);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Invitation could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <HubSkeleton />;

  const communities = data?.communities ?? [];
  const invitations = data?.invitations ?? [];

  return (
    <div className="mx-auto max-w-[1260px] space-y-4 p-3 pb-24 sm:p-4 lg:p-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-xborder bg-xsurface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-xborder bg-xpanel text-zinc-200">
            <UsersRound size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-[-0.035em] text-white sm:text-[22px]">
                Communities
              </h1>
              <span className="hidden rounded-full border border-xborder bg-xpanel px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-xmuted sm:inline-flex">
                Social journal
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-xmuted sm:text-xs">
              Share performance, learn together and stay accountable.
            </p>
          </div>
        </div>
        {data?.canCreate ? (
          <Button
            type="button"
            onClick={() => setCreateOpen((current) => !current)}
            className="h-9 rounded-xl px-3 text-[11px] font-bold"
          >
            {createOpen ? <X size={14} /> : <Plus size={14} />}
            {createOpen ? "Close" : "Create community"}
          </Button>
        ) : null}
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-xborder bg-xcanvas p-1">
          <button
            type="button"
            onClick={() => setTab("communities")}
            className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${
              tab === "communities"
                ? "bg-xpanel text-white shadow-sm"
                : "text-xmuted hover:text-zinc-300"
            }`}
          >
            My communities
            <span className="rounded-md bg-xraised px-1.5 py-0.5 text-[8px] text-zinc-400">
              {communities.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("invitations")}
            className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${
              tab === "invitations"
                ? "bg-xpanel text-white shadow-sm"
                : "text-xmuted hover:text-zinc-300"
            }`}
          >
            Invitations
            {invitations.length ? (
              <>
                <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-rose-500" />
                <span className="rounded-md bg-rose-400/10 px-1.5 py-0.5 text-[8px] text-rose-300">
                  {invitations.length}
                </span>
              </>
            ) : null}
          </button>
        </div>
        <p className="hidden text-[10px] text-xmuted sm:block">
          Plan: <span className="capitalize text-zinc-400">{data?.plan || "free"}</span>
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-[11px] text-rose-200">
          {error}
        </div>
      ) : null}

      {createOpen ? (
        <section className="grid gap-4 rounded-2xl border border-xborder bg-xsurface p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-amber-400/15 bg-amber-400/[.06] text-amber-300">
                <Crown size={15} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Create your community
                </h2>
                <p className="mt-0.5 text-[10px] text-xmuted">
                  A focused private space for your traders.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-xborder bg-xpanel p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-xmuted">
                Accent
              </p>
              <div className="mt-2 flex gap-2">
                {(Object.keys(ACCENTS) as Accent[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAccent(item)}
                    className={`grid size-8 place-items-center rounded-lg border transition ${
                      accent === item
                        ? "border-xborder-strong bg-xraised"
                        : "border-xborder bg-xsurface hover:border-xborder-strong"
                    }`}
                    aria-label={`${item} accent`}
                  >
                    <span className={`size-2.5 rounded-full ${ACCENTS[item].dot}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Community name"
              maxLength={60}
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description"
              maxLength={280}
              className="min-h-20"
            />
            <Button
              type="button"
              onClick={() => void create()}
              disabled={busy || name.trim().length < 3}
              className="h-9 w-full rounded-xl text-[11px] font-bold"
            >
              {busy ? <Spinner className="size-4" /> : <Sparkles size={14} />}
              Create community
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "communities" ? (
        communities.length ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {communities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                onOpen={openPath}
                onPrefetch={prefetchPath}
              />
            ))}
          </section>
        ) : (
          <EmptyState />
        )
      ) : invitations.length ? (
        <section className="space-y-2">
          {invitations.map((community) => {
            const accentItem = ACCENTS[normalizeAccent(community.accent)];
            return (
              <article
                key={community.id}
                className="flex flex-col gap-3 rounded-2xl border border-xborder bg-xsurface p-3.5 transition hover:border-xborder-strong sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative shrink-0">
                    <TraderAvatar
                      name={community.name}
                      value={community.avatar_url || community.owner?.avatar_url}
                      className="size-11 rounded-xl text-xs"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-xsurface ${accentItem.dot}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-[13px] font-bold text-white">
                        {community.name}
                      </h2>
                      <ShieldCheck size={13} className={accentItem.icon} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-xmuted">
                      {community.description ||
                        "You were invited to join this community."}
                    </p>
                    <p className="mt-1 text-[9px] text-xmuted">
                      {formatCount(community.memberCount)} members · invited by @
                      {community.owner?.username || "owner"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void respond(community.id, "decline")}
                    className="h-8 flex-1 rounded-lg px-3 text-[10px] sm:flex-none"
                  >
                    Decline
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void respond(community.id, "accept")}
                    className="h-8 flex-1 rounded-lg px-3 text-[10px] font-bold sm:flex-none"
                  >
                    <Check size={12} /> Accept
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState invitation />
      )}
    </div>
  );
}
