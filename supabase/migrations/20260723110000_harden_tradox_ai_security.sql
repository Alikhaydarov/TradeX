create table if not exists public.ai_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (char_length(action) between 1 and 80),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, action)
);

alter table public.ai_rate_limits enable row level security;
revoke all on table public.ai_rate_limits from anon, authenticated;

create or replace function public.consume_ai_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_action text := trim(coalesce(p_action, ''));
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 100));
  v_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  v_count integer;
  v_window_started timestamptz;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if char_length(v_action) < 1 or char_length(v_action) > 80 then
    raise exception 'Invalid rate-limit action' using errcode = '22023';
  end if;

  insert into public.ai_rate_limits (
    user_id,
    action,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    v_user,
    v_action,
    v_now,
    1,
    v_now
  )
  on conflict (user_id, action)
  do update set
    request_count = case
      when v_now - ai_rate_limits.window_started_at >= make_interval(secs => v_window)
        then 1
      else ai_rate_limits.request_count + 1
    end,
    window_started_at = case
      when v_now - ai_rate_limits.window_started_at >= make_interval(secs => v_window)
        then v_now
      else ai_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning request_count, window_started_at
  into v_count, v_window_started;

  allowed := v_count <= v_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(
        extract(
          epoch from (
            v_window_started + make_interval(secs => v_window) - v_now
          )
        )
      )::integer
    )
  end;

  return next;
end;
$$;

revoke all on function public.consume_ai_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_ai_rate_limit(text, integer, integer) to authenticated;

alter table public.ai_chat_messages enable row level security;

drop policy if exists "Users can read own AI chat" on public.ai_chat_messages;
drop policy if exists "Users can insert own AI chat" on public.ai_chat_messages;
drop policy if exists "Users can delete own AI chat" on public.ai_chat_messages;
drop policy if exists "Users can read their own AI chats" on public.ai_chat_messages;
drop policy if exists "Users can create their own AI chats" on public.ai_chat_messages;
drop policy if exists "Users can delete their own AI chats" on public.ai_chat_messages;

create policy "Users can read own AI chat"
  on public.ai_chat_messages
  for select
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.prop_accounts account
      where account.id = ai_chat_messages.prop_account_id
        and account.user_id = (select auth.uid())
    )
  );

create policy "Users can insert own AI chat"
  on public.ai_chat_messages
  for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.prop_accounts account
      where account.id = ai_chat_messages.prop_account_id
        and account.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own AI chat"
  on public.ai_chat_messages
  for delete
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.prop_accounts account
      where account.id = ai_chat_messages.prop_account_id
        and account.user_id = (select auth.uid())
    )
  );
