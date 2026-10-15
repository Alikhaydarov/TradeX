import { redirect } from "next/navigation";
import { PageHeader, Panel } from "@/components/page-primitives";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await supabase.from("profiles").select("username,full_name,avatar_url").eq("id", user.id).maybeSingle();
  const fallbackName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Trader");
  return <div className="space-y-4"><PageHeader eyebrow="Preferences" title="Profile settings" description="Manage the identity traders see on your public profile and posts."/><Panel title="Basic information" description="Your email is managed securely by your sign-in provider."><ProfileSettingsForm email={user.email ?? ""} username={profile?.username ?? ""} name={profile?.full_name ?? fallbackName} avatar={profile?.avatar_url ?? null}/></Panel></div>;
}
