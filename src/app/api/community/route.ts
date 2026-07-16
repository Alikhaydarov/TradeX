import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";
import { getPremiumStatus } from "@/lib/backend/premium";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACCENTS = new Set(["emerald", "sky", "amber", "rose"]);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

async function loadCommunity(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, userId: string) {
  const owned = await admin.from("communities").select("*").eq("owner_id", userId).maybeSingle();
  if (owned.error) throw new Error(owned.error.message);
  if (owned.data) return owned.data;
  const membership = await admin.from("community_members").select("community_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  if (membership.error) throw new Error(membership.error.message);
  if (!membership.data) return null;
  const community = await admin.from("communities").select("*").eq("id", membership.data.community_id).maybeSingle();
  if (community.error) throw new Error(community.error.message);
  return community.data;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Community service is unavailable.");

  try {
    const [premium, community] = await Promise.all([getPremiumStatus(auth), loadCommunity(admin, auth.user.id)]);
    if (!community) return Response.json({ community: null, canCreate: premium.plan === "pro" });

    const [memberRows, accountRows, shareRows, followRows] = await Promise.all([
      admin.from("community_members").select("user_id, role, status, joined_at").eq("community_id", community.id).neq("status", "removed"),
      admin.from("prop_accounts").select("id, user_id, name, firm, account_size, initial_balance").in("user_id", [auth.user.id]),
      admin.from("community_account_shares").select("*").eq("community_id", community.id),
      community.owner_id === auth.user.id
        ? admin.from("user_follows").select("follower_id").eq("following_id", auth.user.id).limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [memberRows, accountRows, shareRows, followRows]) if (result.error) throw new Error(result.error.message);

    const memberIds = [...new Set((memberRows.data ?? []).map((row) => row.user_id))];
    const followerIds = (followRows.data ?? []).map((row) => row.follower_id);
    const profileIds = [...new Set([...memberIds, ...followerIds])];
    const profiles = profileIds.length
      ? await admin.from("profiles").select("id, username, full_name, avatar_url, is_verified").in("id", profileIds)
      : { data: [], error: null };
    if (profiles.error) throw new Error(profiles.error.message);
    const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
    const members = (memberRows.data ?? []).map((member) => ({ ...member, profile: profileMap.get(member.user_id) ?? null }));
    const existingMemberIds = new Set(memberIds);
    const followers = followerIds.filter((id) => !existingMemberIds.has(id)).map((id) => profileMap.get(id)).filter(Boolean);
    const sharedAccountIds = [...new Set((shareRows.data ?? []).map((share) => share.prop_account_id))];
    const [sharedAccountRows, journalRows] = sharedAccountIds.length ? await Promise.all([
      admin.from("prop_accounts").select("id, user_id, name, firm, account_size, initial_balance").in("id", sharedAccountIds),
      admin.from("journal_entries").select("user_id, prop_account_id, pnl").in("prop_account_id", sharedAccountIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (sharedAccountRows.error || journalRows.error) throw new Error(sharedAccountRows.error?.message ?? journalRows.error?.message);
    const shareMap = new Map((shareRows.data ?? []).map((share) => [`${share.user_id}:${share.prop_account_id}`, share]));
    const results = (sharedAccountRows.data ?? []).map((account) => {
      const trades = (journalRows.data ?? []).filter((entry) => entry.user_id === account.user_id && entry.prop_account_id === account.id);
      const pnl = trades.reduce((sum, entry) => sum + Number(entry.pnl ?? 0), 0);
      const wins = trades.filter((entry) => Number(entry.pnl ?? 0) > 0).length;
      const share = shareMap.get(`${account.user_id}:${account.id}`);
      return {
        accountId: account.id,
        accountName: account.name,
        firm: account.firm,
        member: profileMap.get(account.user_id) ?? null,
        trades: trades.length,
        winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0,
        pnlPercent: Number(account.initial_balance ?? account.account_size) > 0 ? Number(((pnl / Number(account.initial_balance ?? account.account_size)) * 100).toFixed(2)) : 0,
        dollarPnl: share?.show_dollar_pnl ? Number(pnl.toFixed(2)) : null,
      };
    });

    return Response.json({
      community,
      isOwner: community.owner_id === auth.user.id,
      members,
      followers,
      accounts: accountRows.data ?? [],
      shares: shareRows.data ?? [],
      results,
      canCreate: premium.plan === "pro",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Community load failed", error);
    return serverError("Community could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();
  const admin = getSupabaseAdminClient();
  if (!admin) return serverError("Community service is unavailable.");
  const body = (await request.json().catch(() => ({}))) as { action?: string; name?: string; description?: string; accent?: string; userIds?: string[]; shares?: Array<{ accountId: string; enabled: boolean; showDollarPnl?: boolean }> };

  try {
    if (body.action === "create") {
      const premium = await getPremiumStatus(auth);
      if (premium.plan !== "pro") return Response.json({ error: "Community creation requires the Pro plan." }, { status: 403 });
      const name = body.name?.trim().slice(0, 60) ?? "";
      const slug = slugify(name);
      if (name.length < 3 || !SLUG_PATTERN.test(slug)) return badRequest("Enter a valid community name.");
      const accent = ACCENTS.has(body.accent ?? "") ? body.accent! : "emerald";
      const inserted = await admin.from("communities").insert({ owner_id: auth.user.id, name, slug, description: body.description?.trim().slice(0, 280) ?? "", accent }).select("*").single();
      if (inserted.error) return inserted.error.code === "23505" ? Response.json({ error: "You already own a community or this name is taken." }, { status: 409 }) : serverError("Community could not be created.");
      const member = await admin.from("community_members").insert({ community_id: inserted.data.id, user_id: auth.user.id, role: "owner", status: "active", invited_by: auth.user.id, joined_at: new Date().toISOString() });
      if (member.error) { await admin.from("communities").delete().eq("id", inserted.data.id); throw new Error(member.error.message); }
      return Response.json({ community: inserted.data }, { status: 201 });
    }

    const community = await loadCommunity(admin, auth.user.id);
    if (!community) return Response.json({ error: "Community not found." }, { status: 404 });

    if (body.action === "invite") {
      if (community.owner_id !== auth.user.id) return Response.json({ error: "Only the owner can invite members." }, { status: 403 });
      const ids = [...new Set((body.userIds ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 20);
      if (!ids.length) return badRequest("Choose at least one follower.");
      const follows = await admin.from("user_follows").select("follower_id").eq("following_id", auth.user.id).in("follower_id", ids);
      if (follows.error) throw new Error(follows.error.message);
      const allowedIds = (follows.data ?? []).map((row) => row.follower_id);
      if (!allowedIds.length) return Response.json({ error: "Only followers can be invited." }, { status: 403 });
      const rows = allowedIds.map((userId) => ({ community_id: community.id, user_id: userId, role: "member", status: "active", invited_by: auth.user.id, joined_at: new Date().toISOString() }));
      const result = await admin.from("community_members").upsert(rows, { onConflict: "community_id,user_id" });
      if (result.error) throw new Error(result.error.message);
      return Response.json({ added: allowedIds.length });
    }

    if (body.action === "save_shares") {
      const membership = await admin.from("community_members").select("user_id").eq("community_id", community.id).eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
      if (membership.error || !membership.data) return Response.json({ error: "Active membership required." }, { status: 403 });
      const accountIds = (body.shares ?? []).map((share) => share.accountId);
      const accounts = accountIds.length ? await admin.from("prop_accounts").select("id").eq("user_id", auth.user.id).in("id", accountIds) : { data: [], error: null };
      if (accounts.error) throw new Error(accounts.error.message);
      const ownedIds = new Set((accounts.data ?? []).map((account) => account.id));
      await admin.from("community_account_shares").delete().eq("community_id", community.id).eq("user_id", auth.user.id);
      const rows = (body.shares ?? []).filter((share) => share.enabled && ownedIds.has(share.accountId)).map((share) => ({ community_id: community.id, user_id: auth.user.id, prop_account_id: share.accountId, show_dollar_pnl: Boolean(share.showDollarPnl) }));
      if (rows.length) { const saved = await admin.from("community_account_shares").insert(rows); if (saved.error) throw new Error(saved.error.message); }
      return Response.json({ saved: rows.length });
    }

    return badRequest("Unknown community action.");
  } catch (error) {
    console.error("Community mutation failed", error);
    return serverError("Community action failed.");
  }
}
