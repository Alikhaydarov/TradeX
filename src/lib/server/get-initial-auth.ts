import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function getInitialAuth() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { initialUser: null, initialConfigured: false };

  const { data } = await supabase.auth.getUser();

  return {
    initialUser: data.user ?? null,
    initialConfigured: isSupabaseConfigured(),
  };
}
