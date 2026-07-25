"use client";

import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

const STORAGE_KEY = "tradeway:community-sidebar-collapsed";

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
  const asideRef = useRef<HTMLElement | null>(null);
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    const spacer = asideRef.current?.nextElementSibling as HTMLElement | null;
    if (spacer) {
      spacer.style.width = collapsed ? "76px" : "236px";
      spacer.style.transition = "width 200ms ease-out";
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Ignore unavailable storage.
    }
  }, [collapsed]);

  useEffect(() => {
    const sidebar = asideRef.current;
    return () => {
      const spacer = sidebar?.nextElementSibling as HTMLElement | null;
      if (spacer) spacer.style.width = "236px";
    };
  }, []);

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
  const memberCount =
    summary?.members?.filter((member) => member.status === "active").length ??
    community?.memberCount ??
    0;

  return (
    <aside
      ref={asideRef}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/[.075] bg-[#030303] transition-[width] duration-200 ease-out lg:flex"
      style={{ width: collapsed ? 76 : 236 }}
      data-community-sidebar={collapsed ? "collapsed" : "expanded"}
    >
      <div
        className={`border-b border-white/[.075] ${
          collapsed ? "flex flex-col items-center gap-2 px-2 py-3" : "p-3"
        }`}
      >
        {collapsed ? (
          <>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="grid size-9 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] text-emerald-300 transition hover:bg-emerald-400/[.1] hover:text-white"
              aria-label="Expand community sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="grid size-9 place-items-center rounded-xl text-zinc-600 transition hover:bg-white/[.05] hover:text-white"
              aria-label="Back to my communities"
              title="My communities"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="relative mt-1">
              <TraderAvatar
                name={community?.name || "Community"}
                value={community?.avatar_url || community?.owner?.avatar_url}
                className="size-10 rounded-xl border border-white/10 text-[10px]"
              />
              <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#030303] bg-emerald-400" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-[10px] font-semibold text-zinc-600 transition hover:bg-white/[.04] hover:text-white"
              >
                <ArrowLeft size={13} />
                <span className="truncate">My communities</span>
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/7 bg-[#080808] text-zinc-600 transition hover:border-white/15 hover:bg-white/[.05] hover:text-white"
                aria-label="Collapse community sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>

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
          </>
        )}
      </div>

      <nav
        className={
          collapsed
            ? "flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto px-2 py-3"
            : "min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
        }
        aria-label="Community workspace"
      >
        {!collapsed ? (
          <p className="px-2 pb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-800">
            Workspace
          </p>
        ) : null}

        {NAV.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;

          if (collapsed) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`group relative grid size-10 place-items-center rounded-xl border transition ${
                  selected
                    ? "border-emerald-400/25 bg-emerald-400/[.11] text-emerald-200 shadow-[0_8px_24px_rgba(0,0,0,.28)]"
                    : "border-transparent text-zinc-600 hover:border-white/10 hover:bg-white/[.05] hover:text-zinc-200"
                }`}
                aria-label={item.label}
                title={item.label}
              >
                {selected ? (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400" />
                ) : null}
                <Icon size={16} strokeWidth={selected ? 2.25 : 1.9} />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`group relative flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition ${
                selected
                  ? "bg-white/[.075] text-white ring-1 ring-white/10"
                  : "text-zinc-600 hover:bg-white/[.035] hover:text-zinc-200"
              }`}
            >
              {selected ? (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400" />
              ) : null}
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg border transition ${
                  selected
                    ? "border-emerald-400/20 bg-emerald-400/[.08] text-emerald-200"
                    : "border-white/5 bg-[#070707] text-zinc-700 group-hover:text-zinc-400"
                }`}
              >
                <Icon size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{item.label}</span>
                <span className="mt-0.5 block truncate text-[8px] text-zinc-700">
                  {item.description}
                </span>
              </span>
              {selected ? <ChevronRight size={12} className="text-zinc-600" /> : null}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-white/[.075] ${collapsed ? "p-2.5" : "p-3"}`}>
        {collapsed ? (
          <div
            className="grid h-10 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/[.055] text-emerald-300"
            title={`${memberCount} members · live`}
          >
            <Radio size={15} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/7 bg-[#070707] p-2.5">
            <span className="grid size-7 place-items-center rounded-lg border border-emerald-400/12 bg-emerald-400/[.05] text-emerald-300">
              <Radio size={13} />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-zinc-300">Community live</p>
              <p className="mt-0.5 truncate text-[8px] text-zinc-700">
                Performance and realtime chat
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
