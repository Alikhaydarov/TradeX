-- Fix: admin paneldan tarif (plan) yangilash ishlamasligi.
--
-- 1-muammo: `create or replace function` boshqa signaturali funksiyani
-- almashtirmaydi. 20260715_admin_premium_architecture.sql 4 parametrli
-- admin_set_user_access(uuid, text, boolean, timestamptz) yaratgan, keyingi
-- migratsiyalar esa 5 parametrli versiyani yaratgan. Natijada bazada IKKITA
-- overload qolgan va PostgREST rpc chaqiruvida "Could not choose the best
-- candidate function" (PGRST203) xatosi kelib chiqishi mumkin.
-- Eski 4 parametrli versiyani o'chiramiz:

drop function if exists public.admin_set_user_access(uuid, text, boolean, timestamptz);

-- 2. Kanonik 5 parametrli versiyani qayta tasdiqlaymiz va muddati o'tgan
-- premium_until yuborilsa uni null (cheksiz) qilamiz — shunda admin userni
-- Pro/Standard qilganda user darhol premium bo'ladi.

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
  effective_premium_until timestamptz;
begin
  if not coalesce((select profiles.is_admin from public.profiles where profiles.id = auth.uid()), false) then
    raise exception 'Ruxsat berilmagan';
  end if;

  if normalized_plan not in ('free', 'standard', 'pro') then
    raise exception 'Noto''g''ri tarif rejasi';
  end if;

  premium_enabled := public.is_premium_plan(normalized_plan);

  -- Muddati allaqachon o'tgan sana yuborilsa, uni e'tiborsiz qoldiramiz.
  effective_premium_until := case
    when premium_enabled and next_premium_until is not null and next_premium_until > now()
      then next_premium_until
    else null
  end;

  update public.profiles
  set
    plan = normalized_plan,
    premium_until = effective_premium_until,
    is_verified = case when premium_enabled then coalesce(next_verified, true) else false end,
    ai_enabled = premium_enabled,
    traderox_enabled = premium_enabled,
    auto_sync_enabled = premium_enabled,
    is_admin = coalesce(next_is_admin, is_admin)
  where id = target_user_id;

  if not found then
    raise exception 'Foydalanuvchi topilmadi';
  end if;
end;
$$;

revoke all on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) from public;
grant execute on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) to authenticated, service_role;

comment on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) is
  'Canonical Superadmin plan and feature update. Valid plans: free, standard, pro. Expired premium_until values are ignored.';
