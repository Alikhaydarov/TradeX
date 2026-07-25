-- Private Supabase Realtime authorization for community chat Broadcast + Presence.
-- Topics use channel:{channel_id} and dm:{dm_thread_id}.

create or replace function public.chat_can_access_realtime_topic(target_topic text, target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  topic_kind text;
  topic_id_text text;
  topic_id uuid;
begin
  topic_kind := split_part(target_topic, ':', 1);
  topic_id_text := split_part(target_topic, ':', 2);

  if topic_kind not in ('channel', 'dm')
    or topic_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return false;
  end if;

  topic_id := topic_id_text::uuid;
  if topic_kind = 'channel' then
    return public.chat_can_read_channel(topic_id, target_user_id);
  end if;

  return public.chat_is_dm_participant(topic_id, target_user_id);
end;
$$;

grant execute on function public.chat_can_access_realtime_topic(text, uuid) to authenticated;

drop policy if exists "tradox chat can receive realtime" on realtime.messages;
create policy "tradox chat can receive realtime"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.chat_can_access_realtime_topic((select realtime.topic()), (select auth.uid()))
);

drop policy if exists "tradox chat can send realtime" on realtime.messages;
create policy "tradox chat can send realtime"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.chat_can_access_realtime_topic((select realtime.topic()), (select auth.uid()))
);
