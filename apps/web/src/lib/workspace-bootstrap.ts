import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

// React's request cache shares this read between the layout and server pages.
export const getWorkspaceBootstrap = cache(async () => {
  const user = await getViewer();
  if (!user) return { user: null, profile: null, accounts: [] };
  const supabase = await createClient();
  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,username,avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("prop_accounts")
      .select("id,name,initial_balance")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return { user, profile, accounts: accounts ?? [] };
});
