"use client";

import { BrainCircuit, Check, Crown, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";

interface PremiumStatus {
  isPremium: boolean;
  aiEnabled: boolean;
  traderoxEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
}

interface StripeConfigStatus {
  configured: boolean;
  missingEnv?: string[];
  plans?: Array<{
    id: "standard" | "pro";
    name: string;
    productName: string;
    amount: number;
    currency: "USD";
    interval: "month";
    linked: boolean;
    priceId: string | null;
  }>;
}

type BillingPlan = {
  id: "standard" | "pro";
  name: string;
  price: string;
  tagline: string;
  features: string[];
  accent: string;
};

const plans: BillingPlan[] = [
  {
    id: "standard",
    name: "Standard",
    price: "$15/mo",
    tagline: "Verified profile, AI review, MT5 Auto Sync.",
    features: [
      "Blue verified badge",
      "AI trade analysis",
      "MT5 Auto Sync",
      "Read-only trade history analytics",
    ],
    accent: "from-sky-300/30 to-white/5",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$25/mo",
    tagline: "Built for heavier journals and upcoming pro connectors.",
    features: [
      "Everything in Standard",
      "Priority sync queue",
      "Advanced AI coaching",
      "Early access to pro connector stack",
    ],
    accent: "from-amber-300/25 to-white/5",
  },
];

export function Pricing({ onLogin }: { onLogin?: () => void } = {}) {
  const { user } = useAuth();
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [billingPlans, setBillingPlans] = useState<StripeConfigStatus["plans"]>([]);
  const [missingEnv, setMissingEnv] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPremium(null);
      return;
    }

    let active = true;
    apiRequest<PremiumStatus>("/api/premium/status")
      .then((data) => {
        if (active) setPremium(data);
      })
      .catch(() => {
        if (active) setPremium(null);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    apiRequest<StripeConfigStatus>("/api/stripe/config")
      .then((data) => {
        if (active) {
          setBillingConfigured(Boolean(data.configured));
          setBillingPlans(data.plans ?? []);
          setMissingEnv(data.missingEnv ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setBillingConfigured(false);
          setBillingPlans([]);
          setMissingEnv([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") setMessage("Premium checkout completed. Stripe webhook is syncing your account now.");
    if (checkout === "cancelled") setError("Checkout was cancelled before the subscription was created.");
  }, []);

  const activeFeatures = useMemo(
    () => [
      { label: "Verified badge", active: Boolean(premium?.isVerified) },
      { label: "AI trade analysis", active: Boolean(premium?.aiEnabled) },
      { label: "AI coach", active: Boolean(premium?.traderoxEnabled) },
      { label: "MT5 Auto Sync", active: Boolean(premium?.autoSyncEnabled) },
    ],
    [premium],
  );

  const unlinkedPlans = useMemo(
    () => (billingPlans ?? []).filter((plan) => !plan.linked),
    [billingPlans],
  );

  const startCheckout = async (plan: BillingPlan) => {
    if (!user) {
      onLogin?.();
      return;
    }

    setCheckoutPlan(plan.id);
    setError(null);
    setMessage(null);

    if (!billingConfigured) {
      setCheckoutPlan(null);
      setError("Stripe billing is not configured yet. Add Stripe keys and price IDs to enable checkout.");
      return;
    }

    try {
      const response = await apiRequest<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id }),
      });
      window.location.assign(response.url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Stripe checkout could not start.");
    } finally {
      setCheckoutPlan(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ url: string }>("/api/stripe/portal", { method: "POST" });
      window.location.assign(response.url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Billing portal is not ready yet.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background px-3 py-6 text-foreground sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050505] p-4 shadow-[0_28px_90px_rgba(0,0,0,.52)] sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <Badge className="rounded-full bg-white text-black hover:bg-white">
                <Crown className="size-3.5" /> Tradox Premium
              </Badge>
              <h1 className="mt-3 max-w-2xl text-2xl font-black tracking-tight text-white sm:text-4xl">
                Turn your journal into a verified trading workspace.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Premium unlocks the blue badge, AI trade coaching and MT5 Auto Sync, so your profile, journal and account analytics stay in one fast loop.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Verified badge", "AI trade coach", "MT5 Auto Sync", "Read-only analytics"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs font-bold text-zinc-300">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["$15", "Standard"],
                  ["$25", "Pro"],
                  ["24/7", "Sync flow"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-[#0b0b0b] px-3 py-3">
                    <p className="text-base font-black text-white sm:text-lg">{value}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-white/10 bg-[#0b0b0b] py-0">
              <CardHeader className="px-4 py-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="size-5 text-sky-300" /> Current account access
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {premium?.isPremium
                    ? "Your Premium features are active."
                    : "Free accounts can still use the feed, profile, and journal."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 px-4 pb-4">
                {activeFeatures.map((feature) => (
                  <div key={feature.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                    <span className="text-sm font-semibold text-white">{feature.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${feature.active ? "bg-emerald-400/15 text-emerald-300" : "bg-[#161616] text-zinc-500"}`}>
                      {feature.active ? "Enabled" : "Locked"}
                    </span>
                  </div>
                ))}
              </CardContent>
              {premium?.isPremium ? (
                <CardFooter className="justify-end gap-2 border-white/8 bg-[#090909] px-4">
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl border-white/10 bg-transparent text-zinc-200 hover:bg-white/[.04]"
                    onClick={() => {
                      window.history.pushState(null, "", "/account");
                      window.dispatchEvent(new Event("popstate"));
                    }}
                  >
                    Open account
                  </Button>
                  <Button
                    className="h-10 rounded-2xl bg-white text-black hover:bg-zinc-200"
                    onClick={() => void openPortal()}
                    disabled={portalLoading}
                  >
                    {portalLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    Manage billing
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          </div>
        </section>

        {!billingConfigured ? (
          <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Stripe pricing UI is ready, but checkout stays locked until `STRIPE_SECRET_KEY`,
            `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STANDARD_MONTHLY`, and
            `STRIPE_PRICE_PRO_MONTHLY` are set on the server.
          </div>
        ) : null}
        {!billingConfigured && missingEnv.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-zinc-300">
            Missing environment values: {missingEnv.join(", ")}
          </div>
        ) : null}
        {!billingConfigured && unlinkedPlans.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-zinc-300">
            Missing Stripe plan links:{" "}
            {unlinkedPlans.map((plan) => `${plan.productName} (${plan.name})`).join(", ")}
          </div>
        ) : null}
        {message ? <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          {plans.map((plan) => {
            const loading = checkoutPlan === plan.id;
            return (
              <Card key={plan.id} className="relative overflow-hidden border-white/10 bg-[#0b0b0b] py-0">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/6 to-transparent" />
                <CardHeader className="relative px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white">{plan.name}</CardTitle>
                        {plan.id === "pro" ? <Badge variant="secondary" className="rounded-full bg-amber-300/15 text-amber-200">Best for scaling</Badge> : null}
                      </div>
                      <CardDescription className="mt-2 text-zinc-400">{plan.tagline}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">{plan.price}</div>
                      <div className="text-xs text-zinc-500">per month</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-2.5 px-4 pb-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                      <span className="mt-0.5 rounded-full bg-emerald-400/10 p-1 text-emerald-300">
                        <Check className="size-3.5" />
                      </span>
                      <span className="text-sm leading-6 text-zinc-200">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="relative flex-col items-stretch gap-2.5 border-white/8 bg-[#090909] px-4">
                  <Button
                    className="h-12 rounded-2xl bg-white text-black hover:bg-zinc-200"
                    onClick={() => void startCheckout(plan)}
                    disabled={loading || !billingConfigured || Boolean(premium?.isPremium)}
                  >
                    {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    {!billingConfigured
                      ? "Stripe setup required"
                      : premium?.isPremium
                        ? "Premium already active"
                        : user
                          ? `Start ${plan.name}`
                          : "Sign in to subscribe"}
                  </Button>
                  <p className="text-xs leading-5 text-zinc-500">
                    {premium?.isPremium
                      ? "Use Manage billing above to update or cancel your current Stripe subscription."
                      : "Secure Stripe subscription. Premium instantly unlocks blue badge, AI analysis and MT5 Auto Sync after webhook confirmation."}
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="py-0">
            <CardHeader className="px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <BrainCircuit className="size-5 text-sky-300" /> What changes after upgrade
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Premium is designed for traders who want verified proof, coaching and clean sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
              {[
                ["Verified profile", "Your badge becomes visible across feed, profile and replies."],
                ["AI coaching", "Trade analysis endpoints unlock for review summaries and risk prompts."],
                ["Auto Sync", "MT5 account connections become available inside account settings."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-3xl border border-white/8 bg-[#0d0d0d] p-4">
                  <h3 className="text-sm font-black text-white">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-500">{body}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="px-4 py-4">
              <CardTitle className="text-white">Notes</CardTitle>
              <CardDescription className="text-zinc-400">
                A few practical things before going live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {[
                "Billing uses Stripe subscriptions and can be managed later from the customer portal.",
                "Premium access is controlled on the backend, so locked APIs stay protected even if the UI is bypassed.",
                "Pro tier is ready for future advanced AI and connector features without changing today's base app flow.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 py-3 text-sm leading-6 text-zinc-300">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
