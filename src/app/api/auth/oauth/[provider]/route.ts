import type { Provider } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ENABLED_PROVIDERS = new Set<Provider>(["google", "apple"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const url = new URL(request.url);
  const { provider } = await context.params;
  const origin = url.origin;

  if (!ENABLED_PROVIDERS.has(provider as Provider)) {
    return NextResponse.redirect(`${origin}/?auth_error=unsupported_provider`);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/?auth_error=not_configured`);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
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
