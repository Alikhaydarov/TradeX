-- Canonical access update used by the TradeWay superadmin console.
-- The API reads the updated profile after this call, so this remains compatible
-- with the existing RPC signature on already provisioned projects.

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
  if not coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) then
    raise exception 'Ruxsat berilmagan';
  end if;

  if normalized_plan not in ('free', 'standard', 'pro') then
    raise exception 'Noto''g''ri tarif rejasi';
  end if;

  premium_enabled := public.is_premium_plan(normalized_plan);

  update public.profiles p
  set
    plan = normalized_plan,
    premium_until = case when premium_enabled then next_premium_until else null end,
    is_verified = case when premium_enabled then coalesce(next_verified, true) else false end,
    ai_enabled = premium_enabled,
    traderox_enabled = premium_enabled,
    auto_sync_enabled = premium_enabled,
    is_admin = coalesce(next_is_admin, p.is_admin),
    updated_at = timezone('utc', now())
  where p.id = target_user_id;

  if not found then
    raise exception 'Foydalanuvchi topilmadi';
  end if;
end;
$$;

revoke all on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) from public;
grant execute on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) to authenticated, service_role;

comment on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) is
  'Canonical TradeWay admin access write. The API reads the saved profile access state after update.';
