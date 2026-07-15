import { getPremiumPlans, isStripeBillingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const plans = getPremiumPlans();
  const requiredEnv = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STANDARD_MONTHLY",
    "STRIPE_PRICE_PRO_MONTHLY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);

  return Response.json({
    configured: isStripeBillingConfigured(),
    missingEnv,
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      productName: plan.productName,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      linked: Boolean(plan.priceId),
      priceId: plan.priceId || null,
    })),
  });
}
