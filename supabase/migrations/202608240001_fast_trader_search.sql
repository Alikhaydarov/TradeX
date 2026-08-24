-- Fast, bounded trader search with relationship metadata in one database call.

create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create index if not exists profiles_full_name_lower_idx
  on public.profiles (lower(full_name));

create index if not exists user_follows_follower_following_idx
  on public.user_follows (follower_id, following_id);

create index if not exists user_follows_following_follower_idx
  on public.user_follows (following_id, follower_id);

create or replace function public.search_traders(
  search_query text default '',
  result_limit integer default 20
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  trading_style text,
  location text,
  is_verified boolean,
  plan text,
  premium_until timestamptz,
  followers_count bigint,
  following_count bigint,
  is_following boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with matched_profiles as (
    select profile.*
    from public.profiles profile
    where profile.id <> auth.uid()
      and (
        nullif(trim(search_query), '') is null
        or profile.username ilike '%' || left(trim(search_query), 40) || '%'
        or profile.full_name ilike '%' || left(trim(search_query), 40) || '%'
      )
    order by
      case
        when nullif(trim(search_query), '') is not null
          and lower(profile.username) = lower(left(trim(search_query), 40)) then 0
        when nullif(trim(search_query), '') is not null
          and lower(profile.username) like lower(left(trim(search_query), 40)) || '%' then 1
        else 2
      end,
      profile.created_at desc
    limit least(greatest(coalesce(result_limit, 20), 1), 20)
  )
  select
    profile.id,
    profile.username,
    profile.full_name,
    profile.avatar_url,
    profile.bio,
    profile.trading_style,
    profile.location,
    profile.is_verified,
    profile.plan,
    profile.premium_until,
    (select count(*) from public.user_follows follow_row where follow_row.following_id = profile.id),
    (select count(*) from public.user_follows follow_row where follow_row.follower_id = profile.id),
    exists (
      select 1
      from public.user_follows follow_row
      where follow_row.follower_id = auth.uid()
        and follow_row.following_id = profile.id
    )
  from matched_profiles profile;
$$;

revoke all on function public.search_traders(text, integer) from public;
revoke all on function public.search_traders(text, integer) from anon;
grant execute on function public.search_traders(text, integer) to authenticated;
