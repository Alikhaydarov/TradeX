import type { ApiAuth } from "./auth";

export interface PremiumStatus {
  isPremium: boolean;
  aiEnabled: boolean;
  autoSyncEnabled: boolean;
  isVerified: boolean;
}

interface PremiumProfileRow {
  plan: string | null;
  premium_until: string | null;
  ai_enabled: boolean | null;
  auto_sync_enabled: boolean | null;
  is_verified: boolean | null;
}

function isFutureOrNull(value: string | null) {
  if (!value) return true;
  return new Date(value).getTime() > Date.now();
}

export async function getPremiumStatus(auth: ApiAuth): Promise<PremiumStatus> {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("plan, premium_until, ai_enabled, auto_sync_enabled, is_verified")
    .eq("id", auth.user.id)
    .maybeSingle<PremiumProfileRow>();

  if (error) throw new Error(error.message);

  const isPremium = data?.plan === "premium" && isFutureOrNull(data.premium_until);

  return {
    isPremium,
    aiEnabled: isPremium && Boolean(data?.ai_enabled),
    autoSyncEnabled: isPremium && Boolean(data?.auto_sync_enabled),
    isVerified: isPremium && Boolean(data?.is_verified),
  };
}

export async function requirePremium(auth: ApiAuth) {
  const status = await getPremiumStatus(auth);
  if (!status.isPremium) {
    return Response.json(
      {
        error: "Bu funksiya faqat Premium foydalanuvchilar uchun.",
        upgradeUrl: "/pricing",
      },
      { status: 403 },
    );
  }
  return null;
}
