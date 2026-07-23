import type { ApiAuth } from "./auth";
import { isPremiumActive, isPremiumPlan } from "@/lib/premium-plan";

export interface PremiumStatus {
  plan: "free" | "standard" | "pro";
  isPremium: boolean;
  aiEnabled: boolean;
  traderoxEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
  billingManaged: boolean;
}

interface PremiumProfileRow {
  plan: string | null;
  premium_until: string | null;
  ai_enabled: boolean | null;
  traderox_enabled: boolean | null;
  auto_sync_enabled: boolean | null;
  is_verified: boolean | null;
}

interface ActiveSubscriptionRow {
  plan: string | null;
  current_period_end: string | null;
}

function normalizePremiumPlan(plan: string | null | undefined): PremiumStatus["plan"] {
  const normalized = plan?.toLowerCase();
  if (normalized === "standard" || normalized === "basic") return "standard";
  if (normalized === "pro" || normalized === "premium") return "pro";
  return "free";
}

export async function getPremiumStatus(auth: ApiAuth): Promise<PremiumStatus> {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("plan, premium_until, ai_enabled, traderox_enabled, auto_sync_enabled, is_verified")
    .eq("id", auth.user.id)
    .maybeSingle<PremiumProfileRow>();

  if (error) throw new Error(error.message);

  let plan = normalizePremiumPlan(data?.plan);
  let premiumUntil = data?.premium_until ?? null;
  let isPremium = isPremiumPlan(data?.plan) && isPremiumActive(premiumUntil);
  let accessFromSubscription = false;

  // Older Stripe records can exist before their profile row was synchronized.
  // Treat an active paid subscription as the source of truth while the
  // reconciliation migration repairs the corresponding profile access row.
  if (!isPremium) {
    const { data: subscription, error: subscriptionError } = await auth.supabase
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", auth.user.id)
      .in("status", ["active", "trialing", "past_due"])
      .in("plan", ["basic", "standard", "premium", "pro"])
      .order("current_period_end", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<ActiveSubscriptionRow>();

    if (subscriptionError) throw new Error(subscriptionError.message);
    if (subscription && isPremiumActive(subscription.current_period_end)) {
      plan = normalizePremiumPlan(subscription.plan);
      premiumUntil = subscription.current_period_end;
      isPremium = plan !== "free";
      accessFromSubscription = isPremium;
    }
  }

  let billingManaged = false;

  if (isPremium) {
    const { data: subscription, error: subscriptionError } = await auth.supabase
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", auth.user.id)
      .not("provider_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ provider_customer_id: string | null }>();

    if (subscriptionError) throw new Error(subscriptionError.message);
    billingManaged = Boolean(subscription?.provider_customer_id);
  }

  const proAiEnabled = isPremium && plan === "pro";

  return {
    plan,
    isPremium,
    aiEnabled: proAiEnabled,
    traderoxEnabled: proAiEnabled,
    autoSyncEnabled: isPremium && (accessFromSubscription || Boolean(data?.auto_sync_enabled)),
    isVerified: isPremium && (accessFromSubscription || Boolean(data?.is_verified)),
    billingManaged,
  };
}

export async function requirePremium(auth: ApiAuth) {
  const status = await getPremiumStatus(auth);
  if (!status.isPremium) {
    return Response.json(
      {
        error: "Bu funksiya faqat Premium foydalanuvchilar uchun.",
        upgradeUrl: "/pricing",
      },
      { status: 403 },
    );
  }
  return null;
}
