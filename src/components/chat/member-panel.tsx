"use client";

import { BadgeCheck, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

import { TraderAvatar } from "@/components/trader-avatar";
import type { ChatPresenceMeta, ChatProfile } from "@/features/community-chat/types";

function MemberRow({
  member,
  online,
  moderator,
}: {
  member: ChatProfile;
  online: boolean;
  moderator: boolean;
}) {
  return (
    <div
      className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[.055]"
    >
      <div className="relative shrink-0">
        <TraderAvatar
          name={member.fullName}
          value={member.avatarUrl}
          className={`size-8 rounded-full border text-[10px] ${
            online ? "border-emerald-400/25" : "border-white/[.07] grayscale-[.25]"
          }`}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#111214] ${
            online ? "bg-emerald-400" : "bg-zinc-700"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className={`truncate text-[11px] font-semibold ${online ? "text-zinc-200" : "text-ink-mute"}`}>
            {member.fullName}
          </span>
          {member.isVerified ? <BadgeCheck size={11} className="shrink-0 text-sky-400" /> : null}
        </div>
        <p className="truncate text-[10px] text-ink-subtle">@{member.username}</p>
      </div>
      {moderator ? (
        <span
          className="grid size-6 shrink-0 place-items-center rounded-md border border-amber-400/10 bg-amber-400/[.055] text-amber-300/80"
          title="Community moderator"
        >
          <ShieldCheck size={11} />
        </span>
      ) : null}
    </div>
  );
}

export function MemberPanel({
  members,
  onlineUsers,
  currentUserId,
  currentUserIsModerator,
  onClose,
}: {
  members: ChatProfile[];
  onlineUsers: ChatPresenceMeta[];
  currentUserId: string;
  currentUserIsModerator: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const onlineIds = useMemo(
    () => new Set(onlineUsers.map((presence) => presence.userId)),
    [onlineUsers],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return members
      .filter((member) =>
        normalized
          ? `${member.fullName} ${member.username}`.toLowerCase().includes(normalized)
          : true,
      )
      .sort((a, b) => {
        const onlineDelta = Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id));
        return onlineDelta || a.fullName.localeCompare(b.fullName);
      });
  }, [members, onlineIds, query]);
  const online = filtered.filter((member) => onlineIds.has(member.id));
  const offline = filtered.filter((member) => !onlineIds.has(member.id));

  return (
    <aside className="flex h-full min-h-0 w-[236px] shrink-0 flex-col border-l border-white/[.065] bg-surface-raised text-ink-strong">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-black/35 px-3">
        <UsersRound size={14} className="text-ink-mute" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-zinc-200">Members</p>
          <p className="text-[8px] text-ink-subtle">{onlineUsers.length} online</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-md text-ink-subtle transition hover:bg-white/[.06] hover:text-white"
          aria-label="Close member list"
        >
          <X size={13} />
        </button>
      </div>

      <div className="shrink-0 p-2.5">
        <label className="flex h-8 items-center gap-2 rounded-md border border-white/[.07] bg-surface px-2.5 transition focus-within:border-white/[.15]">
          <Search size={12} className="text-ink-subtle" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            className="min-w-0 flex-1 bg-transparent text-[10px] text-zinc-200 outline-none placeholder:text-ink-faint"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {online.length ? (
          <section>
            <p className="px-2 pb-1 pt-1 text-[8px] font-bold uppercase tracking-[.14em] text-ink-subtle">
              Online — {online.length}
            </p>
            <div className="space-y-0.5">
              {online.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  online
                  moderator={member.id === currentUserId && currentUserIsModerator}
                />
              ))}
            </div>
          </section>
        ) : null}

        {offline.length ? (
          <section className="mt-3">
            <p className="px-2 pb-1 text-[8px] font-bold uppercase tracking-[.14em] text-ink-subtle">
              Offline — {offline.length}
            </p>
            <div className="space-y-0.5 opacity-80">
              {offline.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  online={false}
                  moderator={member.id === currentUserId && currentUserIsModerator}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!filtered.length ? (
          <div className="grid min-h-36 place-items-center px-4 text-center">
            <div>
              <UsersRound size={20} className="mx-auto text-ink-faint" />
              <p className="mt-2 text-[10px] text-ink-subtle">No matching members</p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
