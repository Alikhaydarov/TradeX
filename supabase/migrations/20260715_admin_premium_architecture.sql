alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists premium_until timestamptz,
  add column if not exists ai_enabled boolean not null default false,
  add column if not exists traderox_enabled boolean not null default false,
  add column if not exists auto_sync_enabled boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_admin boolean not null default false;

update public.profiles
set plan = coalesce(nullif(plan, ''), 'free')
where plan is null or plan = '';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'standard', 'pro', 'premium'));

create or replace function public.is_premium_plan(plan_value text)
returns boolean
language sql
immutable
as $$
  select coalesce(plan_value, 'free') in ('standard', 'pro', 'premium');
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  is_admin boolean,
  plan text,
  premium_until timestamptz,
  ai_enabled boolean,
  traderox_enabled boolean,
  auto_sync_enabled boolean,
  created_at timestamptz
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
    coalesce(p.is_verified, false),
    coalesce(p.is_admin, false),
    coalesce(p.plan, 'free'),
    p.premium_until,
    coalesce(p.ai_enabled, false),
    coalesce(p.traderox_enabled, false),
    coalesce(p.auto_sync_enabled, false),
    p.created_at
  from public.profiles p
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_user_access(
  target_user_id uuid,
  next_plan text,
  next_verified boolean default true,
  next_premium_until timestamptz default null
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
    auto_sync_enabled = premium_enabled
  where id = target_user_id;
end;
$$;

comment on function public.is_premium_plan(text) is
  'Returns true for paid TradeWay plans that unlock premium features.';

comment on function public.admin_set_user_access(uuid, text, boolean, timestamptz) is
  'Admin-only access control helper. Syncs plan, verification and premium feature flags in one write.';
