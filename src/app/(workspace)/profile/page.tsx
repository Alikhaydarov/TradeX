import type { Metadata } from "next";

import { ProfileRouteContent } from "@/components/routes/workspace-route-content";

export const metadata: Metadata = {
  title: "Profile | Tradoxy",
};

export default function ProfilePage() {
  return <ProfileRouteContent />;
}
