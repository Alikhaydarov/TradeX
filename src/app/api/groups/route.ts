import { serverError } from "@/lib/backend/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return serverError("Database ulanmagan.");

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, description, avatar")
    .order("created_at");

  if (error) return serverError(error.message);
  return Response.json({ groups: data });
}

