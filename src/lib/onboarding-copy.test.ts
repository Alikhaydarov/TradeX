import assert from "node:assert/strict";
import { test } from "node:test";

import type { PremiumStatus } from "@/components/use-premium-status";
import { onboardingCopy } from "./onboarding-copy";

function status(over: Partial<PremiumStatus> = {}): PremiumStatus {
  return {
    plan: "free",
    isPremium: false,
    aiEnabled: false,
    traderoxEnabled: false,
    autoSyncEnabled: false,
    isVerified: false,
    ...over,
  };
}

const PAID: PremiumStatus[] = [
  status({ plan: "standard", isPremium: true }),
  status({ plan: "standard", isPremium: true, autoSyncEnabled: true }),
  status({ plan: "pro", isPremium: true }),
  status({ plan: "pro", isPremium: true, autoSyncEnabled: true }),
];

test("a paying user is never told the product is free", () => {
  // This is the whole reason the copy is plan-aware. Someone who has just paid
  // being told "no card required" reads as though the payment did not register.
  for (const paid of PAID) {
    const copy = onboardingCopy(paid);
    const text = Object.values(copy).join(" ").toLowerCase();
    assert.ok(!text.includes("no card"), `${paid.plan}: mentions a card`);
    assert.ok(!text.includes("free"), `${paid.plan}: says free`);
  }
});

test("the free plan keeps its original wording", () => {
  const copy = onboardingCopy(status());
  assert.equal(copy.workspace, "Free workspace");
  assert.equal(copy.badge, "1 account included");
  assert.equal(copy.reassurance, "Manual accounts are free. No card required.");
});

test("the plan name is used verbatim", () => {
  assert.equal(onboardingCopy(status({ plan: "standard" })).workspace, "Standard workspace");
  assert.equal(onboardingCopy(status({ plan: "pro" })).workspace, "Pro workspace");
});

test("sync is promised only when it is actually enabled", () => {
  // plan and autoSyncEnabled can disagree while a subscription is still being
  // provisioned, so the promise follows the flag rather than the plan name.
  for (const plan of ["standard", "pro"] as const) {
    const off = onboardingCopy(status({ plan, autoSyncEnabled: false }));
    assert.ok(!off.reassurance.toLowerCase().includes("sync"));
    assert.ok(!off.step2.toLowerCase().includes("sync"));

    const on = onboardingCopy(status({ plan, autoSyncEnabled: true }));
    assert.ok(on.reassurance.toLowerCase().includes("sync"));
    assert.ok(on.step2.toLowerCase().includes("sync"));
  }
});

test("every field is filled in for every plan", () => {
  for (const value of [status(), ...PAID]) {
    for (const [field, text] of Object.entries(onboardingCopy(value))) {
      assert.ok(text.trim().length > 0, `${value.plan}: ${field} is empty`);
    }
  }
});
