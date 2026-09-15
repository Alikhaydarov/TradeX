import type { Metadata } from "next";

import { ProfileRouteContent } from "@/components/routes/workspace-route-content";
import type { ProfileSeed } from "@/components/profile/use-profile-controller";
import { loadProfileView } from "@/lib/server/profile-view";
import { getServerAuth } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const { supabase, user } = await getServerAuth();
  if (!supabase || !user) return <ProfileRouteContent />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle<{ username: string }>();
  if (!profile?.username) return <ProfileRouteContent />;

  const result = await loadProfileView(profile.username, user.id);
  return (
    <ProfileRouteContent
      username={profile.username}
      seed={result.data as ProfileSeed | undefined}
    />
  );
}
