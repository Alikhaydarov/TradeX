import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface AdminUserRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  plan: string | null;
  premium_until: string | null;
  ai_enabled: boolean | null;
  traderox_enabled: boolean | null;
  auto_sync_enabled: boolean | null;
  subscription_status: string | null;
  subscription_provider: string | null;
  accounts_count: number | null;
  journal_entries_count: number | null;
  posts_count: number | null;
  is_verified: boolean | null;
  is_admin: boolean | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

async function ensureAdmin(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const { data, error } = await auth.supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

function normalizePlan(plan: string | null): "free" | "standard" | "pro" {
  const value = plan?.toLowerCase();
  if (value === "standard") return "standard";
  if (value === "pro" || value === "premium") return "pro";
  return "free";
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    if (!(await ensureAdmin(auth))) return unauthorized();

    const admin = getSupabaseAdminClient();
    if (!admin) return serverError("Supabase service role is not configured.");

    const [profilesResult, subscriptionsResult, accountsResult, journalResult, postsResult, authUsersResult] = await Promise.all([
      admin.from("profiles").select("id, username, full_name, avatar_url, plan, premium_until, ai_enabled, traderox_enabled, auto_sync_enabled, is_verified, is_admin, created_at").order("created_at", { ascending: false }),
      admin.from("subscriptions").select("user_id, status, provider, current_period_end, created_at").order("current_period_end", { ascending: false, nullsFirst: false }),
      admin.from("prop_accounts").select("user_id"),
      admin.from("journal_entries").select("user_id"),
      admin.from("posts").select("user_id").eq("is_archived", false),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const firstError = profilesResult.error ?? subscriptionsResult.error ?? accountsResult.error ?? journalResult.error ?? postsResult.error ?? authUsersResult.error;
    if (firstError) return serverError(firstError.message);

    const countByUser = (rows: Array<{ user_id: string }> | null) => {
      const counts = new Map<string, number>();
      for (const row of rows ?? []) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
      return counts;
    };
    const accountsByUser = countByUser(accountsResult.data);
    const journalByUser = countByUser(journalResult.data);
    const postsByUser = countByUser(postsResult.data);
    const authById = new Map(authUsersResult.data.users.map((user) => [user.id, user]));
    const subscriptionByUser = new Map<string, { status: string | null; provider: string | null }>();
    for (const subscription of subscriptionsResult.data ?? []) {
      if (!subscriptionByUser.has(subscription.user_id)) {
        subscriptionByUser.set(subscription.user_id, {
          status: subscription.status,
          provider: subscription.provider,
        });
      }
    }

    const users = ((profilesResult.data ?? []) as Omit<AdminUserRecord, "email" | "subscription_status" | "subscription_provider" | "accounts_count" | "journal_entries_count" | "posts_count" | "last_sign_in_at">[]).map((profile) => {
      const authUser = authById.get(profile.id);
      const subscription = subscriptionByUser.get(profile.id);
      return {
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      email: authUser?.email ?? null,
      plan: normalizePlan(profile.plan),
      premiumUntil: profile.premium_until,
      aiEnabled: Boolean(profile.ai_enabled),
      traderoxEnabled: Boolean(profile.traderox_enabled),
      autoSyncEnabled: Boolean(profile.auto_sync_enabled),
      subscriptionStatus: subscription?.status ?? null,
      subscriptionProvider: subscription?.provider ?? null,
      accountsCount: accountsByUser.get(profile.id) ?? 0,
      journalEntriesCount: journalByUser.get(profile.id) ?? 0,
      postsCount: postsByUser.get(profile.id) ?? 0,
      isVerified: Boolean(profile.is_verified),
      isAdmin: Boolean(profile.is_admin),
      createdAt: profile.created_at,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };
    });

    return Response.json({ users });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    userId?: string;
    plan?: "free" | "standard" | "pro";
    isVerified?: boolean;
    premiumUntil?: string | null;
    isAdmin?: boolean;
  };
  if (!body.userId || !body.plan || typeof body.isVerified !== "boolean" || typeof body.isAdmin !== "boolean") {
    return badRequest("User, tarif, verification va admin holatini to'g'ri yuboring.");
  }

  try {
    if (!(await ensureAdmin(auth))) return unauthorized();

    const admin = getSupabaseAdminClient();
    if (!admin) return serverError("Supabase service role is not configured.");
    const premiumEnabled = body.plan === "standard" || body.plan === "pro";
    const { error: accessError } = await admin
      .from("profiles")
      .update({
        plan: body.plan,
        premium_until: premiumEnabled ? (body.premiumUntil ?? null) : null,
        is_verified: premiumEnabled ? body.isVerified : false,
        ai_enabled: premiumEnabled,
        traderox_enabled: premiumEnabled,
        auto_sync_enabled: premiumEnabled,
        is_admin: body.isAdmin,
      })
      .eq("id", body.userId);

    if (accessError) return serverError(accessError.message);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
