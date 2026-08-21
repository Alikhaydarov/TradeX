import type { Metadata } from "next";

import { ProfileRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  // The signed-in user's own profile still resolves on the client: it reads
  // /api/profile (no username), which depends on the session rather than a
  // route param, and the workspace bootstrap has already warmed that request.
  return <ProfileRouteContent />;
}
