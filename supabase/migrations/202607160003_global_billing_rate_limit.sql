create table if not exists public.billing_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.billing_rate_limits enable row level security;

revoke all on table public.billing_rate_limits from public, anon, authenticated;

create or replace function public.consume_billing_rate_limit(
  target_key text,
  request_limit integer default 8,
  window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if length(target_key) < 8 or length(target_key) > 200 then
    raise exception 'Invalid rate-limit key';
  end if;
  if request_limit < 1 or request_limit > 100 or window_seconds < 1 or window_seconds > 3600 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  insert into public.billing_rate_limits as limits (
    rate_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (target_key, now(), 1, now())
  on conflict (rate_key) do update
  set
    window_started_at = case
      when limits.window_started_at <= now() - make_interval(secs => window_seconds) then now()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= now() - make_interval(secs => window_seconds) then 1
      else limits.request_count + 1
    end,
    updated_at = now()
  returning request_count <= request_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_billing_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_billing_rate_limit(text, integer, integer) to service_role;

comment on table public.billing_rate_limits is
  'Server-only fixed-window counters shared by every application instance.';

comment on function public.consume_billing_rate_limit(text, integer, integer) is
  'Atomically consumes one server-side billing request allowance.';
