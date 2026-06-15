import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return Response.json({ ok: true });
}

