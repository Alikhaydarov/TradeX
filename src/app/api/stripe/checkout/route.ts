import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { billingSecurityError, consumeBillingAttempt, isTrustedBillingOrigin } from "@/lib/backend/billing-security";
import { getPremiumStatus } from "@/lib/backend/premium";
import { getAppUrl, getPremiumPlan, getStripe, type PremiumPlan } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedBillingOrigin(request)) return billingSecurityError("Invalid request origin.", 403);
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  if (!consumeBillingAttempt(auth.user.id)) return billingSecurityError("Too many billing requests. Try again shortly.", 429);

  const body = (await request.json().catch(() => ({}))) as { plan?: PremiumPlan };
  const plan = getPremiumPlan(body.plan);
  if (!plan) return badRequest("Choose a valid Premium plan.");
  if (!plan.priceId) return serverError("Stripe price ID is missing for this plan.");

  try {
    const premium = await getPremiumStatus(auth);
    if (premium.isPremium) {
      return Response.json(
        { error: "Premium is already active on this account.", upgradeUrl: "/pricing" },
        { status: 409 },
      );
    }

    const stripe = getStripe();
    const profileRes = await auth.supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", auth.user.id)
      .maybeSingle();

    const appUrl = getAppUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled&plan=${plan.id}`,
      allow_promotion_codes: true,
      client_reference_id: auth.user.id,
      customer_email: auth.user.email ?? undefined,
      metadata: {
        userId: auth.user.id,
        plan: plan.id,
        username: profileRes.data?.username ?? "",
      },
      subscription_data: {
        metadata: {
          userId: auth.user.id,
          plan: plan.id,
          fullName: profileRes.data?.full_name ?? "",
        },
      },
    }, {
      idempotencyKey: `checkout:${auth.user.id}:${plan.id}:${Math.floor(Date.now() / 300_000)}`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed", error);
    return serverError("Stripe checkout could not start.");
  }
}
