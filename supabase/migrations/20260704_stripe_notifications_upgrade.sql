alter table public.notifications
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create unique index if not exists notifications_like_entity_unique
  on public.notifications(user_id, actor_id, type, entity_id)
  where type = 'post_like' and entity_id is not null;
