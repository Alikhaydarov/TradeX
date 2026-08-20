import type { Metadata } from "next";

import { ProfileRouteContent } from "@/components/routes/profile-route-content";

type UsernameProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: UsernameProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)} | Tradoxy` };
}

export default async function UsernameProfilePage({
  params,
}: UsernameProfilePageProps) {
  const { username } = await params;
  return <ProfileRouteContent username={decodeURIComponent(username)} />;
}
