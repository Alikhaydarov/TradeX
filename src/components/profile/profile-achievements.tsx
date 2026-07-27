"use client";

import { Award, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { XSpinner } from "@/components/app-loader";
import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileAchievement } from "./use-profile-data";

export function ProfileAchievements({
  achievements,
  isOwnProfile,
  busy,
  onAdd,
  onRemove,
  onError,
}: {
  achievements: ProfileAchievement[];
  isOwnProfile: boolean;
  busy: boolean;
  onAdd: (input: {
    title: string;
    issuer: string;
    type: "funded" | "payout";
    imageUrl: string;
  }) => Promise<boolean>;
  onRemove: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<ProfileAchievement | null>(null);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [type, setType] = useState<"funded" | "payout">("funded");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/journal/image", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.imageUrl) {
        throw new Error(payload.error || "Certificate upload failed.");
      }
      setImageUrl(payload.imageUrl);
    } catch (nextError) {
      onError(
        nextError instanceof Error
          ? nextError.message
          : "Certificate upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!title.trim() || !imageUrl) return;
    const saved = await onAdd({
      title: title.trim(),
      issuer: issuer.trim(),
      type,
      imageUrl,
    });
    if (!saved) return;
    setOpen(false);
    setTitle("");
    setIssuer("");
    setType("funded");
    setImageUrl("");
  };

  return (
    <>
      <section className="rounded-2xl border border-white/8 bg-[#090909] p-4 sm:p-5">
        <header className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-white/8 bg-white/[.035] text-zinc-400">
            <Award className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Achievements</h2>
            <p className="mt-0.5 text-xs text-zinc-600">
              Funded account and payout certificates.
            </p>
          </div>
          {isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="border-white/10"
            >
              <Plus className="size-3.5" /> Add
            </Button>
          ) : null}
        </header>

        {achievements.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement) => (
              <article
                key={achievement.id}
                className="group overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c]"
              >
                <button
                  type="button"
                  onClick={() => setViewing(achievement)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-black"
                >
                  <MediaImage
                    src={achievement.image_url}
                    alt={achievement.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-200">
                    {achievement.achievement_type}
                  </span>
                </button>
                <div className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {achievement.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {achievement.issuer || "Verified achievement"}
                    </p>
                  </div>
                  {isOwnProfile ? (
                    <button
                      type="button"
                      onClick={() => onRemove(achievement.id)}
                      disabled={busy}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-600 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                      aria-label={`Delete ${achievement.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 text-center">
            <div>
              <Award className="mx-auto size-5 text-zinc-700" />
              <p className="mt-3 text-sm text-zinc-600">No achievements added.</p>
            </div>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add achievement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="achievement-title">Title</Label>
              <Input
                id="achievement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="25K funded account"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achievement-issuer">Issuer</Label>
              <Input
                id="achievement-issuer"
                value={issuer}
                onChange={(event) => setIssuer(event.target.value)}
                placeholder="The5ers"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as "funded" | "payout")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="grid min-h-36 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-white/12 bg-[#080808] text-center hover:border-white/20">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void upload(event.target.files?.[0])}
              />
              {imageUrl ? (
                <MediaImage
                  src={imageUrl}
                  alt="Certificate preview"
                  className="max-h-52 w-full object-contain p-2"
                />
              ) : (
                <span className="text-sm text-zinc-600">
                  {uploading ? (
                    <span className="inline-flex items-center gap-2">
                      <XSpinner size="sm" /> Uploading
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <ImagePlus className="size-4" /> Upload certificate
                    </span>
                  )}
                </span>
              )}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              disabled={!title.trim() || !imageUrl || busy || uploading}
            >
              {busy ? <XSpinner size="sm" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewing ? (
        <div
          className="fixed inset-0 z-[99998] grid place-items-center bg-black/92 p-4"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close certificate"
          >
            <X className="size-4" />
          </button>
          <MediaImage
            src={viewing.image_url}
            alt={viewing.title}
            className="max-h-[90dvh] max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
