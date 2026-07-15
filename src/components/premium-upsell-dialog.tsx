"use client";

import { Crown, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface PremiumStatus {
  isPremium: boolean;
}

interface StripeConfigStatus {
  configured: boolean;
}

const plans = [
  { id: "standard", name: "Standard", price: "$15/mo" },
  { id: "pro", name: "Pro", price: "$25/mo" },
] as const;
const PREMIUM_UPSELL_COOLDOWN_MS = 1000 * 60 * 60 * 48;

export function PremiumUpsellDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const storageKey = useMemo(
    () => (user ? `tradeway:premium-upsell:last-seen:${user.id}` : ""),
    [user],
  );

  useEffect(() => {
    let active = true;

    apiRequest<StripeConfigStatus>("/api/stripe/config")
      .then((status) => {
        if (active) setBillingConfigured(Boolean(status.configured));
      })
      .catch(() => {
        if (active) setBillingConfigured(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || !storageKey) return;

    let active = true;
    if (window.location.pathname.startsWith("/pricing")) {
      setLoading(false);
      return;
    }

    const lastSeen = Number(window.localStorage.getItem(storageKey) || "0");
    if (lastSeen && Date.now() - lastSeen < PREMIUM_UPSELL_COOLDOWN_MS) {
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      apiRequest<PremiumStatus>("/api/premium/status")
        .then((status) => {
          if (!active) return;
          if (!status.isPremium) setOpen(true);
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 1800);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [storageKey, user]);

  if (!user || loading) return null;

  const openPricing = () => {
    setOpen(false);
    window.history.pushState(null, "", "/pricing");
    window.dispatchEvent(new Event("popstate"));
  };

  const startCheckout = async (planId: "standard" | "pro") => {
    if (!billingConfigured) {
      openPricing();
      return;
    }

    setCheckoutPlan(planId);

    try {
      const response = await apiRequest<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });

      window.location.assign(response.url);
    } catch {
      openPricing();
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && storageKey) window.localStorage.setItem(storageKey, String(Date.now()));
      }}
    >
      <DialogContent className="border-white/10 bg-black p-0 sm:max-w-[560px]">
        <div className="absolute right-4 top-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-[#080808] text-zinc-400 transition hover:bg-[#101010] hover:text-white"
            aria-label="Close premium dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="rounded-[28px] bg-black p-6">
          <DialogHeader className="space-y-3 text-left">
            <Badge className="w-fit rounded-full bg-white text-black hover:bg-white">
              <Crown className="size-3.5" /> New account bonus
            </Badge>
            <DialogTitle className="text-3xl font-black tracking-tight text-white">
              Unlock Tradox Premium
            </DialogTitle>
            <p className="max-w-md text-sm leading-6 text-zinc-400">
              Blue badge, AI trade coaching and MT5 Auto Sync unlock when you want the full workflow.
            </p>
          </DialogHeader>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-3xl border border-white/10 bg-[#080808] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">{plan.name}</h3>
                  <span className="text-sm font-bold text-zinc-300">{plan.price}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {plan.id === "standard"
                    ? "Best for traders who want verified profile, AI review and MT5 history sync."
                    : "For heavy users who want everything in Standard plus priority sync and future pro tools."}
                </p>
                <Button
                  className="mt-4 h-10 w-full rounded-2xl bg-white text-black hover:bg-zinc-200"
                  onClick={() => void startCheckout(plan.id)}
                  disabled={checkoutPlan === plan.id}
                >
                  {checkoutPlan === plan.id ? "Opening checkout..." : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-11 flex-1 rounded-2xl bg-white text-black hover:bg-zinc-200"
              onClick={openPricing}
            >
              <Sparkles className="size-4" /> View Premium plans
            </Button>
            <Button variant="outline" className="h-11 rounded-2xl border-white/10 bg-transparent text-zinc-200 hover:bg-white/[.04]" onClick={() => setOpen(false)}>
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
