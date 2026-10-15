import { TraderProfile } from "@/components/trader-profile";

export default async function TraderProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <TraderProfile key={username.toLowerCase()} username={username} />;
}
