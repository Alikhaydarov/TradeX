create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default 'Trader',
  avatar_url text,
  bio text not null default '',
  trading_style text not null default 'Price Action',
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  author_name text not null,
  author_handle text not null,
  author_avatar text,
  symbol text,
  side text check (side in ('LONG', 'SHORT')),
  entry_price text,
  target_price text,
  likes_count integer not null default 0 check (likes_count >= 0),
  replies_count integer not null default 0 check (replies_count >= 0),
  reposts_count integer not null default 0 check (reposts_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text not null default '',
  avatar text not null default 'TX',
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_avatar text,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts(created_at desc);
create index if not exists group_messages_group_created_idx
  on public.group_messages(group_id, created_at);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.groups enable row level security;
alter table public.group_messages enable row level security;

create policy "Profiles are visible to everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Posts are visible to everyone"
  on public.posts for select using (true);
create policy "Authenticated users can create posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own posts"
  on public.posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Groups are visible to everyone"
  on public.groups for select using (true);
create policy "Authenticated users can create groups"
  on public.groups for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Messages are visible to everyone"
  on public.group_messages for select using (true);
create policy "Authenticated users can send messages"
  on public.group_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own messages"
  on public.group_messages for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_username text;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1), 'trader'),
      '[^a-zA-Z0-9_]',
      '',
      'g'
    )
  );

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    base_username || '_' || left(new.id::text, 5),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Trader'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.groups (name, description, avatar)
values
  ('Crypto Uzbekistan', 'Kripto bozor tahlili va savdo g''oyalari', 'BTC'),
  ('Forex Masters', 'Forex traderlar uchun yopiq muhokama', 'FX'),
  ('Price Action', 'Toza grafik va price action setup''lari', 'PA'),
  ('Algo Traders', 'Algoritmik trading va backtesting', 'AI')
on conflict (name) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.group_messages;
exception when duplicate_object then null;
end $$;

