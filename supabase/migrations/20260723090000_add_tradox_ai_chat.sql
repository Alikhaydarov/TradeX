create extension if not exists pgcrypto;

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prop_account_id uuid not null references public.prop_accounts(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 6000),
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_user_account_created_idx
  on public.ai_chat_messages(user_id, prop_account_id, created_at desc);

alter table public.ai_chat_messages enable row level security;

drop policy if exists "Users can read their own AI chats" on public.ai_chat_messages;
create policy "Users can read their own AI chats"
  on public.ai_chat_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own AI chats" on public.ai_chat_messages;
create policy "Users can create their own AI chats"
  on public.ai_chat_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own AI chats" on public.ai_chat_messages;
create policy "Users can delete their own AI chats"
  on public.ai_chat_messages
  for delete
  using (auth.uid() = user_id);
