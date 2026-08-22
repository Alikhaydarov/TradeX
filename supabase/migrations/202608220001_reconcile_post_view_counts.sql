-- Make feed views a durable count of distinct signed-in viewers.
-- This safely corrects counters created by older render-based view tracking.

create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);

alter table public.post_views enable row level security;

create index if not exists post_views_post_id_idx
  on public.post_views (post_id);

create index if not exists post_views_viewer_viewed_idx
  on public.post_views (viewer_id, viewed_at desc);

update public.posts post
set views_count = coalesce((
  select count(*)::integer
  from public.post_views view
  where view.post_id = post.id
), 0);

create or replace function public.record_unique_post_view(target_post_id uuid)
returns table(counted boolean, current_views integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  inserted_rows integer := 0;
begin
  if caller_id is null then
    return query select false, null::integer;
    return;
  end if;

  if not exists (
    select 1
    from public.posts post
    where post.id = target_post_id
      and coalesce(post.is_archived, false) = false
  ) then
    return query select false, null::integer;
    return;
  end if;

  if exists (
    select 1
    from public.posts post
    where post.id = target_post_id and post.user_id = caller_id
  ) then
    return query
      select false, post.views_count
      from public.posts post
      where post.id = target_post_id;
    return;
  end if;

  insert into public.post_views (post_id, viewer_id)
  values (target_post_id, caller_id)
  on conflict (post_id, viewer_id) do nothing;
  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    return query
      update public.posts post
      set views_count = coalesce(post.views_count, 0) + 1
      where post.id = target_post_id
      returning true, post.views_count;
    return;
  end if;

  return query
    select false, post.views_count
    from public.posts post
    where post.id = target_post_id;
end;
$$;

revoke all on function public.record_unique_post_view(uuid) from public, anon;
grant execute on function public.record_unique_post_view(uuid) to authenticated;
