import type { Metadata } from "next";

import { ProfileRoute } from "@/components/routes/workspace-pages";

export const metadata: Metadata = {
  title: "Profile | Tradox",
};

export default function ProfilePage() {
  return <ProfileRoute />;
}
