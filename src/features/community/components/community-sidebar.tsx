"use client";

import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  Menu,
  MessageCircle,
  ShieldCheck,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  };
  role?: string;
};

type ChatContextSummary = {
  channels?: Array<{ unreadCount?: number }>;
  dms?: Array<{ unreadCount?: number }>;
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
  const [chatSummary, setChatSummary] = useState<ChatContextSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      fetch(`/api/communities/${encodeURIComponent(communityId)}`, {
        cache: "no-store",
        credentials: "same-origin",
      }).then(async (response) =>
        response.ok ? ((await response.json()) as CommunitySummary) : null,
      ),
      fetch(
        `/api/community-chat/context?communityId=${encodeURIComponent(communityId)}`,
        { cache: "no-store", credentials: "same-origin" },
      ).then(async (response) =>
        response.ok ? ((await response.json()) as ChatContextSummary) : null,
      ),
    ])
      .then(([community, chat]) => {
        if (!alive) return;
        setSummary(community);
        setChatSummary(chat);
      })
      .catch(() => {
        if (!alive) return;
        setSummary(null);
        setChatSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [communityId]);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener("tradox:open-community-rail", open);
    return () => window.removeEventListener("tradox:open-community-rail", open);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [active, communityId]);

  const unreadCount = useMemo(
    () =>
      [...(chatSummary?.channels ?? []), ...(chatSummary?.dms ?? [])].reduce(
        (total, item) => total + Number(item.unreadCount ?? 0),
        0,
      ),
    [chatSummary],
  );

  const role = summary?.role || "member";
  const community = summary?.community;

  const railContent = (
    <div className="flex h-full min-h-0 flex-col bg-[#040404]">
      <div className="border-b border-white/8 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#090909] text-zinc-500 transition hover:border-white/15 hover:text-white"
            aria-label="Back to My Communities"
            title="My Communities"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="rounded-full border border-white/8 bg-white/[.045] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-zinc-500">
            {role}
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid size-9 place-items-center rounded-lg text-zinc-600 lg:hidden"
            aria-label="Close community navigation"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/8 bg-[#090909] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
          <TraderAvatar
            name={community?.name || "Community"}
            value={community?.avatar_url}
            className="size-10 rounded-xl text-[11px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-[13px] font-bold text-white">
                {community?.name || "Community"}
              </p>
              <ShieldCheck size={13} className="shrink-0 text-zinc-500" />
            </div>
            <p className="mt-0.5 truncate text-[9px] text-zinc-600">
              Community workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Community workspace">
        <p className="px-2 pb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
          Workspace
        </p>
        {NAV.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`group flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition ${
                selected
                  ? "bg-white/[.095] text-white ring-1 ring-white/10"
                  : "text-zinc-500 hover:bg-white/[.045] hover:text-zinc-200"
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg transition ${
                  selected
                    ? "bg-white/[.08] text-white"
                    : "bg-[#080808] text-zinc-600 group-hover:text-zinc-300"
                }`}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                {item.label}
              </span>
              {item.id === "chat" && unreadCount > 0 ? (
                <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[8px] font-black leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : selected ? (
                <ChevronRight size={13} className="text-zinc-500" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/8 p-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/8 bg-[#080808] text-[10px] font-semibold text-zinc-500 transition hover:border-white/15 hover:text-white"
        >
          <UsersRound size={13} /> My Communities
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-[72px] z-[80] hidden w-[240px] border-r border-white/8 lg:block">
        {railContent}
      </aside>

      <header className="fixed inset-x-0 top-0 z-[82] flex h-12 items-center border-b border-white/8 bg-black/95 px-2.5 backdrop-blur-xl md:left-[72px] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/8 bg-[#0b0b0b] text-zinc-400">
            <Menu size={15} />
          </span>
          <TraderAvatar
            name={community?.name || "Community"}
            value={community?.avatar_url}
            className="size-7 rounded-lg text-[8px]"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-white">
              {community?.name || "Community"}
            </p>
            <p className="truncate text-[8px] capitalize text-zinc-600">
              {active} · {role}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onBack}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-600 transition hover:bg-white/[.05] hover:text-white"
          aria-label="Back to My Communities"
        >
          <ArrowLeft size={15} />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close community navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(290px,88vw)] border-r border-white/10 shadow-2xl md:left-[72px]">
            {railContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
