alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists premium_until timestamptz,
  add column if not exists ai_enabled boolean not null default false,
  add column if not exists traderox_enabled boolean not null default false,
  add column if not exists auto_sync_enabled boolean not null default false;

update public.profiles
set
  plan = 'premium',
  premium_until = null,
  ai_enabled = true,
  traderox_enabled = true,
  auto_sync_enabled = true,
  updated_at = now()
where is_verified = true;

create or replace function public.admin_set_user_verification(target_user_id uuid, next_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  update public.profiles
  set
    is_verified = next_value,
    plan = case when next_value then 'premium' else 'free' end,
    premium_until = null,
    ai_enabled = next_value,
    traderox_enabled = next_value,
    auto_sync_enabled = next_value,
    updated_at = now()
  where id = target_user_id;
end;
$$;
