import type { Metadata } from "next";

import { ProfileRoute } from "@/components/routes/workspace-pages";

type UsernameProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: UsernameProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)} | Tradox` };
}

export default async function UsernameProfilePage({
  params,
}: UsernameProfilePageProps) {
  const { username } = await params;
  return <ProfileRoute username={decodeURIComponent(username)} />;
}
