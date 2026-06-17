import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

/**
 * Service-role client. This BYPASSES Row Level Security, so it must only be
 * used inside trusted server code (API routes, server actions) and must
 * never be exposed to the browser. It exists specifically so we can fan out
 * push notifications to *other* users' devices (e.g. other chat members or
 * followers) without having to make push_tokens readable to every
 * authenticated client.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
