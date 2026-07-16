-- The canonical admin access RPC depends on this helper. Some production
-- databases were provisioned after the helper migration had been skipped.
create or replace function public.is_premium_plan(plan_value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(lower(plan_value), 'free') in ('standard', 'pro');
$$;

revoke all on function public.is_premium_plan(text) from public;
grant execute on function public.is_premium_plan(text) to authenticated, service_role;

comment on function public.is_premium_plan(text) is
  'Returns true for TradeWay Standard and Pro plans.';
