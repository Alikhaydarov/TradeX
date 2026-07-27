import { redirect } from "next/navigation";

import { LandingRoute } from "@/components/landing-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  if (data.user) redirect("/home");

  return <LandingRoute />;
}
