create index if not exists profiles_plan_verified_idx
  on public.profiles(plan, is_verified, is_admin);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status, current_period_end desc);

create index if not exists trading_accounts_user_platform_status_idx
  on public.trading_accounts(user_id, platform, status, created_at desc);

create index if not exists posts_user_created_idx
  on public.posts(user_id, created_at desc);

create index if not exists journal_entries_user_created_idx
  on public.journal_entries(user_id, traded_at desc);

create index if not exists prop_accounts_user_created_idx
  on public.prop_accounts(user_id, created_at desc);

create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  email text,
  is_verified boolean,
  is_admin boolean,
  plan text,
  premium_until timestamptz,
  ai_enabled boolean,
  traderox_enabled boolean,
  auto_sync_enabled boolean,
  subscription_status text,
  subscription_provider text,
  accounts_count bigint,
  journal_entries_count bigint,
  posts_count bigint,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((select profiles.is_admin from public.profiles where profiles.id = auth.uid()), false) then
    raise exception 'Ruxsat berilmagan';
  end if;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    u.email::text,
    coalesce(p.is_verified, false),
    coalesce(p.is_admin, false),
    coalesce(p.plan, 'free'),
    p.premium_until,
    coalesce(p.ai_enabled, false),
    coalesce(p.traderox_enabled, false),
    coalesce(p.auto_sync_enabled, false),
    subscription.status,
    subscription.provider,
    coalesce(account_stats.accounts_count, 0),
    coalesce(journal_stats.journal_entries_count, 0),
    coalesce(post_stats.posts_count, 0),
    p.created_at,
    u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select
      s.status,
      s.provider
    from public.subscriptions s
    where s.user_id = p.id
    order by s.current_period_end desc nulls last, s.created_at desc
    limit 1
  ) subscription on true
  left join lateral (
    select count(*) as accounts_count
    from public.prop_accounts a
    where a.user_id = p.id
  ) account_stats on true
  left join lateral (
    select count(*) as journal_entries_count
    from public.journal_entries j
    where j.user_id = p.id
  ) journal_stats on true
  left join lateral (
    select count(*) as posts_count
    from public.posts posts
    where posts.user_id = p.id
      and coalesce(posts.is_archived, false) = false
  ) post_stats on true
  order by coalesce(p.is_admin, false) desc, p.created_at desc;
end;
$$;

create or replace function public.admin_set_user_access(
  target_user_id uuid,
  next_plan text,
  next_verified boolean default true,
  next_premium_until timestamptz default null,
  next_is_admin boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_plan text := lower(coalesce(next_plan, 'free'));
  premium_enabled boolean;
begin
  if not coalesce((select profiles.is_admin from public.profiles where profiles.id = auth.uid()), false) then
    raise exception 'Ruxsat berilmagan';
  end if;

  if normalized_plan not in ('free', 'standard', 'pro', 'premium') then
    raise exception 'Noto''g''ri tarif rejasi';
  end if;

  premium_enabled := public.is_premium_plan(normalized_plan);

  update public.profiles
  set
    plan = normalized_plan,
    premium_until = case
      when premium_enabled then next_premium_until
      else null
    end,
    is_verified = case
      when premium_enabled then coalesce(next_verified, true)
      else false
    end,
    ai_enabled = premium_enabled,
    traderox_enabled = premium_enabled,
    auto_sync_enabled = premium_enabled,
    is_admin = coalesce(next_is_admin, is_admin)
  where id = target_user_id;
end;
$$;

comment on function public.admin_list_users() is
  'Superadmin user directory for TradeWay. Returns profile, access plan and auth metadata.';

comment on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) is
  'Superadmin helper to sync TradeWay plan, verification, admin state and premium feature flags.';
