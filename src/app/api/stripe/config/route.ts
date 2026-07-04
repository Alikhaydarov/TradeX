import { isStripeBillingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    configured: isStripeBillingConfigured(),
  });
}
