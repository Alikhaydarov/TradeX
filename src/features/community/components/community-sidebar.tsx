"use client";

import {
  ArrowLeft,
  BarChart3,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  };
  role?: string;
};

const NAV = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  { id: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
  { id: "members" as const, label: "Members", icon: UsersRound },
  { id: "chat" as const, label: "Chat", icon: MessageCircle },
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

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-white/8 bg-[#030303] lg:flex">
      <div className="border-b border-white/8 p-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold text-zinc-500 transition hover:bg-white/[.04] hover:text-white"
        >
          <ArrowLeft size={15} />
          My communities
        </button>

        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-white/8 bg-[#080808] p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#111] text-zinc-200">
            <UsersRound size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[13px] font-bold text-white">
                {summary?.community?.name || "Community"}
              </p>
              <ShieldCheck size={13} className="shrink-0 text-zinc-400" />
            </div>
            <p className="mt-0.5 truncate text-[10px] capitalize text-zinc-600">
              {summary?.role || "member"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Community workspace">
        <p className="px-2 pb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
          Community
        </p>
        {NAV.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition ${
                selected
                  ? "bg-[#111] text-white ring-1 ring-white/10"
                  : "text-zinc-500 hover:bg-[#080808] hover:text-zinc-200"
              }`}
            >
              <span
                className={`grid size-7 place-items-center rounded-lg ${
                  selected ? "bg-[#1a1a1a]" : "bg-[#050505]"
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="text-[13px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className="rounded-xl border border-white/8 bg-[#070707] p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
            Private workspace
          </p>
          <p className="mt-1 text-[11px] leading-4 text-zinc-400">
            Accepted members can access performance and realtime chat.
          </p>
        </div>
      </div>
    </aside>
  );
}
