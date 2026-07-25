-- Community chat: channels, DMs, realtime-ready messages, reactions and reads.
-- This migration extends the existing community schema without replacing it.

create extension if not exists pgcrypto;

alter table if exists public.communities
  add column if not exists avatar_url text,
  add column if not exists is_public boolean not null default false;

alter table if exists public.community_members
  add column if not exists muted_until timestamptz,
  add column if not exists banned boolean not null default false;

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type text not null default 'text' check (type = 'text'),
  is_premium_only boolean not null default false,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references auth.users(id) on delete cascade,
  user_two_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dm_threads_distinct_users check (user_one_id <> user_two_id)
);

create unique index if not exists dm_threads_unique_pair_idx
  on public.dm_threads (least(user_one_id, user_two_id), greatest(user_one_id, user_two_id));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  dm_thread_id uuid references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 4000),
  client_id text,
  reply_to_message_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_single_destination check (
    (channel_id is not null and dm_thread_id is null)
    or (channel_id is null and dm_thread_id is not null)
  )
);

create unique index if not exists messages_sender_client_id_idx
  on public.messages(sender_id, client_id)
  where client_id is not null;
create index if not exists messages_channel_created_idx
  on public.messages(channel_id, created_at desc, id desc)
  where channel_id is not null;
create index if not exists messages_dm_created_idx
  on public.messages(dm_thread_id, created_at desc, id desc)
  where dm_thread_id is not null;
create index if not exists messages_reply_idx
  on public.messages(reply_to_message_id)
  where reply_to_message_id is not null;

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 24),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists message_reactions_message_idx
  on public.message_reactions(message_id, created_at);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  dm_thread_id uuid references public.dm_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  constraint message_reads_single_destination check (
    (channel_id is not null and dm_thread_id is null)
    or (channel_id is null and dm_thread_id is not null)
  )
);
create unique index if not exists message_reads_channel_user_idx
  on public.message_reads(channel_id, user_id)
  where channel_id is not null;
create unique index if not exists message_reads_dm_user_idx
  on public.message_reads(dm_thread_id, user_id)
  where dm_thread_id is not null;

-- Helper functions are SECURITY DEFINER so RLS policies can safely check membership
-- without recursively evaluating community_members policies.
create or replace function public.chat_is_active_member(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = target_community_id
      and cm.user_id = target_user_id
      and cm.status = 'active'
      and coalesce(cm.banned, false) = false
  ) or exists (
    select 1 from public.communities c
    where c.id = target_community_id and c.owner_id = target_user_id
  );
$$;

create or replace function public.chat_is_community_admin(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.communities c
    where c.id = target_community_id and c.owner_id = target_user_id
  ) or exists (
    select 1
    from public.community_members cm
    where cm.community_id = target_community_id
      and cm.user_id = target_user_id
      and cm.status = 'active'
      and cm.role in ('owner', 'admin')
      and coalesce(cm.banned, false) = false
  );
$$;

create or replace function public.chat_user_has_premium(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user_id
      and lower(coalesce(p.plan, 'free')) in ('standard', 'basic', 'pro', 'premium')
      and (p.premium_until is null or p.premium_until > now())
  ) or exists (
    select 1 from public.subscriptions s
    where s.user_id = target_user_id
      and s.status in ('active', 'trialing', 'past_due')
      and lower(coalesce(s.plan, 'free')) in ('standard', 'basic', 'pro', 'premium')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function public.chat_can_read_channel(target_channel_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels ch
    where ch.id = target_channel_id
      and ch.community_id is not null
      and public.chat_is_active_member(ch.community_id, target_user_id)
      and (not ch.is_premium_only or public.chat_user_has_premium(target_user_id))
  );
$$;

create or replace function public.chat_can_send_channel(target_channel_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels ch
    left join public.community_members cm
      on cm.community_id = ch.community_id and cm.user_id = target_user_id
    left join public.communities c on c.id = ch.community_id
    where ch.id = target_channel_id
      and public.chat_can_read_channel(ch.id, target_user_id)
      and (
        c.owner_id = target_user_id
        or (cm.status = 'active' and coalesce(cm.banned, false) = false
          and (cm.muted_until is null or cm.muted_until <= now()))
      )
  );
$$;

create or replace function public.chat_is_dm_participant(target_thread_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_threads d
    where d.id = target_thread_id
      and target_user_id in (d.user_one_id, d.user_two_id)
  );
$$;

create or replace function public.chat_can_read_message(target_message_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.messages m
    where m.id = target_message_id
      and (
        (m.channel_id is not null and public.chat_can_read_channel(m.channel_id, target_user_id))
        or (m.dm_thread_id is not null and public.chat_is_dm_participant(m.dm_thread_id, target_user_id))
      )
  );
$$;

grant execute on function public.chat_is_active_member(uuid, uuid) to authenticated;
grant execute on function public.chat_is_community_admin(uuid, uuid) to authenticated;
grant execute on function public.chat_user_has_premium(uuid) to authenticated;
grant execute on function public.chat_can_read_channel(uuid, uuid) to authenticated;
grant execute on function public.chat_can_send_channel(uuid, uuid) to authenticated;
grant execute on function public.chat_is_dm_participant(uuid, uuid) to authenticated;
grant execute on function public.chat_can_read_message(uuid, uuid) to authenticated;

alter table public.channels enable row level security;
alter table public.dm_threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reads enable row level security;

-- Recreate only policies owned by this migration, leaving existing community RLS intact.
drop policy if exists chat_channels_select on public.channels;
create policy chat_channels_select on public.channels for select to authenticated
using (public.chat_can_read_channel(id, auth.uid()));

drop policy if exists chat_channels_insert on public.channels;
create policy chat_channels_insert on public.channels for insert to authenticated
with check (
  community_id is not null
  and created_by = auth.uid()
  and public.chat_is_community_admin(community_id, auth.uid())
);

drop policy if exists chat_channels_update on public.channels;
create policy chat_channels_update on public.channels for update to authenticated
using (public.chat_is_community_admin(community_id, auth.uid()))
with check (public.chat_is_community_admin(community_id, auth.uid()));

drop policy if exists chat_channels_delete on public.channels;
create policy chat_channels_delete on public.channels for delete to authenticated
using (public.chat_is_community_admin(community_id, auth.uid()));

drop policy if exists chat_dm_select on public.dm_threads;
create policy chat_dm_select on public.dm_threads for select to authenticated
using (auth.uid() in (user_one_id, user_two_id));

drop policy if exists chat_dm_insert on public.dm_threads;
create policy chat_dm_insert on public.dm_threads for insert to authenticated
with check (auth.uid() in (user_one_id, user_two_id));

drop policy if exists chat_messages_select on public.messages;
create policy chat_messages_select on public.messages for select to authenticated
using (
  (channel_id is not null and public.chat_can_read_channel(channel_id, auth.uid()))
  or (dm_thread_id is not null and public.chat_is_dm_participant(dm_thread_id, auth.uid()))
);

drop policy if exists chat_messages_insert on public.messages;
create policy chat_messages_insert on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    (channel_id is not null and public.chat_can_send_channel(channel_id, auth.uid()))
    or (dm_thread_id is not null and public.chat_is_dm_participant(dm_thread_id, auth.uid()))
  )
);

drop policy if exists chat_messages_update on public.messages;
create policy chat_messages_update on public.messages for update to authenticated
using (
  sender_id = auth.uid()
  or exists (
    select 1 from public.channels ch
    where ch.id = messages.channel_id
      and public.chat_is_community_admin(ch.community_id, auth.uid())
  )
)
with check (
  sender_id = auth.uid()
  or exists (
    select 1 from public.channels ch
    where ch.id = messages.channel_id
      and public.chat_is_community_admin(ch.community_id, auth.uid())
  )
);

drop policy if exists chat_reactions_select on public.message_reactions;
create policy chat_reactions_select on public.message_reactions for select to authenticated
using (public.chat_can_read_message(message_id, auth.uid()));

drop policy if exists chat_reactions_insert on public.message_reactions;
create policy chat_reactions_insert on public.message_reactions for insert to authenticated
with check (user_id = auth.uid() and public.chat_can_read_message(message_id, auth.uid()));

drop policy if exists chat_reactions_delete on public.message_reactions;
create policy chat_reactions_delete on public.message_reactions for delete to authenticated
using (user_id = auth.uid());

drop policy if exists chat_reads_select on public.message_reads;
create policy chat_reads_select on public.message_reads for select to authenticated
using (user_id = auth.uid());

drop policy if exists chat_reads_insert on public.message_reads;
create policy chat_reads_insert on public.message_reads for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    (channel_id is not null and public.chat_can_read_channel(channel_id, auth.uid()))
    or (dm_thread_id is not null and public.chat_is_dm_participant(dm_thread_id, auth.uid()))
  )
);

drop policy if exists chat_reads_update on public.message_reads;
create policy chat_reads_update on public.message_reads for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed one default channel per existing community. Conflict-safe for reruns.
insert into public.channels (community_id, name, position, created_by)
select c.id, 'general', 0, c.owner_id
from public.communities c
where not exists (
  select 1 from public.channels ch
  where ch.community_id = c.id and lower(ch.name) = 'general'
);
