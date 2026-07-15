import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPremiumPlanByPriceId, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const ACTIVE_PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);
const TRADEWAY_PAID_PLANS = new Set(["standard", "pro"]);
const ALLOWED_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
]);
const MAX_WEBHOOK_BYTES = 1_000_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StripeSubscriptionLike = Pick<
  Stripe.Subscription,
  "id" | "status" | "customer" | "metadata"
> & {
  items?: Stripe.ApiList<Stripe.SubscriptionItem>;
  cancel_at?: number | null;
  current_period_end?: number | null;
};

function resolvePlan(subscription: StripeSubscriptionLike) {
  const priceIds = subscription.items?.data.map((item) => item.price.id) ?? [];
  if (priceIds.length !== 1) throw new Error(`Subscription ${subscription.id} must contain exactly one price.`);
  const configuredPlan = getPremiumPlanByPriceId(priceIds[0]);
  if (!configuredPlan) throw new Error(`Subscription ${subscription.id} contains an unrecognized price.`);

  const metadataPlan = subscription.metadata.plan?.toLowerCase();
  if (metadataPlan && (!TRADEWAY_PAID_PLANS.has(metadataPlan) || metadataPlan !== configuredPlan.id)) {
    throw new Error(`Subscription ${subscription.id} plan metadata does not match its price.`);
  }
  return configuredPlan.id;
}

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

  if (!userId || !UUID_PATTERN.test(userId)) throw new Error(`No valid userId linked to Stripe subscription ${subscription.id}.`);

  const plan = resolvePlan(subscription);
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
        plan,
        premium_until: currentPeriodEnd,
        is_verified: true,
        ai_enabled: true,
        traderox_enabled: true,
        auto_sync_enabled: true,
      }
    : {
      plan: "free",
      premium_until: currentPeriodEnd,
      is_verified: false,
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
    const eventSubscription = event.data.object as Stripe.Subscription;
    return getStripe().subscriptions.retrieve(eventSubscription.id);
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
    console.error("Stripe webhook secret is not configured");
    return Response.json({ error: "Webhook is unavailable." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature || signature.length > 2_048) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Unsupported webhook content type." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret, 300);
  } catch (error) {
    console.error("Rejected webhook with invalid Stripe signature", error);
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (!ALLOWED_EVENTS.has(event.type)) {
    return Response.json({ received: true, ignored: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const usesLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
  if (event.livemode !== usesLiveKey) {
    console.error("Rejected Stripe webhook with mismatched livemode", { eventId: event.id, eventType: event.type });
    return Response.json({ error: "Webhook environment mismatch." }, { status: 400 });
  }

  try {
    const subscription = await loadSubscriptionFromEvent(event);
    if (subscription) await syncSubscription(subscription);
    return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Stripe webhook processing failed", { eventId: event.id, eventType: event.type, error });
    return Response.json(
      { error: "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}
