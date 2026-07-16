// `basic` and `premium` were used by earlier billing experiments. Keep them
// readable until the database reconciliation migration has normalized them.
const PREMIUM_PLANS = new Set(["basic", "standard", "pro", "premium"]);

export function isPremiumPlan(plan?: string | null) {
  return PREMIUM_PLANS.has((plan ?? "free").toLowerCase());
}

export function isPremiumActive(premiumUntil?: string | null) {
  if (!premiumUntil) return true;
  return new Date(premiumUntil).getTime() > Date.now();
}

export function hasVerifiedPremiumAccess(profile: {
  is_verified?: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
}) {
  return Boolean(profile.is_verified) && isPremiumPlan(profile.plan) && isPremiumActive(profile.premium_until);
}
