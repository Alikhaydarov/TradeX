import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSelectedAccountId } from "@/lib/selected-account";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  let user: { name: string; email: string; initials: string } | undefined;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/sign-in");
    if (data.user) {
      const name = String(data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Trader");
      user = { name, email: data.user.email || "", initials: name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase() };
    }
  }
  const selectedAccountId = await getSelectedAccountId();
  return <AppShell user={user} initialSelectedAccountId={selectedAccountId}>{children}</AppShell>;
}
