import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_verified?: boolean | null;
  plan?: string | null;
  premium_until?: string | null;
}

function premiumVerified(profile: Pick<ProfileRecord, "is_verified" | "plan" | "premium_until">) {
  return Boolean(profile.is_verified) && profile.plan === "premium" && (!profile.premium_until || new Date(profile.premium_until).getTime() > Date.now());
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_verified, plan, premium_until")
    .neq("id", auth.user.id)
    .order("full_name", { ascending: true })
    .limit(80)
    .returns<ProfileRecord[]>();

  if (error) return serverError(error.message);

  return Response.json({
    users: data.map((profile) => ({
      id: profile.id,
      username: profile.username,
      name: profile.full_name,
      avatar: profile.avatar_url,
      isVerified: premiumVerified(profile),
    })),
  });
}
