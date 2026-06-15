-- TradeUp social system: follows + notifications

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'follow',
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_follows_follower_idx on public.user_follows(follower_id);
create index if not exists user_follows_following_idx on public.user_follows(following_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read, created_at desc);

alter table public.user_follows enable row level security;
alter table public.notifications enable row level security;

-- user_follows policies
drop policy if exists "Users can view follows" on public.user_follows;
drop policy if exists "Users can follow" on public.user_follows;
drop policy if exists "Users can unfollow" on public.user_follows;

create policy "Users can view follows"
on public.user_follows
for select
to authenticated
using (true);

create policy "Users can follow"
on public.user_follows
for insert
to authenticated
with check (follower_id = auth.uid());

create policy "Users can unfollow"
on public.user_follows
for delete
to authenticated
using (follower_id = auth.uid());

-- notifications policies
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can create follow notifications" on public.notifications;
drop policy if exists "Users can read own notifications" on public.notifications;

create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create follow notifications"
on public.notifications
for insert
to authenticated
with check (actor_id = auth.uid());

create policy "Users can read own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Make profile search readable for logged-in users if not already allowed.
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
on public.profiles
for select
to authenticated
using (true);
