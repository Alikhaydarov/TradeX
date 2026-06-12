alter table public.journal_entries
  add column if not exists account_name text not null default 'Main account',
  add column if not exists market_type text not null default 'CFD',
  add column if not exists setup text not null default '',
  add column if not exists emotion text not null default 'Neutral',
  add column if not exists risk_amount numeric not null default 0,
  add column if not exists result_r numeric not null default 0,
  add column if not exists account_size numeric not null default 0,
  add column if not exists profit_target numeric not null default 0,
  add column if not exists max_drawdown numeric not null default 0,
  add column if not exists image_url text,
  add column if not exists tags text[] not null default '{}';

create index if not exists journal_entries_user_account_idx
  on public.journal_entries(user_id, account_name, traded_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-images',
  'journal-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Journal images are public" on storage.objects;
create policy "Journal images are public"
  on storage.objects for select
  using (bucket_id = 'journal-images');

drop policy if exists "Users upload own journal images" on storage.objects;
create policy "Users upload own journal images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'journal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own journal images" on storage.objects;
create policy "Users delete own journal images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'journal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
