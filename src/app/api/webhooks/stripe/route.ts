import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const ACTIVE_PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

type StripeSubscriptionLike = Pick<
  Stripe.Subscription,
  "id" | "status" | "customer" | "metadata"
> & {
  cancel_at?: number | null;
  current_period_end?: number | null;
};

async function syncSubscription(subscription: StripeSubscriptionLike) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Stripe webhooks.");

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId =
    subscription.metadata.userId ||
    (
      await admin
        .from("subscriptions")
        .select("user_id")
        .eq("provider_subscription_id", subscription.id)
        .limit(1)
        .maybeSingle()
    ).data?.user_id;

  if (!userId) throw new Error(`No userId linked to Stripe subscription ${subscription.id}.`);

  const plan = subscription.metadata.plan || "standard";
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const { data: existing, error: findError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subscription.id)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  const subscriptionPayload = {
    user_id: userId,
    provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: subscription.id,
    status: subscription.status,
    plan,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  const subscriptionMutation = existing?.id
    ? admin.from("subscriptions").update(subscriptionPayload).eq("id", existing.id)
    : admin.from("subscriptions").insert({
        ...subscriptionPayload,
        created_at: new Date().toISOString(),
      });

  const { error: subscriptionError } = await subscriptionMutation;
  if (subscriptionError) throw new Error(subscriptionError.message);

  const premiumActive = ACTIVE_PREMIUM_STATUSES.has(subscription.status);
  const profilePayload = premiumActive
    ? {
        plan: "premium",
        premium_until: currentPeriodEnd,
        is_verified: true,
        ai_enabled: true,
        traderox_enabled: true,
        auto_sync_enabled: true,
      }
    : {
        plan: "free",
        premium_until: currentPeriodEnd,
        ai_enabled: false,
        traderox_enabled: false,
        auto_sync_enabled: false,
      };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profilePayload)
    .eq("id", userId);

  if (profileError) throw new Error(profileError.message);
}

async function loadSubscriptionFromEvent(event: Stripe.Event) {
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    return event.data.object as StripeSubscriptionLike;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!session.subscription) return null;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    return getStripe().subscriptions.retrieve(subscriptionId);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.parent === "object" && invoice.parent?.subscription_details?.subscription
        ? String(invoice.parent.subscription_details.subscription)
        : null;
    if (!subscriptionId) return null;
    return getStripe().subscriptions.retrieve(subscriptionId);
  }

  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is missing." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const subscription = await loadSubscriptionFromEvent(event);
    if (subscription) await syncSubscription(subscription);
    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Stripe webhook failed." },
      { status: 500 },
    );
  }
}
