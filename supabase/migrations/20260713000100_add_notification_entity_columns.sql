alter table public.notifications
  add column if not exists entity_id uuid,
  add column if not exists entity_type text;

create index if not exists notifications_entity_idx
  on public.notifications(entity_type, entity_id);
