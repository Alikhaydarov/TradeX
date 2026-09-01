import { authenticateRequest } from "@/lib/backend/auth";
import { getPremiumPlans, isStripeBillingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const REQUIRED_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STANDARD_MONTHLY",
  "STRIPE_PRICE_PRO_MONTHLY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

async function isAdminRequest(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return false;
  const { data, error } = await auth.supabase.rpc("is_admin");
  return !error && Boolean(data);
}

/**
 * What the pricing page needs to decide whether checkout can run.
 *
 * `missingEnv` names which server secrets are unset - useful when setting the
 * project up, but it is a map of the production configuration's gaps, so it is
 * only returned to admins. Everyone else gets the single fact they need: the
 * checkout button works, or it does not. Stripe price IDs are likewise dropped
 * from the public shape; nothing in the client uses them.
 */
export async function GET(request: Request) {
  const plans = getPremiumPlans();
  const configured = isStripeBillingConfigured();

  // The admin check costs an auth round-trip, and the only thing it unlocks is
  // the setup diagnostics - which are all empty once billing works. So on a
  // healthy deployment (the common case, and the one every visitor to /pricing
  // hits) this route does no auth work at all.
  const admin = configured ? false : await isAdminRequest(request);

  return Response.json(
    {
      configured,
      ...(admin
        ? {
            missingEnv: REQUIRED_ENV.filter((name) => !process.env[name]),
          }
        : {}),
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        productName: plan.productName,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        linked: Boolean(plan.priceId),
        ...(admin ? { priceId: plan.priceId || null } : {}),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
