import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  const configured = isSupabaseConfigured();

  return Response.json({
    ok: configured,
    configured,
    service: "tradex-api",
    runtime: "nodejs",
    timestamp: new Date().toISOString(),
  }, { status: configured ? 200 : 503 });
}
