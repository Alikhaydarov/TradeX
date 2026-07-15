import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { billingSecurityError, consumeBillingAttempt, isTrustedBillingOrigin } from "@/lib/backend/billing-security";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

interface SubscriptionRow {
  provider_customer_id: string | null;
  status: string | null;
}

export async function POST(request: Request) {
  if (!isTrustedBillingOrigin(request)) return billingSecurityError("Invalid request origin.", 403);
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  if (!(await consumeBillingAttempt(auth.user.id))) return billingSecurityError("Too many billing requests. Try again shortly.", 429);

  try {
    const { data, error } = await auth.supabase
      .from("subscriptions")
      .select("provider_customer_id, status")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("Stripe portal customer lookup failed", error);
      return serverError("Billing account could not be loaded.");
    }
    if (!data?.provider_customer_id) {
      return Response.json({ error: "No Stripe customer found for this account." }, { status: 404 });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: data.provider_customer_id,
      return_url: `${getAppUrl(request)}/pricing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed", error);
    return serverError("Stripe portal could not open.");
  }
}
