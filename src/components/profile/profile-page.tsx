"use client";

import dynamic from "next/dynamic";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { ProfileAchievements } from "./profile-achievements";
import { ProfileHeader } from "./profile-header";
import { ProfilePosts } from "./profile-posts";
import { useProfileController } from "./use-profile-controller";

const ProfileAchievementDialogs = dynamic(
  () =>
    import("./profile-achievement-dialogs").then(
      (module) => module.ProfileAchievementDialogs,
    ),
  { ssr: false },
);

const ProfileConnectionsDialog = dynamic(
  () =>
    import("./profile-connections-dialog").then(
      (module) => module.ProfileConnectionsDialog,
    ),
  { ssr: false },
);

const ProfileEditDialog = dynamic(
  () =>
    import("./profile-edit-dialog").then((module) => module.ProfileEditDialog),
  { ssr: false },
);

export type ProfilePageProps = {
  onLogin: () => void;
  profileUsername?: string;
};

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-0 sm:px-4 sm:py-4" aria-label="Loading profile" role="status">
      <div className="overflow-hidden border-y border-xborder bg-xsurface sm:rounded-2xl sm:border">
        <div className="h-28 animate-pulse bg-xpanel sm:h-40" />
        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-10 size-20 animate-pulse rounded-full border-4 border-xsurface bg-xraised sm:-mt-12 sm:size-24" />
          <div className="mt-4 h-5 w-44 animate-pulse rounded bg-xraised" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-xpanel" />
          <div className="mt-5 h-3 w-72 max-w-full animate-pulse rounded bg-xpanel" />
          <div className="mt-5 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl border border-xborder bg-xpanel" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 h-48 animate-pulse rounded-2xl border border-xborder bg-xsurface" />
    </div>
  );
}

export function ProfilePage({ onLogin, profileUsername }: ProfilePageProps) {
  const router = useRouter();
  const controller = useProfileController(profileUsername);

  if (!controller.user) {
    return (
      <div className="min-h-full bg-xcanvas">
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-xborder bg-xsurface shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
            <UserRound size={34} className="text-xmuted" />
          </div>
          <h2 className="mt-6 text-2xl font-black tracking-tight">Create your trader profile</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-xmuted">
            Sign in to keep your posts, achievements and trading identity synced.
          </p>
          <button
            onClick={onLogin}
            className="mt-6 rounded-xl bg-white px-6 py-2.5 text-sm font-black text-black transition hover:bg-zinc-200"
          >
            Sign in with Google
          </button>
          {!controller.configured ? (
            <p className="mt-4 text-xs text-amber-300">Demo mode is active.</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (controller.loadingProfile && !controller.profile) {
    return <ProfileSkeleton />;
  }

  if (!controller.profile) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-xcanvas text-xmuted">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="min-h-full bg-xcanvas pb-8">
      {controller.error ? (
        <div className="mx-auto mt-3 max-w-4xl rounded-xl border border-rose-300/15 bg-rose-400/[.07] px-4 py-3 text-sm text-rose-200">
          {controller.error}
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl px-0 sm:px-4 sm:py-4">
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

      {controller.achievementOpen || controller.viewingAchievement ? (
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
      ) : null}

      {controller.editOpen ? (
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
      ) : null}

      {controller.connectionsOpen ? (
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
      ) : null}
    </div>
  );
}
