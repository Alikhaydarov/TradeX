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

function mapChat(group: GroupRecord, members: MemberRecord[], profiles: ProfileRecord[]) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    avatar: group.avatar,
    isPrivate: Boolean(group.is_private),
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

async function isMember(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  chatId: string,
) {
  const { data, error } = await auth.supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", chatId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function loadChat(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  chatId: string,
) {
  const [{ data: group, error: groupError }, { data: members, error: membersError }] = await Promise.all([
    auth.supabase
      .from("groups")
      .select("id, name, description, avatar, is_private, created_at")
      .eq("id", chatId)
      .single<GroupRecord>(),
    auth.supabase
      .from("group_members")
      .select("group_id, user_id, created_at")
      .eq("group_id", chatId)
      .returns<MemberRecord[]>(),
  ]);

  if (groupError) throw new Error(groupError.message);
  if (membersError) throw new Error(membersError.message);

  const profileIds = [...new Set(members.map((member) => member.user_id))];
  const { data: profiles, error: profilesError } = await auth.supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", profileIds)
    .returns<ProfileRecord[]>();

  if (profilesError) throw new Error(profilesError.message);

  return mapChat(group, members, profiles);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as { memberIds?: string[] };
  const memberIds = [...new Set((body.memberIds ?? []).filter((userId) => userId !== auth.user.id))].slice(0, 20);

  if (!memberIds.length) return badRequest("Qo'shish uchun kamida bitta foydalanuvchi tanlang.");

  try {
    if (!(await isMember(auth, id))) return unauthorized();

    const { data: existingMembers, error: existingMembersError } = await auth.supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", id)
      .returns<Array<{ user_id: string }>>();

    if (existingMembersError) return serverError(existingMembersError.message);

    const existingIds = new Set(existingMembers.map((member) => member.user_id));
    const newMemberIds = memberIds.filter((userId) => !existingIds.has(userId));

    if (!newMemberIds.length) return badRequest("Tanlangan userlar allaqachon chatda bor.");

    const { data: profiles, error: profilesError } = await auth.supabase
      .from("profiles")
      .select("id")
      .in("id", newMemberIds)
      .returns<Array<{ id: string }>>();

    if (profilesError) return serverError(profilesError.message);
    if (profiles.length !== newMemberIds.length) return badRequest("Tanlangan foydalanuvchilardan biri topilmadi.");

    const { error: insertError } = await auth.supabase
      .from("group_members")
      .insert(newMemberIds.map((userId) => ({
        group_id: id,
        user_id: userId,
        added_by: auth.user.id,
      })));

    if (insertError) return serverError(insertError.message);

    const chat = await loadChat(auth, id);
    return Response.json({ chat });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
