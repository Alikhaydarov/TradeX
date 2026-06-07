import { authenticateRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
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
    })),
  });
}
