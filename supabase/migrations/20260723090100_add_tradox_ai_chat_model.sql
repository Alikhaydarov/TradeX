alter table public.ai_chat_messages
  add column if not exists model text;
