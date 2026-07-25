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
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
};

export type CommunityCardData = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
  avatar_url?: string | null;
  is_public?: boolean;
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

function go(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[.018] px-5 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-xl border border-white/8 bg-[#090909] text-zinc-700">
          <UsersRound size={21} />
        </span>
        <h2 className="mt-3 text-sm font-bold text-zinc-200">{title}</h2>
        <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-zinc-600">{text}</p>
      </div>
    </div>
  );
}

function CommunityCard({ community }: { community: CommunityCardData }) {
  const path = `/community/${community.id}/overview`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#080808] p-4 shadow-[0_16px_38px_rgba(0,0,0,.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#0b0b0b] hover:shadow-[0_22px_48px_rgba(0,0,0,.28)] sm:p-5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-xl border border-transparent text-zinc-600 transition hover:border-white/10 hover:bg-white/[.05] hover:text-white"
            aria-label={`Open ${community.name} menu`}
          >
            <MoreHorizontal size={17} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#080808] p-1.5">
          <DropdownMenuItem onClick={() => go(path)} className="rounded-lg px-3 py-2.5">
            <ArrowUpRight size={14} className="mr-2" /> Open community
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copyLink()} className="rounded-lg px-3 py-2.5">
            <Copy size={14} className="mr-2" /> Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button type="button" onClick={() => go(path)} className="block w-full text-left">
        <div className="flex items-start gap-3 pr-9">
          <TraderAvatar
            name={community.name}
            value={community.avatar_url}
            className="size-12 rounded-xl text-sm sm:size-14"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-base font-bold tracking-[-0.025em] text-white">
                {community.name}
              </h2>
              <ShieldCheck size={14} className="shrink-0 text-zinc-500" />
            </div>
            <p className="mt-1 truncate text-[11px] leading-5 text-zinc-500">
              {community.description || "A private trading community for shared growth."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/8 bg-white/[.035] px-2.5 text-[10px] font-semibold text-zinc-400">
            <UsersRound size={12} /> {community.memberCount} members
          </span>
          <span
            className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold ${
              community.is_public
                ? "border-sky-400/15 bg-sky-400/[.06] text-sky-300"
                : "border-amber-400/15 bg-amber-400/[.06] text-amber-300"
            }`}
          >
            {community.is_public ? <Globe2 size={12} /> : <LockKeyhole size={12} />}
            {community.is_public ? "Public" : "Private"}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <TraderAvatar
              name={community.owner?.full_name || community.name}
              value={community.owner?.avatar_url}
              className="size-6 rounded-lg text-[8px]"
            />
            <span className="max-w-32 truncate text-[10px] text-zinc-600">
              @{community.owner?.username || "owner"}
            </span>
          </div>
          <span className="rounded-full bg-white/[.045] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-zinc-500">
            {community.role}
          </span>
        </div>
      </button>
    </article>
  );
}

export function CommunityHubV2() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("communities");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    <div className="mx-auto max-w-[1380px] space-y-4 p-3 pb-24 sm:p-5 md:pb-8 lg:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-zinc-700">Social workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-white">Communities</h1>
          <p className="mt-1 text-xs text-zinc-500">Private desks for shared performance, accountability and realtime conversation.</p>
        </div>
        {data?.canCreate ? (
          <Button
            type="button"
            onClick={() => setCreateOpen((current) => !current)}
            className="h-9 rounded-xl bg-white px-3.5 text-[11px] font-bold text-black hover:bg-zinc-200"
          >
            {createOpen ? <X size={14} /> : <Plus size={14} />}
            {createOpen ? "Close" : "Create community"}
          </Button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.055] px-3 py-2.5 text-xs text-rose-200">{error}</div>
      ) : null}

      {createOpen ? (
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-[#080808] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)] sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl border border-amber-400/15 bg-amber-400/[.06] text-amber-300"><Crown size={16} /></span>
              <div>
                <h2 className="text-sm font-bold text-white">Create your Pro community</h2>
                <p className="mt-0.5 text-[10px] text-zinc-600">One owner community with private analytics and chat.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Community name" maxLength={60} className="h-9 border-white/10 bg-[#050505] text-xs" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" maxLength={280} className="min-h-20 border-white/10 bg-[#050505] text-xs" />
            <Button type="button" onClick={() => void create()} disabled={busy || name.trim().length < 3} className="h-9 w-full bg-white text-xs font-bold text-black hover:bg-zinc-200">
              {busy ? <Spinner className="size-4" /> : <Plus size={14} />} Create
            </Button>
          </div>
        </section>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-10 w-fit rounded-xl border-white/8 bg-[#060606] p-1">
          <TabsTrigger value="communities" className="h-8 flex-none rounded-lg px-3 text-[11px]">
            <UsersRound size={13} /> My Communities
            <span className="rounded-md bg-white/[.06] px-1.5 py-0.5 text-[8px]">{communities.length}</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="relative h-8 flex-none rounded-lg px-3 text-[11px]">
            <Mail size={13} /> Invitations
            {invitations.length ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-rose-500 ring-2 ring-[#060606]" />
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communities">
          {communities.length ? (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {communities.map((community) => <CommunityCard key={community.id} community={community} />)}
            </section>
          ) : (
            <EmptyState
              title="No communities yet"
              text={data?.plan === "pro" ? "Create a community or accept an invitation." : "Accepted invitations will appear here. Pro members can create a private community."}
            />
          )}
        </TabsContent>

        <TabsContent value="invitations">
          {invitations.length ? (
            <section className="space-y-2.5">
              {invitations.map((community) => (
                <article key={community.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#080808] p-4 transition hover:border-white/16 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <TraderAvatar name={community.name} value={community.avatar_url} className="size-11 rounded-xl text-[10px]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-sm font-bold text-white">{community.name}</h2>
                        <ShieldCheck size={13} className="text-zinc-500" />
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-600">{community.description || "You were invited to this private community."}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void respond(community.id, "decline")} className="h-8 flex-1 rounded-lg border-white/10 bg-[#050505] px-3 text-[10px] sm:flex-none">Decline</Button>
                    <Button type="button" disabled={busy} onClick={() => void respond(community.id, "accept")} className="h-8 flex-1 rounded-lg bg-white px-3 text-[10px] font-bold text-black hover:bg-zinc-200 sm:flex-none"><Check size={12} /> Accept</Button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState title="No invitations" text="New community invitations will appear here." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
