import { redirect } from "next/navigation";
import { getWorkspaceBootstrap } from "@/lib/workspace-bootstrap";

export default async function ProfilePage() {
  const { profile } = await getWorkspaceBootstrap();
  redirect(
    profile?.username
      ? `/u/${encodeURIComponent(profile.username)}`
      : "/settings/profile",
  );
}
