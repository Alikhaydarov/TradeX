import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface ApiAuth {
  supabase: SupabaseClient;
  user: User;
}

export async function authenticateRequest(request: Request): Promise<ApiAuth | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { supabase, user: data.user };
  }

  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { supabase, user: data.user };
}

export function unauthorized() {
  return Response.json(
    { error: "Bu amal uchun Google orqali kirish kerak." },
    { status: 401 },
  );
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function serverError(message = "Serverda xatolik yuz berdi.") {
  return Response.json({ error: message }, { status: 500 });
}
