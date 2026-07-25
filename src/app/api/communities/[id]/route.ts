import {
  authenticateRequest,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/backend/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

async function requireCommunityAccess(
  admin: AdminClient,
  communityId: string,
  userId: string,
) {
  const community = await admin
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .maybeSingle();
  if (community.error) throw new Error(community.error.message);
  if (!community.data) return null;

  if (community.data.owner_id === userId) {
    return { community: community.data, role: "owner", isOwner: true };
  }

  const membership = await admin
    .from("community_members")
    .select("role, status")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (membership.error) throw new Error(membership.error.message);
  if (!membership.data) return null;

  return {
    community: community.data,
    role: membership.data.role || "member",
    isOwner: false,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Community service is unavailable.");

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return badRequest("Invalid community.");

  try {
    const access = await requireCommunityAccess(admin, id, auth.user.id);
    if (!access) {
      return Response.json(
        { error: "Community not found or access denied." },
        { status: 404 },
      );
    }

    const { community, role, isOwner } = access;
    const [memberRows, ownAccounts, shareRows, followRows] = await Promise.all([
      admin
        .from("community_members")
        .select("user_id, role, status, joined_at")
        .eq("community_id", community.id)
        .neq("status", "removed"),
      admin
        .from("prop_accounts")
        .select("id, user_id, name, firm, account_size, initial_balance")
        .eq("user_id", auth.user.id),
      admin
        .from("community_account_shares")
        .select("*")
        .eq("community_id", community.id),
      isOwner
        ? admin
            .from("user_follows")
            .select("follower_id")
            .eq("following_id", auth.user.id)
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const result of [memberRows, ownAccounts, shareRows, followRows]) {
      if (result.error) throw new Error(result.error.message);
    }

    const memberIds = [
      ...new Set((memberRows.data ?? []).map((row) => row.user_id)),
    ];
    const followerIds = (followRows.data ?? []).map((row) => row.follower_id);
    const profileIds = [...new Set([...memberIds, ...followerIds])];
    const profiles = profileIds.length
      ? await admin
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_verified")
          .in("id", profileIds)
      : { data: [], error: null };
    if (profiles.error) throw new Error(profiles.error.message);

    const profileMap = new Map(
      (profiles.data ?? []).map((profile) => [profile.id, profile]),
    );
    const members = (memberRows.data ?? []).map((member) => ({
      ...member,
      profile: profileMap.get(member.user_id) ?? null,
    }));
    const existingMemberIds = new Set(memberIds);
    const followers = followerIds
      .filter((userId) => !existingMemberIds.has(userId))
      .map((userId) => profileMap.get(userId))
      .filter(Boolean);

    const sharedAccountIds = [
      ...new Set((shareRows.data ?? []).map((share) => share.prop_account_id)),
    ];
    const [sharedAccounts, journalRows] = sharedAccountIds.length
      ? await Promise.all([
          admin
            .from("prop_accounts")
            .select("id, user_id, name, firm, account_size, initial_balance")
            .in("id", sharedAccountIds),
          admin
            .from("journal_entries")
            .select("user_id, prop_account_id, pnl")
            .in("prop_account_id", sharedAccountIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    if (sharedAccounts.error || journalRows.error) {
      throw new Error(
        sharedAccounts.error?.message ?? journalRows.error?.message,
      );
    }

    const shareMap = new Map(
      (shareRows.data ?? []).map((share) => [
        `${share.user_id}:${share.prop_account_id}`,
        share,
      ]),
    );

    const results = (sharedAccounts.data ?? []).map((account) => {
      const trades = (journalRows.data ?? []).filter(
        (entry) =>
          entry.user_id === account.user_id &&
          entry.prop_account_id === account.id,
      );
      const pnl = trades.reduce(
        (total, entry) => total + Number(entry.pnl ?? 0),
        0,
      );
      const wins = trades.filter((entry) => Number(entry.pnl ?? 0) > 0).length;
      const losses = trades.filter((entry) => Number(entry.pnl ?? 0) < 0).length;
      const decided = wins + losses;
      const share = shareMap.get(`${account.user_id}:${account.id}`);
      const base = Number(account.initial_balance ?? account.account_size ?? 0);

      return {
        accountId: account.id,
        accountName: account.name,
        firm: account.firm,
        member: profileMap.get(account.user_id) ?? null,
        trades: trades.length,
        wins,
        losses,
        winRate: decided ? Math.round((wins / decided) * 100) : 0,
        pnlPercent: base > 0 ? Number(((pnl / base) * 100).toFixed(2)) : 0,
        dollarPnl: share?.show_dollar_pnl ? Number(pnl.toFixed(2)) : null,
      };
    });

    return Response.json(
      {
        community,
        role,
        isOwner,
        members,
        followers,
        accounts: ownAccounts.data ?? [],
        shares: shareRows.data ?? [],
        results,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Community detail load failed", error);
    return serverError("Community could not be loaded.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Community service is unavailable.");

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return badRequest("Invalid community.");

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    userIds?: string[];
    shares?: Array<{
      accountId: string;
      enabled: boolean;
      showDollarPnl?: boolean;
    }>;
  };

  try {
    const access = await requireCommunityAccess(admin, id, auth.user.id);
    if (!access) {
      return Response.json(
        { error: "Community not found or access denied." },
        { status: 404 },
      );
    }

    if (body.action === "invite") {
      if (!access.isOwner) {
        return Response.json(
          { error: "Only the owner can invite members." },
          { status: 403 },
        );
      }

      const ids = [
        ...new Set(
          (body.userIds ?? []).filter((userId) => UUID_PATTERN.test(userId)),
        ),
      ].slice(0, 20);
      if (!ids.length) return badRequest("Choose at least one follower.");

      const follows = await admin
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", auth.user.id)
        .in("follower_id", ids);
      if (follows.error) throw new Error(follows.error.message);

      const followerIds = (follows.data ?? []).map((row) => row.follower_id);
      const existing = followerIds.length
        ? await admin
            .from("community_members")
            .select("user_id, status")
            .eq("community_id", id)
            .in("user_id", followerIds)
        : { data: [], error: null };
      if (existing.error) throw new Error(existing.error.message);

      const activeIds = new Set(
        (existing.data ?? [])
          .filter((row) => row.status === "active")
          .map((row) => row.user_id),
      );
      const allowedIds = followerIds.filter((userId) => !activeIds.has(userId));
      if (!allowedIds.length) {
        return Response.json(
          { error: "Selected followers are already members." },
          { status: 409 },
        );
      }

      const rows = allowedIds.map((userId) => ({
        community_id: id,
        user_id: userId,
        role: "member",
        status: "invited",
        invited_by: auth.user.id,
        joined_at: null,
      }));
      const saved = await admin
        .from("community_members")
        .upsert(rows, { onConflict: "community_id,user_id" });
      if (saved.error) throw new Error(saved.error.message);

      await admin
        .from("notifications")
        .delete()
        .eq("type", "community_invite")
        .eq("entity_id", id)
        .in("user_id", allowedIds);

      const notifications = allowedIds.map((userId) => ({
        user_id: userId,
        actor_id: auth.user.id,
        type: "community_invite",
        message: `${access.community.name} community invitation`,
        entity_type: "community",
        entity_id: id,
        metadata: {
          communityName: access.community.name,
          communitySlug: access.community.slug,
        },
      }));
      const notificationResult = await admin
        .from("notifications")
        .insert(notifications);
      if (notificationResult.error) {
        throw new Error(notificationResult.error.message);
      }

      return Response.json({ invited: allowedIds.length });
    }

    if (body.action === "save_shares") {
      const accountIds = (body.shares ?? []).map((share) => share.accountId);
      const accounts = accountIds.length
        ? await admin
            .from("prop_accounts")
            .select("id")
            .eq("user_id", auth.user.id)
            .in("id", accountIds)
        : { data: [], error: null };
      if (accounts.error) throw new Error(accounts.error.message);

      const ownedIds = new Set(
        (accounts.data ?? []).map((account) => account.id),
      );
      const deleted = await admin
        .from("community_account_shares")
        .delete()
        .eq("community_id", id)
        .eq("user_id", auth.user.id);
      if (deleted.error) throw new Error(deleted.error.message);

      const rows = (body.shares ?? [])
        .filter((share) => share.enabled && ownedIds.has(share.accountId))
        .map((share) => ({
          community_id: id,
          user_id: auth.user.id,
          prop_account_id: share.accountId,
          show_dollar_pnl: Boolean(share.showDollarPnl),
        }));
      if (rows.length) {
        const inserted = await admin
          .from("community_account_shares")
          .insert(rows);
        if (inserted.error) throw new Error(inserted.error.message);
      }

      return Response.json({ saved: rows.length });
    }

    return badRequest("Unknown community action.");
  } catch (error) {
    console.error("Community detail mutation failed", error);
    return serverError("Community action failed.");
  }
}
