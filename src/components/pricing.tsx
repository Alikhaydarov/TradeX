"use client";

import {
  BrainCircuit,
  Check,
  Crown,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface PremiumStatus {
  plan: "free" | "standard" | "pro";
  isPremium: boolean;
  aiEnabled: boolean;
  traderoxEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
  billingManaged: boolean;
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
};

const paidPlans: BillingPlan[] = [
  {
    id: "standard",
    name: "Standard",
    price: "$15/mo",
    tagline: "Verified trading workspace with account sync and expanded analytics.",
    features: [
      "Blue verified profile badge",
      "Multiple trading accounts",
      "MT5 and cTrader history imports",
      "Expanded journal analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$25/mo",
    tagline: "The complete Tradox workspace with account-scoped artificial intelligence.",
    features: [
      "Everything included in Standard",
      "Multilingual Tradox AI chat",
      "Account reports from journal data",
      "Smart risk, psychology and news notifications",
    ],
  },
];

const freeFeatures = [
  "Feed, profile and trade sharing",
  "Manual trade journal",
  "One trading account",
  "Core dashboard and calendar",
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
    void apiRequest<PremiumStatus>("/api/premium/status")
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
    void apiRequest<StripeConfigStatus>("/api/stripe/config")
      .then((data) => {
        if (!active) return;
        setBillingConfigured(Boolean(data.configured));
        setBillingPlans(data.plans ?? []);
        setMissingEnv(data.missingEnv ?? []);
      })
      .catch(() => {
        if (!active) return;
        setBillingConfigured(false);
        setBillingPlans([]);
        setMissingEnv([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setMessage("Subscription completed. Access is being synchronized now.");
    }
    if (params.get("checkout") === "cancelled") {
      setError("Checkout was cancelled before the subscription was created.");
    }
  }, []);

  const unlinkedPlans = useMemo(
    () => (billingPlans ?? []).filter((plan) => !plan.linked),
    [billingPlans],
  );

  const activeFeatures = [
    { label: "Verified badge", active: Boolean(premium?.isVerified) },
    { label: "Account Auto Sync", active: Boolean(premium?.autoSyncEnabled) },
    { label: "Tradox AI chat", active: Boolean(premium?.aiEnabled) },
    { label: "AI smart notifications", active: Boolean(premium?.traderoxEnabled) },
  ];

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ url: string }>("/api/stripe/portal", {
        method: "POST",
      });
      window.location.assign(response.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Billing portal is not ready yet.");
    } finally {
      setPortalLoading(false);
    }
  };

  const startCheckout = async (plan: BillingPlan) => {
    if (!user) {
      onLogin?.();
      return;
    }
    if (premium?.isPremium) {
      await openPortal();
      return;
    }
    if (!billingConfigured) {
      setError("Stripe billing is not configured yet.");
      return;
    }

    setCheckoutPlan(plan.id);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id }),
      });
      window.location.assign(response.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Stripe checkout could not start.");
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background px-3 py-5 text-foreground sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#050505] p-5 shadow-[0_28px_90px_rgba(0,0,0,.52)] sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <Badge className="rounded-full bg-white text-black hover:bg-white">
                <Crown className="size-3.5" /> Tradox plans
              </Badge>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Choose the tools your trading workflow actually needs.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                Standard unlocks verification and account sync. Pro adds Tradox AI chat, account reports and smart notifications generated from the selected journal account.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Verified badge", "Account imports", "Tradox AI on Pro", "Server-side access control"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs font-semibold text-zinc-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <Card className="border-white/10 bg-[#0b0b0b] py-0">
              <CardHeader className="px-4 py-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="size-5 text-amber-300" /> Current account access
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {premium?.isPremium
                    ? `Your ${premium.plan === "pro" ? "Pro" : "Standard"} access is active.`
                    : "Free accounts can still use the feed, profile and manual journal."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 px-4 pb-4">
                {activeFeatures.map((feature) => (
                  <div key={feature.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                    <span className="text-sm font-semibold text-white">{feature.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${feature.active ? "bg-emerald-400/15 text-emerald-300" : "bg-[#161616] text-zinc-500"}`}>
                      {feature.active ? "Enabled" : "Locked"}
                    </span>
                  </div>
                ))}
              </CardContent>
              {premium?.isPremium ? (
                <CardFooter className="justify-end border-white/8 bg-[#090909] px-4">
                  {premium.billingManaged ? (
                    <Button onClick={() => void openPortal()} disabled={portalLoading} className="h-10 rounded-xl bg-white text-black hover:bg-zinc-200">
                      {portalLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      Manage billing
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="h-10 rounded-xl bg-sky-400/10 px-4 text-sky-200">
                      Managed by admin
                    </Badge>
                  )}
                </CardFooter>
              ) : null}
            </Card>
          </div>
        </section>

        {!billingConfigured ? (
          <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Stripe checkout is locked until the server Stripe keys and both monthly price IDs are configured.
          </div>
        ) : null}
        {!billingConfigured && missingEnv.length ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-xs text-zinc-400">
            Missing environment values: {missingEnv.join(", ")}
          </div>
        ) : null}
        {!billingConfigured && unlinkedPlans.length ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-xs text-zinc-400">
            Missing Stripe plan links: {unlinkedPlans.map((plan) => `${plan.productName} (${plan.name})`).join(", ")}
          </div>
        ) : null}
        {message ? <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <section className="mt-4 grid gap-3 lg:grid-cols-3">
          <PlanCard
            name="Free"
            price="$0"
            tagline="The essentials for starting a focused trading journal."
            features={freeFeatures}
            current={premium?.plan === "free"}
            actionLabel={premium?.plan === "free" ? "Current plan" : "Continue with Free"}
            onAction={() => {
              window.history.pushState(null, "", "/");
              window.dispatchEvent(new Event("popstate"));
            }}
          />

          {paidPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              price={plan.price}
              tagline={plan.tagline}
              features={plan.features}
              highlighted={plan.id === "pro"}
              current={premium?.plan === plan.id}
              loading={checkoutPlan === plan.id || (portalLoading && Boolean(premium?.isPremium))}
              actionLabel={
                premium?.plan === plan.id
                  ? "Current plan"
                  : premium?.isPremium
                    ? "Manage billing"
                    : !billingConfigured
                      ? "Stripe setup required"
                      : user
                        ? `Start ${plan.name}`
                        : "Sign in to subscribe"
              }
              onAction={() => void startCheckout(plan)}
            />
          ))}
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            [ShieldCheck, "Verified workspace", "Standard and Pro unlock verified proof and expanded account tools."],
            [BrainCircuit, "Tradox AI", "Only Pro can use multilingual account chat, reports and smart notifications."],
            [Sparkles, "Backend protected", "AI routes verify the active Pro plan even when somebody bypasses the interface."],
          ].map(([Icon, title, body]) => {
            const ItemIcon = Icon as typeof BrainCircuit;
            return (
              <Card key={String(title)} className="border-white/8 bg-[#090909] py-0">
                <CardContent className="p-4">
                  <span className="grid size-10 place-items-center rounded-xl border border-white/8 bg-black text-zinc-300">
                    <ItemIcon className="size-4" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-white">{String(title)}</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{String(body)}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function PlanCard({
  name,
  price,
  tagline,
  features,
  current = false,
  highlighted = false,
  loading = false,
  actionLabel,
  onAction,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  current?: boolean;
  highlighted?: boolean;
  loading?: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className={`relative overflow-hidden py-0 ${highlighted ? "border-amber-300/25 bg-[#0c0b08]" : "border-white/10 bg-[#0b0b0b]"}`}>
      {highlighted ? <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-300/10 to-transparent" /> : null}
      <CardHeader className="relative px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">{name}</CardTitle>
              {highlighted ? <Badge variant="secondary" className="rounded-full bg-amber-300/15 text-amber-200">Tradox AI</Badge> : null}
            </div>
            <CardDescription className="mt-2 text-zinc-400">{tagline}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-white">{price}</p>
            <p className="text-xs text-zinc-500">{price === "$0" ? "forever" : "per month"}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-2.5 px-4 pb-4">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
            <span className="mt-0.5 rounded-full bg-emerald-400/10 p-1 text-emerald-300">
              <Check className="size-3.5" />
            </span>
            <span className="text-sm leading-6 text-zinc-200">{feature}</span>
          </div>
        ))}
      </CardContent>
      <CardFooter className="relative border-white/8 bg-[#090909] px-4">
        <Button
          type="button"
          onClick={onAction}
          disabled={current || loading || actionLabel === "Stripe setup required"}
          variant={name === "Free" ? "outline" : "default"}
          className={`h-12 w-full rounded-2xl ${name === "Free" ? "border-white/10 bg-transparent text-zinc-200 hover:bg-white/[.04]" : "bg-white text-black hover:bg-zinc-200"}`}
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : name === "Free" ? null : <ShieldCheck className="size-4" />}
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
