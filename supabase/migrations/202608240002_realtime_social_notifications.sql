-- Deliver follow, like, reply and repost notifications without waiting for polling.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, created_at desc)
  where is_read = false;

