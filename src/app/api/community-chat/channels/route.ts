import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, requireCommunityAccess } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    communityId?: string;
    name?: string;
    isPremiumOnly?: boolean;
  };
  const communityId = body.communityId ?? "";
  const name = body.name?.trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, "").replace(/\s+/g, "-").slice(0, 60) ?? "";
  if (!UUID_PATTERN.test(communityId) || !name) return badRequest("Invalid channel details.");

  try {
    const admin = chatAdmin();
    const access = await requireCommunityAccess(admin, communityId, auth.user.id);
    if (!access || (!access.isOwner && access.role !== "admin")) {
      return Response.json({ error: "Only community admins can create channels." }, { status: 403 });
    }

    const positionResult = await admin
      .from("channels")
      .select("position")
      .eq("community_id", communityId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (positionResult.error) throw new Error(positionResult.error.message);

    const inserted = await admin
      .from("channels")
      .insert({
        community_id: communityId,
        name,
        is_premium_only: Boolean(body.isPremiumOnly),
        position: Number(positionResult.data?.position ?? -1) + 1,
        created_by: auth.user.id,
      })
      .select("id, community_id, name, is_premium_only, position, created_at")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);

    return Response.json(
      {
        channel: {
          id: inserted.data.id,
          communityId: inserted.data.community_id,
          name: inserted.data.name,
          isPremiumOnly: Boolean(inserted.data.is_premium_only),
          position: Number(inserted.data.position ?? 0),
          createdAt: inserted.data.created_at,
          unreadCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Channel create failed", error);
    return serverError("Channel could not be created.");
  }
}
