import type { PremiumStatus } from "@/components/use-premium-status";

export interface OnboardingCopy {
  workspace: string;
  badge: string;
  intro: string;
  reassurance: string;
  step2: string;
}

/**
 * Wording for the empty-workspace start screen.
 *
 * The three steps are the same whoever you are - only the wording moves with
 * the plan. That matters in one specific way: telling someone who has just paid
 * for Standard or Pro that "manual accounts are free, no card required" reads as
 * though the thing they bought had not registered.
 *
 * Kept apart from the component so the whole matrix can be asserted directly,
 * rather than only ever being seen one branch at a time.
 */
export function onboardingCopy(status: PremiumStatus): OnboardingCopy {
  if (status.plan === "free") {
    return {
      workspace: "Free workspace",
      badge: "1 account included",
      intro:
        "Start with one account. Tradoxy will turn your trades into a clear journal, calendar and performance review.",
      reassurance: "Manual accounts are free. No card required.",
      step2: "Journal manually or sync when your plan supports it.",
    };
  }

  const planName = status.plan === "pro" ? "Pro" : "Standard";

  return {
    workspace: `${planName} workspace`,
    badge: status.autoSyncEnabled ? "Auto-sync included" : `${planName} plan`,
    intro:
      "Connect your first account and Tradoxy will turn your trades into a clear journal, calendar and performance review.",
    // Sync is promised only when the account actually has it enabled, rather
    // than assumed from the plan name - the two can disagree while a
    // subscription is being provisioned.
    reassurance: status.autoSyncEnabled
      ? "Your plan is active. Connect a platform to sync automatically, or add trades by hand."
      : "Your plan is active. Add an account to start recording trades.",
    step2: status.autoSyncEnabled
      ? "Sync from your platform, or journal by hand."
      : "Journal your trades as you take them.",
  };
}
