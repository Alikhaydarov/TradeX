import {
  authenticateRequest,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/backend/auth";
import { getPremiumStatus } from "@/lib/backend/premium";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACCENTS = new Set(["emerald", "sky", "amber", "rose"]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Community service is unavailable.");

  try {
    const [premium, memberships, owned] = await Promise.all([
      getPremiumStatus(auth),
      admin
        .from("community_members")
        .select("community_id, role, status, joined_at, invited_by")
        .eq("user_id", auth.user.id)
        .in("status", ["active", "invited"]),
      admin
        .from("communities")
        .select("*")
        .eq("owner_id", auth.user.id),
    ]);

    if (memberships.error) throw new Error(memberships.error.message);
    if (owned.error) throw new Error(owned.error.message);

    const membershipRows = memberships.data ?? [];
    const ownedRows = owned.data ?? [];
    const communityIds = [
      ...new Set([
        ...membershipRows.map((row) => row.community_id),
        ...ownedRows.map((row) => row.id),
      ]),
    ];

    const communityRows = communityIds.length
      ? await admin.from("communities").select("*").in("id", communityIds)
      : { data: [], error: null };
    if (communityRows.error) throw new Error(communityRows.error.message);

    const activeMemberRows = communityIds.length
      ? await admin
          .from("community_members")
          .select("community_id, user_id")
          .in("community_id", communityIds)
          .eq("status", "active")
      : { data: [], error: null };
    if (activeMemberRows.error) throw new Error(activeMemberRows.error.message);

    const communitiesById = new Map(
      (communityRows.data ?? []).map((community) => [community.id, community]),
    );
    const membershipById = new Map(
      membershipRows.map((membership) => [membership.community_id, membership]),
    );
    const memberCounts = new Map<string, number>();
    for (const member of activeMemberRows.data ?? []) {
      memberCounts.set(
        member.community_id,
        (memberCounts.get(member.community_id) ?? 0) + 1,
      );
    }

    const profileIds = [
      ...new Set(
        (communityRows.data ?? [])
          .map((community) => community.owner_id)
          .filter(Boolean),
      ),
    ];
    const profiles = profileIds.length
      ? await admin
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_verified")
          .in("id", profileIds)
      : { data: [], error: null };
    if (profiles.error) throw new Error(profiles.error.message);
    const profilesById = new Map(
      (profiles.data ?? []).map((profile) => [profile.id, profile]),
    );

    const activeIds = new Set(
      membershipRows
        .filter((membership) => membership.status === "active")
        .map((membership) => membership.community_id),
    );
    for (const community of ownedRows) activeIds.add(community.id);

    const communities = [...activeIds]
      .map((id) => {
        const community = communitiesById.get(id);
        if (!community) return null;
        const membership = membershipById.get(id);
        return {
          ...community,
          role:
            community.owner_id === auth.user.id
              ? "owner"
              : membership?.role || "member",
          joinedAt: membership?.joined_at ?? null,
          memberCount: memberCounts.get(id) ?? 0,
          owner: profilesById.get(community.owner_id) ?? null,
        };
      })
      .filter(Boolean)
      .sort((left, right) =>
        String(left?.name ?? "").localeCompare(String(right?.name ?? "")),
      );

    const invitations = membershipRows
      .filter((membership) => membership.status === "invited")
      .map((membership) => {
        const community = communitiesById.get(membership.community_id);
        if (!community) return null;
        return {
          ...community,
          role: membership.role || "member",
          memberCount: memberCounts.get(community.id) ?? 0,
          owner: profilesById.get(community.owner_id) ?? null,
        };
      })
      .filter(Boolean);

    return Response.json(
      {
        communities,
        invitations,
        canCreate: premium.plan === "pro" && ownedRows.length === 0,
        plan: premium.plan,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Communities hub load failed", error);
    return serverError("Communities could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Community service is unavailable.");

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    name?: string;
    description?: string;
    accent?: string;
    communityId?: string;
    decision?: "accept" | "decline";
  };

  try {
    if (body.action === "respond_invite") {
      if (!body.communityId || !UUID_PATTERN.test(body.communityId)) {
        return badRequest("Invalid community invitation.");
      }
      const membership = await admin
        .from("community_members")
        .select("community_id")
        .eq("community_id", body.communityId)
        .eq("user_id", auth.user.id)
        .eq("status", "invited")
        .maybeSingle();
      if (membership.error || !membership.data) {
        return Response.json(
          { error: "This invitation is no longer active." },
          { status: 409 },
        );
      }

      const accepted = body.decision === "accept";
      const updated = await admin
        .from("community_members")
        .update({
          status: accepted ? "active" : "declined",
          joined_at: accepted ? new Date().toISOString() : null,
        })
        .eq("community_id", body.communityId)
        .eq("user_id", auth.user.id)
        .eq("status", "invited");
      if (updated.error) throw new Error(updated.error.message);

      await admin
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", auth.user.id)
        .eq("type", "community_invite")
        .eq("entity_id", body.communityId);

      return Response.json({ accepted });
    }

    if (body.action === "create") {
      const premium = await getPremiumStatus(auth);
      if (premium.plan !== "pro") {
        return Response.json(
          { error: "Community creation requires the Pro plan." },
          { status: 403 },
        );
      }

      const existing = await admin
        .from("communities")
        .select("id")
        .eq("owner_id", auth.user.id)
        .limit(1);
      if (existing.error) throw new Error(existing.error.message);
      if ((existing.data ?? []).length) {
        return Response.json(
          { error: "You already own a community." },
          { status: 409 },
        );
      }

      const name = body.name?.trim().slice(0, 60) ?? "";
      const slug = slugify(name);
      if (name.length < 3 || !SLUG_PATTERN.test(slug)) {
        return badRequest("Enter a valid community name.");
      }
      const accent = ACCENTS.has(body.accent ?? "")
        ? body.accent!
        : "emerald";

      const inserted = await admin
        .from("communities")
        .insert({
          owner_id: auth.user.id,
          name,
          slug,
          description: body.description?.trim().slice(0, 280) ?? "",
          accent,
        })
        .select("*")
        .single();
      if (inserted.error) {
        return inserted.error.code === "23505"
          ? Response.json(
              { error: "This community name is already taken." },
              { status: 409 },
            )
          : serverError("Community could not be created.");
      }

      const member = await admin.from("community_members").insert({
        community_id: inserted.data.id,
        user_id: auth.user.id,
        role: "owner",
        status: "active",
        invited_by: auth.user.id,
        joined_at: new Date().toISOString(),
      });
      if (member.error) {
        await admin.from("communities").delete().eq("id", inserted.data.id);
        throw new Error(member.error.message);
      }

      return Response.json({ community: inserted.data }, { status: 201 });
    }

    return badRequest("Unknown community action.");
  } catch (error) {
    console.error("Communities hub mutation failed", error);
    return serverError("Community action failed.");
  }
}
