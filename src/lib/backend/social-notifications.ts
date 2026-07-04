import type { SupabaseClient } from "@supabase/supabase-js";

interface NotifyInput {
  userId: string;
  actorId: string | null;
  type: string;
  message: string;
  entityId?: string | null;
  entityType?: string | null;
  dedupe?: boolean;
}

export async function sendSocialNotification(
  supabase: SupabaseClient,
  input: NotifyInput,
) {
  const payload = {
    user_id: input.userId,
    actor_id: input.actorId,
    type: input.type,
    message: input.message,
    entity_id: input.entityId ?? null,
    entity_type: input.entityType ?? null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const fallbackPayload = {
    user_id: input.userId,
    actor_id: input.actorId,
    type: input.type,
    message: input.message,
    is_read: false,
  };

  if (!input.dedupe || !input.entityId || !input.entityType || !input.actorId) {
    const result = await supabase.from("notifications").insert(payload);
    if (!result.error || !/entity_|metadata/i.test(result.error.message)) return result;
    return supabase.from("notifications").insert(fallbackPayload);
  }

  const existingQuery = supabase
    .from("notifications")
    .select("id")
    .eq("user_id", input.userId)
    .eq("actor_id", input.actorId)
    .eq("type", input.type)
    .eq("entity_id", input.entityId)
    .eq("entity_type", input.entityType)
    .limit(1)
    .maybeSingle();

  const { data: existing, error: existingError } = await existingQuery;
  if (existingError) {
    if (/entity_|metadata/i.test(existingError.message)) {
      return supabase.from("notifications").insert(fallbackPayload);
    }
    return { error: existingError };
  }

  if (existing?.id) {
    const result = await supabase
      .from("notifications")
      .update({
        message: payload.message,
        is_read: false,
        created_at: payload.created_at,
      })
      .eq("id", existing.id);
    if (!result.error || !/entity_|metadata/i.test(result.error.message)) return result;
    return supabase.from("notifications").insert(fallbackPayload);
  }

  const result = await supabase.from("notifications").insert(payload);
  if (!result.error || !/entity_|metadata/i.test(result.error.message)) return result;
  return supabase.from("notifications").insert(fallbackPayload);
}
