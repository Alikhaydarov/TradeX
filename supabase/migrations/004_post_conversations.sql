create table if not exists public.post_reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists post_reposts_user_id_idx on public.post_reposts(user_id);
create index if not exists post_replies_post_id_created_at_idx on public.post_replies(post_id, created_at);
create index if not exists post_replies_user_id_idx on public.post_replies(user_id);

alter table public.post_reposts enable row level security;
alter table public.post_replies enable row level security;

drop policy if exists "Post reposts are public" on public.post_reposts;
create policy "Post reposts are public"
  on public.post_reposts for select
  using (true);

drop policy if exists "Users manage own reposts" on public.post_reposts;
create policy "Users manage own reposts"
  on public.post_reposts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Post replies are public" on public.post_replies;
create policy "Post replies are public"
  on public.post_replies for select
  using (true);

drop policy if exists "Users create own replies" on public.post_replies;
create policy "Users create own replies"
  on public.post_replies for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own replies" on public.post_replies;
create policy "Users delete own replies"
  on public.post_replies for delete
  using (auth.uid() = user_id);

create or replace function public.sync_post_reposts_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set reposts_count = (
    select count(*) from public.post_reposts where post_id = coalesce(new.post_id, old.post_id)
  )
  where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_post_replies_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set replies_count = (
    select count(*) from public.post_replies where post_id = coalesce(new.post_id, old.post_id)
  )
  where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_post_reposts_count_trigger on public.post_reposts;
create trigger sync_post_reposts_count_trigger
after insert or delete on public.post_reposts
for each row execute function public.sync_post_reposts_count();

drop trigger if exists sync_post_replies_count_trigger on public.post_replies;
create trigger sync_post_replies_count_trigger
after insert or delete on public.post_replies
for each row execute function public.sync_post_replies_count();
