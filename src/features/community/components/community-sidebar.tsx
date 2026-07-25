"use client";

import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  MessageCircle,
  Radio,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { TraderAvatar } from "@/components/trader-avatar";

export type CommunitySection =
  | "overview"
  | "analytics"
  | "leaderboard"
  | "members"
  | "chat";

type CommunitySummary = {
  community?: {
    id: string;
    name: string;
    description?: string | null;
    avatar_url?: string | null;
    accent?: string | null;
    memberCount?: number;
    owner?: { avatar_url?: string | null } | null;
  };
  role?: string;
  members?: Array<{ status?: string }>;
};

const NAV = [
  { id: "overview" as const, label: "Overview", description: "Community snapshot", icon: LayoutDashboard },
  { id: "analytics" as const, label: "Analytics", description: "Shared performance", icon: BarChart3 },
  { id: "leaderboard" as const, label: "Leaderboard", description: "Top traders", icon: Trophy },
  { id: "members" as const, label: "Members", description: "People and invites", icon: UsersRound },
  { id: "chat" as const, label: "Chat", description: "Channels and DMs", icon: MessageCircle },
];

export function CommunitySidebar({
  communityId,
  active,
  onNavigate,
  onBack,
}: {
  communityId: string;
  active: CommunitySection;
  onNavigate: (section: CommunitySection) => void;
  onBack: () => void;
}) {
  const [summary, setSummary] = useState<CommunitySummary | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/communities/${encodeURIComponent(communityId)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as CommunitySummary;
      })
      .then((payload) => {
        if (alive) setSummary(payload);
      })
      .catch(() => {
        if (alive) setSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [communityId]);

  const community = summary?.community;
  const memberCount = summary?.members?.filter((member) => member.status === "active").length ?? community?.memberCount ?? 0;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-white/[.075] bg-[#030303] lg:flex">
      <div className="border-b border-white/[.075] p-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[10px] font-semibold text-zinc-600 transition hover:bg-white/[.04] hover:text-white"
        >
          <ArrowLeft size={13} />
          My communities
        </button>

        <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/[.085] bg-[#080808] p-3 shadow-[0_16px_35px_rgba(0,0,0,.22)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/[.055] via-transparent to-transparent" />
          <div className="relative flex items-center gap-2.5">
            <div className="relative shrink-0">
              <TraderAvatar
                name={community?.name || "Community"}
                value={community?.avatar_url || community?.owner?.avatar_url}
                className="size-10 rounded-xl border border-white/10 text-[10px]"
              />
              <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#080808] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[12px] font-bold tracking-[-0.02em] text-white">
                  {community?.name || "Community"}
                </p>
                <ShieldCheck size={12} className="shrink-0 text-emerald-300" />
              </div>
              <p className="mt-0.5 truncate text-[8px] capitalize text-zinc-600">
                {summary?.role || "member"} · {memberCount} members
              </p>
            </div>
          </div>
          <p className="relative mt-2 line-clamp-2 text-[9px] leading-4 text-zinc-600">
            {community?.description || "Private trading workspace for shared performance."}
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Community workspace">
        <p className="px-2 pb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-800">Workspace</p>
        {NAV.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`group relative flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition ${
                selected
                  ? "bg-white/[.075] text-white ring-1 ring-white/10"
                  : "text-zinc-600 hover:bg-white/[.035] hover:text-zinc-200"
              }`}
            >
              {selected ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-white" /> : null}
              <span className={`grid size-7 shrink-0 place-items-center rounded-lg border transition ${selected ? "border-white/10 bg-white/[.07] text-white" : "border-white/5 bg-[#070707] text-zinc-700 group-hover:text-zinc-400"}`}>
                <Icon size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{item.label}</span>
                <span className="mt-0.5 block truncate text-[8px] text-zinc-700">{item.description}</span>
              </span>
              {selected ? <ChevronRight size={12} className="text-zinc-600" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/[.075] p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/7 bg-[#070707] p-2.5">
          <span className="grid size-7 place-items-center rounded-lg border border-emerald-400/12 bg-emerald-400/[.05] text-emerald-300">
            <Radio size={13} />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-zinc-300">Community live</p>
            <p className="mt-0.5 truncate text-[8px] text-zinc-700">Performance and realtime chat</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
