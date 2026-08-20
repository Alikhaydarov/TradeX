"use client";

import { Award, Plus, Trash2 } from "lucide-react";

import { Button } from "../ui/button";
import { MediaImage } from "../media-image";
import type { Achievement } from "./profile-types";

export function ProfileAchievements({
  achievements,
  isOwnProfile,
  onAdd,
  onView,
  onRemove,
}: {
  achievements: Achievement[];
  isOwnProfile: boolean;
  onAdd: () => void;
  onView: (achievement: Achievement) => void;
  onRemove: (id: string) => void;
}) {
  if (!achievements.length && !isOwnProfile) return null;

  return (
    <section className="mt-3 border-y border-xborder bg-xsurface px-4 py-4 sm:rounded-2xl sm:border sm:px-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[.055] text-amber-200">
          <Award size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-white">Achievements</h3>
          <p className="truncate text-[10px] text-xmuted">
            {achievements.length} certificate{achievements.length === 1 ? "" : "s"}
          </p>
        </div>
        {isOwnProfile ? (
          <Button
            onClick={onAdd}
            variant="ghost"
            size="sm"
            className="ml-auto rounded-xl border border-xborder bg-xpanel hover:bg-xraised"
          >
            <Plus size={14} /> Add
          </Button>
        ) : null}
      </div>

      {achievements.length ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {achievements.map((item) => (
            <article
              key={item.id}
              className="group relative w-40 shrink-0 overflow-hidden rounded-xl border border-xborder bg-xpanel transition hover:border-xborder-strong hover:bg-xraised sm:w-44"
            >
              <button
                type="button"
                onClick={() => onView(item)}
                className="block w-full text-left"
              >
                <MediaImage
                  src={item.image_url}
                  alt={item.title}
                  className="aspect-[16/10] w-full object-cover"
                />
                <div className="p-3">
                  <span
                    className={`text-[9px] font-black uppercase tracking-[.12em] ${
                      item.achievement_type === "payout"
                        ? "text-emerald-300"
                        : "text-amber-200"
                    }`}
                  >
                    {item.achievement_type}
                  </span>
                  <h4 className="mt-1.5 truncate text-xs font-bold text-white">
                    {item.title}
                  </h4>
                </div>
              </button>
              {isOwnProfile ? (
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg border border-white/10 bg-black/75 text-zinc-300 opacity-100 backdrop-blur transition hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Remove achievement"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
