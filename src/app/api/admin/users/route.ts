import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface AdminUserRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
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

  const body = (await request.json()) as { userId?: string; isVerified?: boolean };
  if (!body.userId || typeof body.isVerified !== "boolean") {
    return badRequest("User va verification holatini to'g'ri yuboring.");
  }

  try {
    if (!(await ensureAdmin(auth))) return unauthorized();

    const { error } = await auth.supabase.rpc("admin_set_user_verification", {
      target_user_id: body.userId,
      next_value: body.isVerified,
    });

    if (error) return serverError(error.message);

    const premiumPatch = body.isVerified
      ? {
          plan: "premium",
          premium_until: null,
          ai_enabled: true,
          traderox_enabled: true,
          auto_sync_enabled: true,
          updated_at: new Date().toISOString(),
        }
      : {
          plan: "free",
          premium_until: null,
          ai_enabled: false,
          traderox_enabled: false,
          auto_sync_enabled: false,
          updated_at: new Date().toISOString(),
        };

    const { error: premiumError } = await auth.supabase
      .from("profiles")
      .update(premiumPatch)
      .eq("id", body.userId);

    if (premiumError) return serverError(premiumError.message);

    return Response.json({
      success: true,
      user: {
        id: body.userId,
        isVerified: body.isVerified,
        plan: body.isVerified ? "premium" : "free",
        premiumUntil: null,
        aiEnabled: body.isVerified,
        traderoxEnabled: body.isVerified,
        autoSyncEnabled: body.isVerified,
      },
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
