import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
const paid = new Set(["standard", "basic", "pro", "premium"]);
const activeUntil = (value: string | null) => !value || new Date(value).getTime() > Date.now();

export async function hasPaidAccess(supabase: Supabase, userId: string) {
  const { data: profile, error } = await supabase.from("profiles").select("plan,premium_until").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (paid.has(String(profile?.plan || "").toLowerCase()) && activeUntil(profile?.premium_until ?? null)) return true;
  const { data: subscription, error: subscriptionError } = await supabase.from("subscriptions")
    .select("plan,current_period_end").eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1).maybeSingle();
  if (subscriptionError) throw subscriptionError;
  return paid.has(String(subscription?.plan || "").toLowerCase()) && activeUntil(subscription?.current_period_end ?? null);
}
