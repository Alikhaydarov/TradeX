-- Reconcile legacy billing rows with the canonical profile access contract.
-- Some early Stripe/manual rows used `basic`/`premium` and were saved in
-- subscriptions before profiles.plan existed. Admin and runtime access must
-- not show those paid users as Free.

update public.profiles
set plan = case lower(coalesce(plan, 'free'))
  when 'basic' then 'standard'
  when 'premium' then 'pro'
  else coalesce(lower(nullif(plan, '')), 'free')
end
where lower(coalesce(plan, 'free')) in ('basic', 'premium')
   or plan is null
   or plan = '';

update public.subscriptions
set plan = case lower(coalesce(plan, 'free'))
  when 'basic' then 'standard'
  when 'premium' then 'pro'
  else lower(coalesce(plan, 'free'))
end
where lower(coalesce(plan, 'free')) in ('basic', 'premium');

-- Promote profile access from a current paid subscription. This never
-- downgrades manual admin-granted access; cancellation remains handled by the
-- Stripe webhook.
with active_paid_subscription as (
  select distinct on (s.user_id)
    s.user_id,
    case lower(s.plan)
      when 'basic' then 'standard'
      when 'premium' then 'pro'
      else lower(s.plan)
    end as plan,
    s.current_period_end
  from public.subscriptions s
  where lower(coalesce(s.status, '')) in ('active', 'trialing', 'past_due')
    and lower(coalesce(s.plan, '')) in ('basic', 'standard', 'premium', 'pro')
    and (s.current_period_end is null or s.current_period_end > timezone('utc', now()))
  order by s.user_id, s.current_period_end desc nulls last, s.updated_at desc nulls last, s.created_at desc
)
update public.profiles p
set
  plan = paid.plan,
  premium_until = paid.current_period_end,
  is_verified = true,
  ai_enabled = true,
  traderox_enabled = true,
  auto_sync_enabled = true,
  updated_at = timezone('utc', now())
from active_paid_subscription paid
where p.id = paid.user_id
  and paid.plan in ('standard', 'pro');

-- Admin listings use the current paid subscription as a fallback as well, so
-- a webhook/profile write race cannot mislabel a paid user as Free.
-- The earlier function returned only identity fields. PostgreSQL cannot change
-- a function's TABLE return signature with CREATE OR REPLACE, so remove that
-- legacy signature before installing the canonical admin contract.
drop function if exists public.admin_list_users();

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
  if not coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) then
    raise exception 'Ruxsat berilmagan';
  end if;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    u.email::text,
    case when paid.plan is not null then true else coalesce(p.is_verified, false) end,
    coalesce(p.is_admin, false),
    coalesce(paid.plan, case lower(coalesce(p.plan, 'free')) when 'basic' then 'standard' when 'premium' then 'pro' else lower(coalesce(p.plan, 'free')) end),
    coalesce(paid.current_period_end, p.premium_until),
    case when paid.plan is not null then true else coalesce(p.ai_enabled, false) end,
    case when paid.plan is not null then true else coalesce(p.traderox_enabled, false) end,
    case when paid.plan is not null then true else coalesce(p.auto_sync_enabled, false) end,
    latest.status,
    latest.provider,
    coalesce(account_stats.accounts_count, 0),
    coalesce(journal_stats.journal_entries_count, 0),
    coalesce(post_stats.posts_count, 0),
    p.created_at,
    u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select s.status, s.provider
    from public.subscriptions s
    where s.user_id = p.id
    order by s.updated_at desc nulls last, s.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select
      case lower(s.plan) when 'basic' then 'standard' when 'premium' then 'pro' else lower(s.plan) end as plan,
      s.current_period_end
    from public.subscriptions s
    where s.user_id = p.id
      and lower(coalesce(s.status, '')) in ('active', 'trialing', 'past_due')
      and lower(coalesce(s.plan, '')) in ('basic', 'standard', 'premium', 'pro')
      and (s.current_period_end is null or s.current_period_end > timezone('utc', now()))
    order by s.current_period_end desc nulls last, s.updated_at desc nulls last, s.created_at desc
    limit 1
  ) paid on true
  left join lateral (
    select count(*) as accounts_count from public.prop_accounts a where a.user_id = p.id
  ) account_stats on true
  left join lateral (
    select count(*) as journal_entries_count from public.journal_entries j where j.user_id = p.id
  ) journal_stats on true
  left join lateral (
    select count(*) as posts_count from public.posts posts where posts.user_id = p.id and coalesce(posts.is_archived, false) = false
  ) post_stats on true
  order by coalesce(p.is_admin, false) desc, p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated, service_role;

comment on function public.admin_list_users() is
  'Lists users with canonical profile access and active subscription fallback for the TradeWay superadmin console.';
