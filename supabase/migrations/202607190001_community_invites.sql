alter table public.community_members
  alter column status set default 'invited';

create unique index if not exists notifications_community_invite_unique
  on public.notifications(user_id, type, entity_id)
  where type = 'community_invite' and entity_id is not null;

comment on index public.notifications_community_invite_unique is
  'Prevents duplicate pending community invitation notifications.';
