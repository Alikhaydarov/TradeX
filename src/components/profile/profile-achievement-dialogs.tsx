"use client";

import { Award } from "lucide-react";

import { XSpinner } from "../app-loader";
import { MediaImage } from "../media-image";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { Achievement } from "./profile-types";

export function ProfileAchievementDialogs({
  addOpen,
  viewing,
  type,
  title,
  issuer,
  image,
  busy,
  onAddOpenChange,
  onViewingChange,
  onTypeChange,
  onTitleChange,
  onIssuerChange,
  onImageFile,
  onSave,
}: {
  addOpen: boolean;
  viewing: Achievement | null;
  type: "funded" | "payout";
  title: string;
  issuer: string;
  image: string;
  busy: boolean;
  onAddOpenChange: (open: boolean) => void;
  onViewingChange: (achievement: Achievement | null) => void;
  onTypeChange: (type: "funded" | "payout") => void;
  onTitleChange: (title: string) => void;
  onIssuerChange: (issuer: string) => void;
  onImageFile: (file?: File) => void;
  onSave: () => void;
}) {
  return (
    <>
      <Dialog open={addOpen} onOpenChange={onAddOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add achievement</DialogTitle>
            <DialogDescription>
              Upload a funded or payout certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-xs text-muted-foreground">
              Type
              <Select
                value={type}
                onValueChange={(value) =>
                  onTypeChange(value as "funded" | "payout")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground">
              Title
              <Input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="100K Funded Account"
              />
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground">
              Issuer
              <Input
                value={issuer}
                onChange={(event) => onIssuerChange(event.target.value)}
                placeholder="FTMO"
              />
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground">
              Certificate image
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onImageFile(event.target.files?.[0])}
              />
            </label>
            {image ? (
              <MediaImage
                src={image}
                alt="Certificate preview"
                className="max-h-48 w-full rounded-lg border border-border object-contain"
              />
            ) : null}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => onAddOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !title.trim() || !image}
              onClick={onSave}
            >
              {busy ? <XSpinner size="sm" /> : <Award size={15} />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) onViewingChange(null);
        }}
      >
        <DialogContent className="max-h-[96dvh] max-w-[min(1100px,calc(100vw-1rem))] overflow-hidden bg-black p-0 sm:max-w-[min(1100px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-white/10 bg-[#171717] px-4 py-3 pr-14 text-left">
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              {viewing?.issuer || viewing?.achievement_type}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[calc(96dvh-72px)] place-items-center overflow-auto p-2 sm:p-4">
            {viewing ? (
              <MediaImage
                src={viewing.image_url}
                alt={viewing.title}
                className="max-h-[calc(96dvh-104px)] max-w-full object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
