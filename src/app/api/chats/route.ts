import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

interface GroupRecord {
  id: string;
  name: string;
  description: string;
  avatar: string;
  is_private?: boolean;
  created_at: string;
}

interface MemberRecord {
  group_id: string;
  user_id: string;
  created_at: string;
}

interface ProfileRecord {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

function initials(value: string) {
  const letters = value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "TW";
}

function mapChat(group: GroupRecord, members: MemberRecord[], profiles: ProfileRecord[]) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    avatar: group.avatar,
    isPrivate: Boolean(group.is_private),
    isCommunity: group.name === "TradeWay Community",
    createdAt: group.created_at,
    members: members.map((member) => {
      const profile = profilesById.get(member.user_id);
      return {
        id: member.user_id,
        name: profile?.full_name ?? "Trader",
        username: profile?.username ?? "trader",
        avatar: profile?.avatar_url ?? null,
      };
    }),
  };
}

async function loadChats(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  await ensureCommunity(auth);

  const { data: ownMemberships, error: membershipsError } = await auth.supabase
    .from("group_members")
    .select("group_id, user_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .returns<MemberRecord[]>();

  if (membershipsError) throw new Error(membershipsError.message);
  if (!ownMemberships.length) return [];

  const groupIds = ownMemberships.map((membership) => membership.group_id);

  const [{ data: groups, error: groupsError }, { data: members, error: allMembersError }] = await Promise.all([
    auth.supabase
      .from("groups")
      .select("id, name, description, avatar, is_private, created_at")
      .in("id", groupIds)
      .order("created_at", { ascending: false })
      .returns<GroupRecord[]>(),
    auth.supabase
      .from("group_members")
      .select("group_id, user_id, created_at")
      .in("group_id", groupIds)
      .returns<MemberRecord[]>(),
  ]);

  if (groupsError) throw new Error(groupsError.message);
  if (allMembersError) throw new Error(allMembersError.message);

  const profileIds = [...new Set(members.map((member) => member.user_id))];
  const { data: profiles, error: profilesError } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", profileIds)
    .returns<ProfileRecord[]>();

  if (profilesError) throw new Error(profilesError.message);

  return groups.map((group) =>
    mapChat(
      group,
      members.filter((member) => member.group_id === group.id),
      profiles,
    ),
  ).sort((a, b) => Number(Boolean(b.isCommunity)) - Number(Boolean(a.isCommunity)));
}

async function ensureCommunity(auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const communityName = "TradeWay Community";
  const { data: existingCommunity, error: communityError } = await auth.supabase
    .from("groups")
    .select("id")
    .eq("name", communityName)
    .maybeSingle<{ id: string }>();

  if (communityError) throw new Error(communityError.message);

  let community = existingCommunity;
  if (!community) {
    const created = await auth.supabase
      .from("groups")
      .insert({
        name: communityName,
        description: "Official announcements, platform updates and conversations for every TradeWay trader.",
        avatar: "TW",
        owner_id: auth.user.id,
        is_private: false,
      })
      .select("id")
      .single<{ id: string }>();

    if (created.error) {
      const existing = await auth.supabase
        .from("groups")
        .select("id")
        .eq("name", communityName)
        .single<{ id: string }>();
      if (existing.error) throw new Error(created.error.message);
      community = existing.data;
    } else {
      community = created.data;
    }
  }

  const { data: profiles, error: profilesError } = await auth.supabase
    .from("profiles")
    .select("id")
    .returns<Array<{ id: string }>>();
  if (profilesError) throw new Error(profilesError.message);

  const { data: members, error: membersError } = await auth.supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", community.id)
    .returns<Array<{ user_id: string }>>();
  if (membersError) throw new Error(membersError.message);

  const memberIds = new Set((members ?? []).map((member) => member.user_id));
  const missing = (profiles ?? []).filter((profile) => !memberIds.has(profile.id));
  if (!missing.length) return;

  const { error: insertError } = await auth.supabase
    .from("group_members")
    .upsert(
      missing.map((profile) => ({
        group_id: community.id,
        user_id: profile.id,
        added_by: auth.user.id,
      })),
      { onConflict: "group_id,user_id", ignoreDuplicates: true },
    );
  if (insertError) throw new Error(insertError.message);
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    const chats = await loadChats(auth);
    return Response.json({ chats });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as { name?: string; memberIds?: string[] };
  const memberIds = [...new Set((body.memberIds ?? []).filter((id) => id !== auth.user.id))].slice(0, 20);
  const allMemberIds = [auth.user.id, ...memberIds];

  if (!body.name?.trim() && memberIds.length === 0) {
    return badRequest("Chat nomini yozing yoki kamida bitta foydalanuvchi tanlang.");
  }

  const { data: profiles, error: profilesError } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", allMemberIds)
    .returns<ProfileRecord[]>();

  if (profilesError) return serverError(profilesError.message);
  if (profiles.length !== allMemberIds.length) return badRequest("Tanlangan foydalanuvchilardan biri topilmadi.");

  const selectedProfiles = profiles.filter((profile) => profile.id !== auth.user.id);
  const defaultName = selectedProfiles.map((profile) => profile.full_name).join(", ") || "Shaxsiy chat";
  const name = (body.name?.trim() || defaultName).slice(0, 70);

  const { data: group, error: groupError } = await auth.supabase
    .from("groups")
    .insert({
      name,
      description: selectedProfiles.length
        ? `${selectedProfiles.length + 1} trader uchun private suhbat`
        : "Shaxsiy trading eslatmalari uchun private chat",
      avatar: initials(name),
      owner_id: auth.user.id,
      is_private: true,
    })
    .select("id, name, description, avatar, is_private, created_at")
    .single<GroupRecord>();

  if (groupError) return serverError(groupError.message);

  const { data: members, error: membersError } = await auth.supabase
    .from("group_members")
    .insert(allMemberIds.map((userId) => ({
      group_id: group.id,
      user_id: userId,
      added_by: auth.user.id,
    })))
    .select("group_id, user_id, created_at")
    .returns<MemberRecord[]>();

  if (membersError) return serverError(membersError.message);

  return Response.json({ chat: mapChat(group, members, profiles) }, { status: 201 });
}
