-- TradeWay billing has three visible tiers: Free, Standard and Pro.
-- Preserve existing paid users by moving the legacy Premium label to Pro.
update public.profiles
set plan = 'pro'
where lower(coalesce(plan, 'free')) = 'premium';

update public.subscriptions
set plan = 'pro'
where lower(coalesce(plan, '')) = 'premium';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'standard', 'pro'));

create or replace function public.is_premium_plan(plan_value text)
returns boolean
language sql
immutable
as $$
  select coalesce(lower(plan_value), 'free') in ('standard', 'pro');
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

  if normalized_plan not in ('free', 'standard', 'pro') then
    raise exception 'Noto''g''ri tarif rejasi';
  end if;

  premium_enabled := public.is_premium_plan(normalized_plan);

  update public.profiles
  set
    plan = normalized_plan,
    premium_until = case when premium_enabled then next_premium_until else null end,
    is_verified = case when premium_enabled then coalesce(next_verified, true) else false end,
    ai_enabled = premium_enabled,
    traderox_enabled = premium_enabled,
    auto_sync_enabled = premium_enabled,
    is_admin = coalesce(next_is_admin, is_admin)
  where id = target_user_id;
end;
$$;

comment on function public.is_premium_plan(text) is
  'Returns true for TradeWay Standard and Pro plans.';
