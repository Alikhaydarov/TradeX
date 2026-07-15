import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

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

    const { data, error } = await auth.supabase.rpc("admin_list_users");
    if (error) return serverError(error.message);

    const users = (data as AdminUserRecord[]).map((profile) => ({
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      email: profile.email,
      plan: normalizePlan(profile.plan),
      premiumUntil: profile.premium_until,
      aiEnabled: Boolean(profile.ai_enabled),
      traderoxEnabled: Boolean(profile.traderox_enabled),
      autoSyncEnabled: Boolean(profile.auto_sync_enabled),
      subscriptionStatus: profile.subscription_status,
      subscriptionProvider: profile.subscription_provider,
      accountsCount: Number(profile.accounts_count ?? 0),
      journalEntriesCount: Number(profile.journal_entries_count ?? 0),
      postsCount: Number(profile.posts_count ?? 0),
      isVerified: Boolean(profile.is_verified),
      isAdmin: Boolean(profile.is_admin),
      createdAt: profile.created_at,
      lastSignInAt: profile.last_sign_in_at,
    }));

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

    const { error: accessError } = await auth.supabase.rpc("admin_set_user_access", {
      target_user_id: body.userId,
      next_plan: body.plan,
      next_verified: body.isVerified,
      next_premium_until: body.plan === "free" ? null : (body.premiumUntil ?? null),
      next_is_admin: body.isAdmin,
    });

    if (accessError) return serverError(accessError.message);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
