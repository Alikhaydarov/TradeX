import type { Metadata } from "next";

import { ProfileRouteContent } from "@/components/routes/workspace-route-content";
import type { ProfileSeed } from "@/components/profile/use-profile-controller";
import { loadProfileView } from "@/lib/server/profile-view";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type UsernameProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: UsernameProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default async function UsernameProfilePage({
  params,
}: UsernameProfilePageProps) {
  const { username } = await params;
  const handle = decodeURIComponent(username);

  // Resolved here rather than from a useEffect after hydration. Opening someone
  // else's profile used to mean waiting for the bundle, then the route chunk,
  // then this query - three serial waits before the page showed anything.
  const supabase = await getSupabaseServerClient();
  const { data: viewer } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const result = await loadProfileView(handle, viewer.user?.id ?? null);

  return (
    <ProfileRouteContent
      username={handle}
      seed={result.data as ProfileSeed | undefined}
    />
  );
}
