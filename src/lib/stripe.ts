import Stripe from "stripe";

export type PremiumPlan = "standard" | "pro";

type PlanConfig = {
  id: PremiumPlan;
  name: string;
  priceId: string;
  amount: number;
};

let stripeSingleton: Stripe | null = null;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Stripe billing.`);
  return value;
}

export function getStripe() {
  if (stripeSingleton) return stripeSingleton;

  stripeSingleton = new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });

  return stripeSingleton;
}

export function getAppUrl(request?: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

export function getPremiumPlans(): PlanConfig[] {
  return [
    {
      id: "standard",
      name: "Standard",
      priceId: process.env.STRIPE_PRICE_STANDARD_MONTHLY ?? "",
      amount: 15,
    },
    {
      id: "pro",
      name: "Pro",
      priceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
      amount: 25,
    },
  ];
}

export function getPremiumPlan(plan: string | null | undefined) {
  return getPremiumPlans().find((item) => item.id === plan) ?? null;
}

export function isStripeBillingConfigured() {
  const plans = getPremiumPlans();
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    plans.every((plan) => plan.priceId),
  );
}
