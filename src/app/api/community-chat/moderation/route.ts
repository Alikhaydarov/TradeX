import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { chatAdmin, requireCommunityAccess } from "@/lib/backend/community-chat";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

type ModerationAction = "mute" | "unmute" | "ban" | "unban";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    communityId?: string;
    userId?: string;
    action?: ModerationAction;
    minutes?: number;
  };
  const communityId = body.communityId ?? "";
  const userId = body.userId ?? "";
  const action = body.action;
  if (!UUID_PATTERN.test(communityId) || !UUID_PATTERN.test(userId) || !action) {
    return badRequest("Invalid moderation action.");
  }
  if (userId === auth.user.id) return badRequest("You cannot moderate yourself.");

  try {
    const admin = chatAdmin();
    const access = await requireCommunityAccess(admin, communityId, auth.user.id);
    if (!access || (!access.isOwner && access.role !== "admin")) {
      return Response.json({ error: "Community admin access required." }, { status: 403 });
    }

    const target = await admin
      .from("community_members")
      .select("role, status")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .maybeSingle();
    if (target.error) throw new Error(target.error.message);
    if (!target.data) return Response.json({ error: "Community member not found." }, { status: 404 });
    if (target.data.role === "owner") return Response.json({ error: "The owner cannot be moderated." }, { status: 403 });
    if (!access.isOwner && target.data.role === "admin") {
      return Response.json({ error: "Only the owner can moderate admins." }, { status: 403 });
    }

    const update: { muted_until?: string | null; banned?: boolean; status?: string } = {};
    if (action === "mute") {
      const minutes = Math.min(60 * 24 * 30, Math.max(1, Number(body.minutes ?? 60)));
      update.muted_until = new Date(Date.now() + minutes * 60_000).toISOString();
    }
    if (action === "unmute") update.muted_until = null;
    if (action === "ban") {
      update.banned = true;
      update.status = "removed";
    }
    if (action === "unban") {
      update.banned = false;
      update.status = "active";
    }

    const result = await admin
      .from("community_members")
      .update(update)
      .eq("community_id", communityId)
      .eq("user_id", userId);
    if (result.error) throw new Error(result.error.message);

    return Response.json({ ok: true, action });
  } catch (error) {
    console.error("Community chat moderation failed", error);
    return serverError("Moderation action failed.");
  }
}
