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

  if (!achievements.length && !isOwnProfile) return null;

  return (
    <>
      <section className="mt-2 border-y border-border bg-card px-4 py-3 sm:rounded-lg sm:border">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg border border-amber-300/15 bg-amber-300/[.06] text-amber-200">
            <Award size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white">Achievements</h2>
            <p className="truncate text-[10px] text-muted-foreground">
              {achievements.length} certificates
            </p>
          </div>
          {isOwnProfile ? (
            <Button
              onClick={() => setOpen(true)}
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
            {achievements.map((achievement) => (
              <article
                key={achievement.id}
                className="group relative w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-[#111111] sm:w-40"
              >
                <button
                  type="button"
                  onClick={() => setViewing(achievement)}
                  className="block w-full text-left"
                >
                  <MediaImage
                    src={achievement.image_url}
                    alt={achievement.title}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div className="p-2.5">
                    <span
                      className={`text-[9px] font-black uppercase ${
                        achievement.achievement_type === "payout"
                          ? "text-emerald-300"
                          : "text-amber-200"
                      }`}
                    >
                      {achievement.achievement_type}
                    </span>
                    <h3 className="mt-1 truncate text-xs font-bold text-white">
                      {achievement.title}
                    </h3>
                  </div>
                </button>
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => onRemove(achievement.id)}
                    disabled={busy}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black text-zinc-300 opacity-100 transition hover:text-rose-300 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Delete ${achievement.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
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
