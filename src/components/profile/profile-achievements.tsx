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
    <section className="mt-2 border-y border-border bg-card px-4 py-3 sm:rounded-lg sm:border">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg border border-amber-300/15 bg-amber-300/[.06] text-amber-200">
          <Award size={15} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black">Achievements</h3>
          <p className="truncate text-[10px] text-muted-foreground">
            {achievements.length} certificates
          </p>
        </div>
        {isOwnProfile ? (
          <Button
            onClick={onAdd}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <Plus size={14} /> Add
          </Button>
        ) : null}
      </div>
      {achievements.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {achievements.map((item) => (
            <article
              key={item.id}
              className="group relative w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-[#111111] sm:w-40"
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
                <div className="p-2.5">
                  <span
                    className={`text-[9px] font-black uppercase ${
                      item.achievement_type === "payout"
                        ? "text-emerald-300"
                        : "text-amber-200"
                    }`}
                  >
                    {item.achievement_type}
                  </span>
                  <h4 className="mt-1 truncate text-xs font-bold">
                    {item.title}
                  </h4>
                </div>
              </button>
              {isOwnProfile ? (
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black text-zinc-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
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
