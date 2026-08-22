"use client";

import { Camera, Check, Eye, EyeOff, LogOut, MapPin } from "lucide-react";
import type { RefObject } from "react";

import { validateUsername } from "@/lib/username";
import { XSpinner } from "../app-loader";
import { MediaImage } from "../media-image";
import { TraderAvatar } from "../trader-avatar";
import type { Profile } from "../types";
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
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

export function ProfileEditDialog({
  open,
  profile,
  saved,
  error,
  uploadingAvatar,
  uploadingBanner,
  avatarInputRef,
  onOpenChange,
  onProfileChange,
  onAvatarFile,
  onBannerClick,
  onSignOut,
  onSave,
}: {
  open: boolean;
  profile: Profile | null;
  saved: boolean;
  error: string | null;
  uploadingAvatar: boolean;
  uploadingBanner: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onOpenChange: (open: boolean) => void;
  onProfileChange: (profile: Profile) => void;
  onAvatarFile: (file?: File) => void;
  onBannerClick: () => void;
  onSignOut: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open && Boolean(profile)} onOpenChange={onOpenChange}>
      {profile ? (
        <DialogContent
          className="max-h-[calc(100dvh-.5rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="sticky top-0 z-20 border-b border-white/8 bg-black px-5 py-4 text-left">
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Profil ma&apos;lumotlari va trading uslubingizni yangilang.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-36 overflow-hidden bg-surface">
            {profile.bannerUrl ? (
              <MediaImage
                src={profile.bannerUrl}
                alt="Banner"
                className="h-full w-full object-cover"
              />
            ) : null}
            <button
              type="button"
              onClick={onBannerClick}
              disabled={uploadingBanner}
              className="absolute inset-0 grid h-full w-full place-items-center bg-black/35 text-white transition hover:bg-black/50 disabled:opacity-70"
              aria-label="Change banner"
            >
              {uploadingBanner ? (
                <XSpinner size="sm" />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold">
                  <Camera size={14} /> Change cover
                </span>
              )}
            </button>
          </div>
          <div className="px-5 pb-6">
            <div className="-mt-14 flex items-end">
              <div className="relative">
                <TraderAvatar
                  name={profile.fullName}
                  value={profile.avatarUrl}
                  className="h-28 w-28 rounded-full border-4 border-[#171717] text-2xl"
                />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => onAvatarFile(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 h-full w-full rounded-full bg-black/45 text-white hover:bg-black/55"
                >
                  {uploadingAvatar ? (
                    <XSpinner size="sm" />
                  ) : (
                    <Camera size={24} />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSignOut}
                className="ml-auto mb-3 rounded-full"
              >
                <LogOut size={15} /> Sign out
              </Button>
            </div>
            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            <div className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profile.fullName}
                  onChange={(event) =>
                    onProfileChange({ ...profile, fullName: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-username">Username</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-mute">
                    @
                  </span>
                  <Input
                    id="profile-username"
                    value={profile.username}
                    onChange={(event) =>
                      onProfileChange({ ...profile, username: event.target.value })
                    }
                    className="pl-8"
                    aria-invalid={!validateUsername(profile.username).valid}
                  />
                </div>
                <p
                  className={`text-xs ${
                    validateUsername(profile.username).valid
                      ? "text-ink-mute"
                      : "text-rose-300"
                  }`}
                >
                  {validateUsername(profile.username).valid
                    ? "3-24 lowercase letters, numbers, or underscores."
                    : validateUsername(profile.username).error}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-avatar">Avatar URL</Label>
                <Input
                  id="profile-avatar"
                  value={profile.avatarUrl ?? ""}
                  onChange={(event) =>
                    onProfileChange({ ...profile, avatarUrl: event.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Trading style</Label>
                <Select
                  value={profile.tradingStyle}
                  onValueChange={(value) =>
                    onProfileChange({ ...profile, tradingStyle: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose your trading style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Price Action">Price Action</SelectItem>
                    <SelectItem value="Scalping">Scalping</SelectItem>
                    <SelectItem value="Swing Trading">Swing Trading</SelectItem>
                    <SelectItem value="Algorithmic">Algorithmic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-location">Location</Label>
                <div className="relative">
                  <MapPin
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute"
                    size={16}
                  />
                  <Input
                    id="profile-location"
                    value={profile.location}
                    onChange={(event) =>
                      onProfileChange({ ...profile, location: event.target.value })
                    }
                    placeholder="Korea"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  value={profile.bio}
                  onChange={(event) =>
                    onProfileChange({ ...profile, bio: event.target.value })
                  }
                  maxLength={160}
                  className="min-h-28"
                  placeholder="Write something about your trading journey..."
                />
                <span className="text-right text-[11px] text-ink-subtle">
                  {profile.bio.length}/160
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-surface px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {profile.statsVisible === false ? (
                    <EyeOff size={16} className="shrink-0 text-ink-mute" />
                  ) : (
                    <Eye size={16} className="shrink-0 text-ink-soft" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Show trading stats
                    </p>
                    <p className="text-xs text-ink-mute">
                      Win rate, P&amp;L, trades va Avg R profilingizda
                      ko&apos;rinsin.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={profile.statsVisible !== false}
                  onCheckedChange={(checked) =>
                    onProfileChange({ ...profile, statsVisible: checked })
                  }
                  aria-label="Show trading stats on profile"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 border-t border-white/8 bg-black px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSave}>
              {saved ? <Check size={17} /> : null}
              {saved ? "Saved" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
