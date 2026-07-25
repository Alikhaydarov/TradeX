-- Profile banner (cover photo) support: column + dedicated public storage bucket.
alter table public.profiles
  add column if not exists banner_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners',
  'banners',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Banners are public" on storage.objects;
drop policy if exists "Users upload own banners" on storage.objects;
drop policy if exists "Users delete own banners" on storage.objects;

create policy "Banners are public" on storage.objects for select
  using (bucket_id = 'banners');
create policy "Users upload own banners" on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own banners" on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);
