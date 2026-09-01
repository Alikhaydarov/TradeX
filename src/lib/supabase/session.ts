import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import { getSupabaseServerClient } from "./server";

export interface ServerAuth {
  supabase: SupabaseClient | null;
  user: User | null;
}

/**
 * The authenticated viewer for the current request, resolved at most once.
 *
 * `supabase.auth.getUser()` is not a local JWT decode - it is a real HTTP hop
 * to Supabase Auth. The root layout, the workspace bootstrap and the profile
 * page each needed the viewer, so a single page load used to pay for that hop
 * two or three times before anything could render. `cache()` collapses them
 * into one in-flight promise per request.
 *
 * Errors resolve to a null user rather than throwing: callers already treat
 * "signed out" as a valid state, and a transient auth failure should degrade
 * to the signed-out view instead of blowing up the whole render.
 */
export const getServerAuth = cache(async (): Promise<ServerAuth> => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };

  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : (data.user ?? null) };
});
