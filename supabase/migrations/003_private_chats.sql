alter table public.groups
  add column if not exists is_private boolean not null default false;

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx
  on public.group_members(user_id, created_at desc);
create index if not exists group_members_group_idx
  on public.group_members(group_id);

alter table public.group_members enable row level security;

drop policy if exists "Group members can view chat members" on public.group_members;
create policy "Group members can view chat members"
  on public.group_members for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.group_members member_check
      where member_check.group_id = group_members.group_id
        and member_check.user_id = (select auth.uid())
    )
  );

drop policy if exists "Authenticated users can add chat members" on public.group_members;
create policy "Authenticated users can add chat members"
  on public.group_members for insert to authenticated
  with check (
    (select auth.uid()) = added_by
    or (select auth.uid()) = user_id
  );

drop policy if exists "Users can leave their chats" on public.group_members;
create policy "Users can leave their chats"
  on public.group_members for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Messages are visible to everyone" on public.group_messages;
drop policy if exists "Authenticated users can send messages" on public.group_messages;

create policy "Chat members can view messages"
  on public.group_messages for select to authenticated
  using (
    exists (
      select 1
      from public.group_members
      where group_members.group_id = group_messages.group_id
        and group_members.user_id = (select auth.uid())
    )
  );

create policy "Chat members can send messages"
  on public.group_messages for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.group_members
      where group_members.group_id = group_messages.group_id
        and group_members.user_id = (select auth.uid())
    )
  );
