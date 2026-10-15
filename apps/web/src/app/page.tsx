import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function Home() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    redirect(data?.claims ? "/dashboard" : "/sign-in");
  }
  redirect("/sign-in?error=configuration");
}

