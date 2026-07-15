import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface AdminUserRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  plan: "free" | "standard" | "pro" | "premium" | null;
  premium_until: string | null;
  ai_enabled: boolean | null;
  traderox_enabled: boolean | null;
  auto_sync_enabled: boolean | null;
  is_verified: boolean | null;
  is_admin: boolean | null;
  created_at: string | null;
}

async function ensureAdmin(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const { data, error } = await auth.supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
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
      plan: profile.plan ?? "free",
      premiumUntil: profile.premium_until,
      aiEnabled: Boolean(profile.ai_enabled),
      traderoxEnabled: Boolean(profile.traderox_enabled),
      autoSyncEnabled: Boolean(profile.auto_sync_enabled),
      isVerified: Boolean(profile.is_verified),
      isAdmin: Boolean(profile.is_admin),
      createdAt: profile.created_at,
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
    plan?: "free" | "standard" | "pro" | "premium";
    isVerified?: boolean;
    premiumUntil?: string | null;
  };
  if (!body.userId || !body.plan || typeof body.isVerified !== "boolean") {
    return badRequest("User, tarif va verification holatini to'g'ri yuboring.");
  }

  try {
    if (!(await ensureAdmin(auth))) return unauthorized();

    const { error: accessError } = await auth.supabase.rpc("admin_set_user_access", {
      target_user_id: body.userId,
      next_plan: body.plan,
      next_verified: body.isVerified,
      next_premium_until: body.plan === "free" ? null : (body.premiumUntil ?? null),
    });

    if (accessError) return serverError(accessError.message);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
