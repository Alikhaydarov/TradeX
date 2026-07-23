create extension if not exists pgcrypto;

alter table public.notifications
  add column if not exists entity_id uuid,
  add column if not exists entity_type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists dedupe_key text;

create unique index if not exists notifications_user_dedupe_key_idx
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prop_account_id uuid not null references public.prop_accounts(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 6000),
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_account_created_idx
  on public.ai_chat_messages(user_id, prop_account_id, created_at desc);

alter table public.ai_chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_chat_messages'
      and policyname = 'Users can read own AI chat'
  ) then
    create policy "Users can read own AI chat"
      on public.ai_chat_messages
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_chat_messages'
      and policyname = 'Users can insert own AI chat'
  ) then
    create policy "Users can insert own AI chat"
      on public.ai_chat_messages
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_chat_messages'
      and policyname = 'Users can delete own AI chat'
  ) then
    create policy "Users can delete own AI chat"
      on public.ai_chat_messages
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;
