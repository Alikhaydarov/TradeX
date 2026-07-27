"use client";

import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { ProfileAchievementDialogs } from "./profile-achievement-dialogs";
import { ProfileAchievements } from "./profile-achievements";
import { ProfileConnectionsDialog } from "./profile-connections-dialog";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { ProfileHeader } from "./profile-header";
import { ProfilePosts } from "./profile-posts";
import { useProfileController } from "./use-profile-controller";

export type ProfilePageProps = {
  onLogin: () => void;
  profileUsername?: string;
};

export function ProfilePage({ onLogin, profileUsername }: ProfilePageProps) {
  const router = useRouter();
  const controller = useProfileController(profileUsername);

  if (!controller.user) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-white/8 bg-black px-4">
          <h1 className="text-xl font-extrabold">Profile</h1>
        </header>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-[#080808]">
            <UserRound size={36} className="text-xmuted" />
          </div>
          <h2 className="mt-6 text-2xl font-black">Create your profile</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-xmuted">
            Sign in with Google to save your posts, chats, and trading profile in
            the cloud.
          </p>
          <button
            onClick={onLogin}
            className="mt-6 rounded-full bg-white px-7 py-3 font-bold text-black"
          >
            Sign in with Google
          </button>
          {!controller.configured ? (
            <p className="mt-4 text-xs text-amber-300">Demo mode is active.</p>
          ) : null}
        </div>
      </>
    );
  }

  if (controller.loadingProfile && !controller.profile) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="h-14 border-b border-border bg-card" />
        <div className="mx-auto max-w-3xl animate-pulse px-3 py-4 sm:px-5">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="h-32 bg-[#080808] sm:h-44" />
            <div className="px-5 pb-6">
              <div className="-mt-10 size-24 rounded-full border-4 border-card bg-zinc-800 sm:-mt-14 sm:size-28" />
              <div className="mt-4 h-6 w-44 rounded bg-zinc-800" />
              <div className="mt-3 h-4 w-28 rounded bg-zinc-900" />
              <div className="mt-6 h-4 w-72 max-w-full rounded bg-zinc-900" />
            </div>
          </div>
          <div className="mt-3 h-48 rounded-lg border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (!controller.profile) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-slate-500">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0b0b0b]">
      {controller.error ? (
        <div className="mx-auto mt-3 max-w-5xl rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {controller.error}
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-0 sm:px-4 sm:py-3">
        <ProfileHeader
          profile={controller.profile}
          stats={controller.stats}
          isOwnProfile={controller.isOwnProfile}
          saved={controller.saved}
          uploadingBanner={controller.uploadingBanner}
          bannerInputRef={controller.bannerInputRef}
          postCount={controller.posts.length}
          followLoading={controller.followLoading}
          onBannerFile={(file) => void controller.uploadBanner(file)}
          onSignOut={() => void controller.signOut()}
          onOpenEdit={controller.openEdit}
          onToggleFollow={() => void controller.toggleFollow()}
          onOpenConnections={controller.openConnections}
        />
        <ProfileAchievements
          achievements={controller.achievements}
          isOwnProfile={controller.isOwnProfile}
          onAdd={() => controller.setAchievementOpen(true)}
          onView={controller.setViewingAchievement}
          onRemove={(id) => void controller.removeAchievement(id)}
        />
        <ProfilePosts
          posts={controller.posts}
          activeTab={controller.activeTab}
          loading={controller.loadingProfile}
          onTabChange={controller.setActiveTab}
          observePostView={controller.observePostView}
        />
      </div>

      <ProfileAchievementDialogs
        addOpen={controller.achievementOpen}
        viewing={controller.viewingAchievement}
        type={controller.achievementType}
        title={controller.achievementTitle}
        issuer={controller.achievementIssuer}
        image={controller.achievementImage}
        busy={controller.achievementBusy}
        onAddOpenChange={controller.setAchievementOpen}
        onViewingChange={controller.setViewingAchievement}
        onTypeChange={controller.setAchievementType}
        onTitleChange={controller.setAchievementTitle}
        onIssuerChange={controller.setAchievementIssuer}
        onImageFile={(file) => void controller.uploadAchievementImage(file)}
        onSave={() => void controller.addAchievement()}
      />
      <ProfileEditDialog
        open={controller.editOpen}
        profile={controller.draftProfile}
        saved={controller.saved}
        error={controller.error}
        uploadingAvatar={controller.uploadingAvatar}
        uploadingBanner={controller.uploadingBanner}
        avatarInputRef={controller.avatarInputRef}
        onOpenChange={controller.setEditOpen}
        onProfileChange={controller.setDraftProfile}
        onAvatarFile={(file) => void controller.uploadAvatar(file)}
        onBannerClick={() => controller.bannerInputRef.current?.click()}
        onSignOut={() => void controller.signOut()}
        onSave={() => void controller.save()}
      />
      <ProfileConnectionsDialog
        type={controller.connectionsOpen}
        profile={controller.profile}
        users={controller.connections}
        loading={controller.connectionsLoading}
        actingId={controller.connectionsActingId}
        onClose={() => controller.setConnectionsOpen(null)}
        onOpenProfile={(username) => {
          router.push(`/${username.replace(/^@/, "").toLowerCase()}`);
          window.dispatchEvent(new Event("tradeup:open-profile"));
          controller.setConnectionsOpen(null);
        }}
        onToggleFollow={(item) => void controller.toggleConnectionFollow(item)}
      />
    </div>
  );
}
