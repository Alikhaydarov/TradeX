import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/?auth_error=not_configured`);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/?auth_error=oauth_start`);
  }

  return NextResponse.redirect(data.url);
}
